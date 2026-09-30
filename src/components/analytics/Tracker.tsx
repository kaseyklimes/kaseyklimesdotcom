"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { AnalyticsEvent, EventType } from "@/lib/analytics/model";
import { publicPath } from "@/lib/analytics/model";
import {
  normalizePresentation,
  qualifiesExposure,
  type Presentation,
} from "@/lib/analytics/presentation";
const NAVIGATION_KEY = "site-analytics-navigation";
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
      while (queue.length) {
        const batch: unknown[] = [];
        while (queue.length && batch.length < 20) {
          if (
            new TextEncoder().encode(JSON.stringify([...batch, queue[0]]))
              .length > 14000
          )
            break;
          batch.push(queue.shift());
        }
        if (!batch.length) {
          queue.shift();
          continue;
        }
        const body = JSON.stringify(batch);
        if (
          !navigator.sendBeacon(
            "/api/analytics/collect",
            new Blob([body], { type: "text/plain" }),
          )
        )
          void fetch("/api/analytics/collect", {
            method: "POST",
            body,
            keepalive: true,
          }).catch(() => {});
      }
    };
    const send = (
      type: EventType,
      target = "",
      extra: Partial<
        Pick<
          AnalyticsEvent,
          "exposure" | "navigation" | "presentation" | "referral"
        >
      > = {},
    ) => {
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
        ...extra,
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
      if (event.button > 1) return;
      const card = el?.closest('[data-analytics-card="true"]');
      const anchor = el?.closest("a[href]");
      if (card && anchor) {
        sampleCards();
        const target = targetFor(card),
          exposure = visible.get(card)?.exposure,
          navigation = crypto.randomUUID();
        send("card_click", target, {
          navigation,
          ...(exposure ? { exposure } : {}),
        });
        try {
          const url = new URL(anchor.getAttribute("href")!, location.href);
          if (
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            !anchor.hasAttribute("download") &&
            (!anchor.getAttribute("target") ||
              anchor.getAttribute("target") === "_self") &&
            url.origin === location.origin &&
            publicPath(url.pathname) === target &&
            target !== pathname
          ) {
            sessionStorage.setItem(
              NAVIGATION_KEY,
              JSON.stringify({
                view,
                navigation,
                target,
                session: session.id,
                at: Date.now(),
              }),
            );
          }
        } catch {
          /* Attribution never blocks navigation. */
        }
      }
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
    // Snapshot each distinct presentation once per source page view. Sampling
    // uses viewport-capped visible area so oversized cards remain measurable.
    const seen = new Map<string, string>();
    const visible = new Map<
      Element,
      { key: string; since: number; exposure?: string }
    >();
    const visibilityObservers = new Map<
      Element,
      { key: string; observer: IntersectionObserver; qualified: boolean }
    >();
    const targetFor = (el: Element) =>
      `/${el.getAttribute("data-grid-category")}/${el.getAttribute("data-grid-slug")}`;
    const sampleCards = () => {
      if (document.visibilityState !== "visible") {
        visible.clear();
        return;
      }
      const cards = Array.from(
        document.querySelectorAll('[data-analytics-card="true"]'),
      )
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter((c) => c.rect.width > 0 && c.rect.height > 0)
        .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
      const present = new Set(cards.map((c) => c.el));
      for (const el of visible.keys()) if (!present.has(el)) visible.delete(el);
      for (const [el, entry] of visibilityObservers)
        if (!present.has(el)) {
          entry.observer.disconnect();
          visibilityObservers.delete(el);
        }
      cards.forEach(({ el, rect }, index) => {
        const geometry = [
          rect.width,
          rect.height,
          innerWidth,
          innerHeight,
        ].join(":");
        const watched = visibilityObservers.get(el);
        if (watched?.key !== geometry) {
          watched?.observer.disconnect();
          visible.delete(el);
          const threshold =
            (0.5 *
              Math.min(rect.width, innerWidth) *
              Math.min(rect.height, innerHeight)) /
            (rect.width * rect.height);
          const observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const current = visibilityObservers.get(entry.target);
                if (!current || current.observer !== observer) continue;
                current.qualified = entry.isIntersecting && entry.intersectionRatio + 1e-7 >= threshold;
                if (!current.qualified) visible.delete(entry.target);
              }
            },
            { threshold: [threshold] },
          );
          observer.observe(el);
          visibilityObservers.set(el, { key: geometry, observer, qualified: false });
        }
        if (!visibilityObservers.get(el)?.qualified || !qualifiesExposure(rect, innerWidth, innerHeight)) {
          visible.delete(el);
          return;
        }
        const p = normalizePresentation({
          schema: 2,
          build: process.env.NEXT_PUBLIC_ANALYTICS_BUILD,
          content: el.getAttribute("data-analytics-content"),
          thumbnail: el.getAttribute("data-analytics-thumbnail"),
          stars: Number(el.getAttribute("data-analytics-stars")),
          position: index + 1,
          columns: Number(el.getAttribute("data-analytics-columns")),
          span: Number(el.getAttribute("data-analytics-span")),
          width: Math.max(16, Math.round(rect.width / 16) * 16),
          height: Math.max(16, Math.round(rect.height / 16) * 16),
          viewportWidth: Math.max(100, Math.round(innerWidth / 100) * 100),
          viewportHeight: Math.max(100, Math.round(innerHeight / 100) * 100),
          initialViewport:
            rect.top + scrollY < innerHeight && rect.bottom + scrollY > 0,
          filter: pathname,
        });
        if (!p) {
          visible.delete(el);
          return;
        }
        const key = JSON.stringify([targetFor(el), p]),
          prior = visible.get(el);
        const state =
          prior?.key === key
            ? prior
            : { key, since: performance.now(), exposure: seen.get(key) };
        if (!state.exposure && performance.now() - state.since >= 1000) {
          state.exposure = crypto.randomUUID();
          seen.set(key, state.exposure);
          send("impression", targetFor(el), {
            exposure: state.exposure,
            presentation: p as Presentation,
          });
        }
        visible.set(el, state);
      });
    };
    let referral: AnalyticsEvent["referral"];
    try {
      const pending = JSON.parse(
        sessionStorage.getItem(NAVIGATION_KEY) || "null",
      );
      sessionStorage.removeItem(NAVIGATION_KEY);
      if (
        pending &&
        pending.session === session.id &&
        pending.target === pathname &&
        Date.now() - pending.at >= 0 &&
        Date.now() - pending.at <= 120000
      )
        referral = { view: pending.view, navigation: pending.navigation };
    } catch {
      /* No attributable navigation. */
    }
    send("view", "", referral ? { referral } : {});
    flush();
    measure();
    sampleCards();
    const exposureTick = setInterval(sampleCards, 1000);
    const resetExposure = () => visible.clear();
    document.addEventListener("visibilitychange", resetExposure);
    window.addEventListener("resize", resetExposure);
    const tick = setInterval(measure, 1000),
      heartbeat = setInterval(checkpoint, 15000);
    document.addEventListener("click", click, true);
    document.addEventListener("auxclick", click, true);
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
      clearInterval(exposureTick);
      visibilityObservers.forEach(({ observer }) => observer.disconnect());
      document.removeEventListener("visibilitychange", resetExposure);
      window.removeEventListener("resize", resetExposure);
      document.removeEventListener("click", click, true);
      document.removeEventListener("auxclick", click, true);
      document.removeEventListener("play", play, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", checkpoint);
      for (const type of ["scroll", "pointerdown", "keydown"])
        window.removeEventListener(type, activity);
    };
  }, [pathname]);
  return null;
}
