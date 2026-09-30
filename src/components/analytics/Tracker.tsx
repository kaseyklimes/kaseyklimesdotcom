"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { EventType } from "@/lib/analytics/model";
import { publicPath } from "@/lib/analytics/model";
const SESSION_KEY = "site-analytics-session";
export default function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (
      !publicPath(pathname) ||
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return;
    let session: {
      id: string;
      last: number;
      source: string;
      medium: string;
      campaign: string;
    };
    try {
      if (localStorage.getItem("analytics-opt-out") === "1") return;
      const prior = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (prior && Date.now() - prior.last < 1800000) session = prior;
      else {
        const params = new URLSearchParams(location.search);
        let source = "Direct / unknown";
        try {
          const ref = new URL(document.referrer);
          if (ref.origin !== location.origin) source = ref.hostname;
        } catch {
          /* no referrer */
        }
        session = {
          id: crypto.randomUUID(),
          last: Date.now(),
          source: params.get("utm_source") || source,
          medium: params.get("utm_medium") || "",
          campaign: params.get("utm_campaign") || "",
        };
      }
      session.last = Date.now();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      return;
    } // Site functionality never depends on storage or analytics.
    const view = crypto.randomUUID();
    const queue: unknown[] = [];
    let seconds = 0,
      depth = 0,
      lastTick = performance.now(),
      lastActivity = lastTick,
      disposed = false;
    const flush = () => {
      if (!queue.length) return;
      const batch = queue.splice(0, 30),
        body = JSON.stringify(batch);
      if (
        !navigator.sendBeacon(
          "/api/analytics/collect",
          new Blob([body], { type: "text/plain" }),
        )
      ) {
        void fetch("/api/analytics/collect", {
          method: "POST",
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };
    const send = (type: EventType, target = "") => {
      if (disposed) return;
      try {
        if (localStorage.getItem("analytics-opt-out") === "1") {
          queue.length = 0;
          return;
        }
      } catch {
        return;
      }
      queue.push({
        id: crypto.randomUUID(),
        session: session.id,
        view,
        type,
        at: Date.now(),
        path: pathname,
        target,
        source: session.source,
        medium: session.medium,
        campaign: session.campaign,
        seconds: Math.round(seconds),
        depth,
      });
      if (queue.length >= 20) flush();
    };
    const measure = () => {
      const now = performance.now();
      if (document.visibilityState === "visible" && now - lastActivity < 60000)
        seconds = Math.min(
          1800,
          seconds + Math.min(5, (now - lastTick) / 1000),
        );
      lastTick = now;
      if (document.visibilityState === "visible")
        depth = Math.max(
          depth,
          Math.min(
            100,
            Math.round(
              (100 * (scrollY + innerHeight)) /
                Math.max(innerHeight, document.documentElement.scrollHeight),
            ),
          ),
        );
    };
    const activity = () => {
      lastActivity = performance.now();
    };
    const checkpoint = () => {
      measure();
      send("engagement");
      flush();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") checkpoint();
      else lastTick = performance.now();
    };
    const click = (event: MouseEvent) => {
      activity();
      const el = event.target instanceof Element ? event.target : null;
      const card = el?.closest("[data-grid-category][data-grid-slug]");
      if (card && el?.closest("a[href]"))
        send(
          "card_click",
          `/${card.getAttribute("data-grid-category")}/${card.getAttribute("data-grid-slug")}`,
        );
      const link = el?.closest("a[href]");
      if (link) {
        try {
          const url = new URL(link.getAttribute("href")!, location.href);
          if (url.protocol === "mailto:" || url.protocol === "tel:")
            send("click", url.protocol);
          else if (url.origin !== location.origin) send("click", url.origin);
          else if (publicPath(url.pathname)) send("click", url.pathname);
        } catch {
          /* skip invalid links */
        }
        checkpoint();
      }
      const button = el?.closest("button");
      const label = button?.getAttribute("aria-label")?.toLowerCase() || "";
      if (/next (slide|image|photo)/.test(label))
        send("interaction", "gallery-next");
      if (/(previous|prev) (slide|image|photo)/.test(label))
        send("interaction", "gallery-previous");
    };
    const play = (e: Event) => {
      const media = e.target;
      if (media instanceof HTMLMediaElement && !media.autoplay)
        send(
          "interaction",
          media instanceof HTMLVideoElement ? "video-play" : "audio-play",
        );
    };
    // Count a card once per page view, after at least one second at 50% visibility.
    const seen = new Set<string>(),
      observed = new WeakSet<Element>(),
      pending = new Map<Element, ReturnType<typeof setTimeout>>();
    const targetFor = (el: Element) =>
      `/${el.getAttribute("data-grid-category")}/${el.getAttribute("data-grid-slug")}`;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = targetFor(entry.target);
          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.5 &&
            !seen.has(target) &&
            !pending.has(entry.target)
          ) {
            pending.set(
              entry.target,
              setTimeout(() => {
                pending.delete(entry.target);
                if (
                  document.visibilityState === "visible" &&
                  !seen.has(target)
                ) {
                  seen.add(target);
                  send("impression", target);
                }
              }, 1000),
            );
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
            clearTimeout(pending.get(entry.target));
            pending.delete(entry.target);
          }
        }
      },
      { threshold: [0, 0.5] },
    );
    const observe = () =>
      document
        .querySelectorAll("[data-grid-category][data-grid-slug]")
        .forEach((el) => {
          if (!observed.has(el)) {
            observed.add(el);
            observer.observe(el);
          }
        });
    const mutations = new MutationObserver(observe);
    mutations.observe(document.body, { childList: true, subtree: true });
    observe();
    send("view");
    flush();
    measure();
    const tick = setInterval(measure, 1000),
      heartbeat = setInterval(checkpoint, 15000);
    document.addEventListener("click", click, true);
    document.addEventListener("play", play, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", checkpoint);
    for (const type of ["scroll", "pointerdown", "keydown"])
      window.addEventListener(type, activity, { passive: true });
    return () => {
      checkpoint();
      disposed = true;
      clearInterval(tick);
      clearInterval(heartbeat);
      observer.disconnect();
      mutations.disconnect();
      pending.forEach(clearTimeout);
      document.removeEventListener("click", click, true);
      document.removeEventListener("play", play, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", checkpoint);
      for (const type of ["scroll", "pointerdown", "keydown"])
        window.removeEventListener(type, activity);
    };
  }, [pathname]);
  return null;
}
