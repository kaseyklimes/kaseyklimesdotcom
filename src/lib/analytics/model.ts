import {
  normalizePresentation,
  summarizePresentation,
  type Presentation,
} from "./presentation";
export const EVENT_TYPES = [
  "view",
  "engagement",
  "click",
  "impression",
  "card_click",
  "interaction",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type AnalyticsEvent = {
  id: string;
  session: string;
  view: string;
  type: EventType;
  path: string;
  target: string;
  source: string;
  medium: string;
  campaign: string;
  device: string;
  country: string;
  at: number;
  seconds: number;
  depth: number;
  exposure?: string;
  navigation?: string;
  presentation?: Presentation;
  referral?: { view: string; navigation: string };
};
const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function publicPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 200) return null;
  if (!/^\/(?:[a-zA-Z0-9_-]+\/?){0,2}$/.test(value)) return null;
  if (/^\/(?:api|insights|_next|privacy)(?:\/|$)/.test(value)) return null;
  return value.replace(/\/$/, "") || "/";
}
export function label(value: unknown, fallback = ""): string {
  return typeof value === "string" && /^[a-zA-Z0-9 ._~+:/-]{1,100}$/.test(value)
    ? value
    : fallback;
}
export function normalizeEvent(
  input: unknown,
  context: { country: string; device: string },
  now = Date.now(),
): AnalyticsEvent | null {
  if (!input || typeof input !== "object") return null;
  const e = input as Record<string, unknown>;
  const path = publicPath(e.path);
  if (
    !path ||
    !ID.test(String(e.id)) ||
    !ID.test(String(e.session)) ||
    !ID.test(String(e.view)) ||
    !EVENT_TYPES.includes(e.type as EventType)
  )
    return null;
  let target = "";
  if (e.type === "impression" || e.type === "card_click") {
    target = publicPath(e.target) || "";
    if (!target) return null;
  }
  if (e.type === "click") {
    target = publicPath(e.target) || "";
    if (!target && typeof e.target === "string") {
      try {
        const u = new URL(e.target);
        if (u.protocol === "https:" || u.protocol === "http:")
          target = u.hostname;
      } catch {
        /* discard malformed targets */
      }
      if (e.target === "mailto:" || e.target === "tel:") target = e.target;
    }
    if (!target) return null;
  }
  if (e.type === "interaction") {
    if (
      ![
        "gallery-next",
        "gallery-previous",
        "video-play",
        "audio-play",
      ].includes(String(e.target))
    )
      return null;
    target = String(e.target);
  }
  let presentation: Presentation | undefined;
  if (e.presentation !== undefined) {
    const validated = normalizePresentation(e.presentation);
    if (e.type !== "impression" || !validated || !ID.test(String(e.exposure)))
      return null;
    presentation = validated;
  }
  if (
    e.exposure !== undefined &&
    (!ID.test(String(e.exposure)) ||
      !["impression", "card_click"].includes(String(e.type)))
  )
    return null;
  if (
    e.navigation !== undefined &&
    (e.type !== "card_click" || !ID.test(String(e.navigation)))
  )
    return null;
  let referral: AnalyticsEvent["referral"];
  if (e.referral !== undefined) {
    const r = e.referral as Record<string, unknown>;
    if (
      e.type !== "view" ||
      !r ||
      !ID.test(String(r.view)) ||
      !ID.test(String(r.navigation)) ||
      r.view === e.view
    )
      return null;
    referral = { view: String(r.view), navigation: String(r.navigation) };
  }
  return {
    ...(presentation ? { presentation } : {}),
    ...(e.exposure ? { exposure: String(e.exposure) } : {}),
    ...(e.navigation ? { navigation: String(e.navigation) } : {}),
    ...(referral ? { referral } : {}),
    id: String(e.id),
    session: String(e.session),
    view: String(e.view),
    type: e.type as EventType,
    path,
    target,
    source: label(e.source, "Direct / unknown"),
    medium: label(e.medium),
    campaign: label(e.campaign),
    ...context,
    at:
      typeof e.at === "number" &&
      Number.isFinite(e.at) &&
      Math.abs(e.at - now) < 300000
        ? Math.round(e.at)
        : now,
    seconds:
      e.type === "engagement" &&
      typeof e.seconds === "number" &&
      Number.isFinite(e.seconds)
        ? Math.min(1800, Math.max(0, Math.round(e.seconds)))
        : 0,
    depth:
      e.type === "engagement" &&
      typeof e.depth === "number" &&
      Number.isFinite(e.depth)
        ? Math.min(100, Math.max(0, Math.round(e.depth)))
        : 0,
  };
}
export type ContentInfo = {
  title: string;
  tags: string[];
  format: string;
  emphasis: string;
};
export type Filters = {
  source?: string;
  device?: string;
  country?: string;
  category?: string;
};
export function category(path: string) {
  return path === "/"
    ? "Home"
    : {
        blog: "Notes",
        notes: "Notes",
        photography: "Images",
        images: "Images",
        work: "Work",
        shelf: "Shelf",
        talks: "Talks",
        play: "Play",
      }[path.split("/")[1]] || "Other";
}
export type JourneyRoute = {
  source: string;
  first: string;
  next: string | null;
  last: string;
  sessions: number;
  engagedSessions: number;
  seconds: number;
  firstEngaged: number;
  nextEngaged: number;
  lastEngaged: number;
  firstSeconds: number;
  nextSeconds: number;
  lastSeconds: number;
  continued: number;
  additionalViews: number;
};
export function summarize(
  events: AnalyticsEvent[],
  days: number,
  filters: Filters = {},
  now = Date.now(),
  catalog: Record<string, ContentInfo> = {},
) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const start = end.getTime() - (days - 1) * 86400000;
  const views = events.filter(
    (e) => e.type === "view" && e.at >= start && e.at <= now,
  );
  // Acquisition is the first observed page of a session, not the most recent page.
  const first = new Map<string, AnalyticsEvent>();
  for (const e of [...events]
    .filter((e) => e.type === "view")
    .sort((a, b) => a.at - b.at))
    if (!first.has(e.session)) first.set(e.session, e);
  const eligible = views.filter((e) => {
    const entry = first.get(e.session)!;
    return (
      (!filters.source || entry.source === filters.source) &&
      (!filters.device || entry.device === filters.device) &&
      (!filters.country || entry.country === filters.country) &&
      (!filters.category || category(e.path) === filters.category)
    );
  });
  const ids = new Set(eligible.map((e) => e.view));
  const matched = events.filter(
    (e) => ids.has(e.view) && e.at >= start && e.at <= now,
  );
  const sessions = new Set(eligible.map((e) => e.session));
  const engagement = new Map<string, { seconds: number; depth: number }>();
  for (const e of matched.filter((e) => e.type === "engagement")) {
    const p = engagement.get(e.view);
    engagement.set(e.view, {
      seconds: Math.max(p?.seconds || 0, e.seconds),
      depth: Math.max(p?.depth || 0, e.depth),
    });
  }
  const engaged = (e: AnalyticsEvent) =>
    (engagement.get(e.view)?.seconds || 0) >= 10;
  const pageMap = new Map<
    string,
    {
      path: string;
      views: number;
      sessions: Set<string>;
      seconds: number;
      engaged: number;
      depth: number;
    }
  >();
  for (const e of eligible) {
    const p = pageMap.get(e.path) || {
      path: e.path,
      views: 0,
      sessions: new Set<string>(),
      seconds: 0,
      engaged: 0,
      depth: 0,
    };
    p.views++;
    p.sessions.add(e.session);
    p.seconds += engagement.get(e.view)?.seconds || 0;
    p.engaged += +engaged(e);
    p.depth += engagement.get(e.view)?.depth || 0;
    pageMap.set(e.path, p);
  }
  const pages = [...pageMap.values()]
    .map((p) => ({
      ...p,
      sessions: p.sessions.size,
      seconds: Math.round(p.seconds / p.views),
      depth: Math.round(p.depth / p.views),
      engaged: Math.round((100 * p.engaged) / p.views),
    }))
    .sort((a, b) => b.views - a.views);
  const rank = (items: string[]) => {
    const counts = new Map<string, number>();
    for (const key of items) counts.set(key, (counts.get(key) || 0) + 1);
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };
  const acquisition = [...sessions].map((s) => first.get(s)!);
  const dimension = (
    key: "source" | "device" | "country" | "campaign" | "medium",
  ) => rank(acquisition.map((e) => e[key] || "Unspecified"));
  const daily = new Map<string, { views: number; sessions: Set<string> }>();
  for (const e of eligible) {
    const date = new Date(e.at).toISOString().slice(0, 10);
    const d = daily.get(date) || { views: 0, sessions: new Set<string>() };
    d.views++;
    d.sessions.add(e.session);
    daily.set(date, d);
  }
  const timeline = Array.from({ length: days }, (_, i) => {
    const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
    const d = daily.get(date);
    return { date, views: d?.views || 0, sessions: d?.sessions.size || 0 };
  });
  const trafficSeries = (grain: "daily" | "weekly" | "monthly") => {
    const keyFor = (time: number) => {
      const d = new Date(time);
      d.setUTCHours(0, 0, 0, 0);
      if (grain === "weekly")
        d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      if (grain === "monthly") d.setUTCDate(1);
      return d.toISOString().slice(0, 10);
    };
    const buckets = new Map<
      string,
      {
        date: string;
        end: string;
        views: number;
        sessions: Set<string>;
        partial: boolean;
      }
    >();
    for (let day = start; day <= now; day += 86400000) {
      const key = keyFor(day);
      if (buckets.has(key)) continue;
      const nominalStart = Date.parse(key),
        endDate = new Date(nominalStart);
      if (grain === "monthly") endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      else
        endDate.setUTCDate(endDate.getUTCDate() + (grain === "weekly" ? 7 : 1));
      const nominalEnd = endDate.getTime() - 1;
      buckets.set(key, {
        date: new Date(Math.max(start, nominalStart))
          .toISOString()
          .slice(0, 10),
        end: new Date(Math.min(now, nominalEnd)).toISOString().slice(0, 10),
        views: 0,
        sessions: new Set<string>(),
        partial: nominalStart < start || nominalEnd > now,
      });
    }
    for (const e of eligible) {
      const bucket = buckets.get(keyFor(e.at));
      if (bucket) {
        bucket.views++;
        bucket.sessions.add(e.session);
      }
    }
    return [...buckets.values()].map((b) => ({
      ...b,
      sessions: b.sessions.size,
    }));
  };
  const journeys: string[] = [],
    exits: string[] = [];
  const sessionViews = new Map<string, AnalyticsEvent[]>();
  for (const e of views.filter((e) => sessions.has(e.session))) {
    const list = sessionViews.get(e.session) || [];
    list.push(e);
    sessionViews.set(e.session, list);
  }
  for (const list of sessionViews.values()) {
    list.sort((a, b) => a.at - b.at);
    for (let i = 1; i < list.length; i++)
      if (
        ids.has(list[i - 1].view) &&
        ids.has(list[i].view) &&
        list[i - 1].path !== list[i].path
      )
        journeys.push(`${list[i - 1].path} → ${list[i].path}`);
    if (list.length) exits.push(list[list.length - 1].path);
  }
  // Keep full in-range paths for sessions matching the filters. A content
  // filter selects sessions; it must never splice out their intervening pages.
  const journeyAttention = new Map<string, number>();
  for (const e of events) {
    if (e.type === "engagement" && e.at >= start && e.at <= now)
      journeyAttention.set(
        e.view,
        Math.max(journeyAttention.get(e.view) || 0, e.seconds),
      );
  }
  const routeMap = new Map<string, JourneyRoute>();
  let continuedSessions = 0,
    ambiguousSessions = 0;
  for (const list of sessionViews.values()) {
    if (list.some((e, i) => i > 0 && e.at === list[i - 1].at)) {
      ambiguousSessions++;
      continue;
    }
    const entry = list[0],
      next = list[1],
      last = list[list.length - 1];
    const source = first.get(entry.session)!.source || "Direct / unknown";
    const key = JSON.stringify([
      source,
      entry.path,
      next?.path || null,
      last.path,
    ]);
    const row = routeMap.get(key) || {
      source,
      first: entry.path,
      next: next?.path || null,
      last: last.path,
      sessions: 0,
      engagedSessions: 0,
      seconds: 0,
      firstEngaged: 0,
      nextEngaged: 0,
      lastEngaged: 0,
      firstSeconds: 0,
      nextSeconds: 0,
      lastSeconds: 0,
      continued: 0,
      additionalViews: 0,
    };
    const attention = (e: AnalyticsEvent | undefined) =>
      e ? journeyAttention.get(e.view) || 0 : 0;
    const seconds = list.map(attention);
    row.sessions++;
    row.engagedSessions += +seconds.some((s) => s >= 10);
    row.seconds += seconds.reduce((sum, n) => sum + n, 0);
    row.firstEngaged += +(attention(entry) >= 10);
    row.nextEngaged += +(attention(next) >= 10);
    row.lastEngaged += +(attention(last) >= 10);
    row.firstSeconds += attention(entry);
    row.nextSeconds += attention(next);
    row.lastSeconds += attention(last);
    row.continued += +(list.length > 2);
    row.additionalViews += Math.max(0, list.length - 3);
    routeMap.set(key, row);
    continuedSessions += +(first.get(entry.session)!.at < start);
  }
  const routes = [...routeMap.values()].sort(
    (a, b) =>
      b.sessions - a.sessions ||
      JSON.stringify([a.source, a.first, a.next, a.last]).localeCompare(
        JSON.stringify([b.source, b.first, b.next, b.last]),
      ),
  );
  const cards = new Map<
    string,
    { target: string; seen: Set<string>; clicked: Set<string> }
  >();
  for (const e of matched.filter(
    (e) => e.type === "impression" || e.type === "card_click",
  )) {
    const c = cards.get(e.target) || {
      target: e.target,
      seen: new Set<string>(),
      clicked: new Set<string>(),
    };
    (e.type === "impression" ? c.seen : c.clicked).add(e.view);
    cards.set(e.target, c);
  }
  const interests = [...cards.values()]
    .map((c) => ({
      target: c.target,
      seen: c.seen.size,
      clicked: [...c.clicked].filter((v) => c.seen.has(v)).length,
    }))
    .sort((a, b) => b.clicked - a.clicked || b.seen - a.seen);
  const dimensions = (key: "tags" | "format" | "emphasis") => {
    const rows = new Map<
      string,
      {
        name: string;
        views: number;
        engaged: number;
        seconds: number;
        seen: number;
        clicked: number;
      }
    >();
    const names = (path: string) => {
      const info = catalog[path];
      if (!info) return [];
      return key === "tags" ? info.tags : [info[key]];
    };
    const row = (name: string) => {
      const r = rows.get(name) || {
        name,
        views: 0,
        engaged: 0,
        seconds: 0,
        seen: 0,
        clicked: 0,
      };
      rows.set(name, r);
      return r;
    };
    for (const p of pageMap.values())
      for (const name of names(p.path)) {
        const r = row(name);
        r.views += p.views;
        r.engaged += p.engaged;
        r.seconds += p.seconds;
      }
    for (const c of interests)
      for (const name of names(c.target)) {
        const r = row(name);
        r.seen += c.seen;
        r.clicked += c.clicked;
      }
    return [...rows.values()]
      .map((r) => ({
        ...r,
        engaged: r.views ? Math.round((100 * r.engaged) / r.views) : 0,
        seconds: r.views ? Math.round(r.seconds / r.views) : 0,
      }))
      .sort((a, b) => b.views - a.views || b.seen - a.seen);
  };
  const cohortFor = (dimensionKey: "source" | "device" | "country") =>
    dimension(dimensionKey)
      .slice(0, 8)
      .map(({ name, count }) => ({
        name,
        count,
        categories: ["Notes", "Work", "Images", "Shelf", "Talks", "Play"].map(
          (cat) => {
            const list = eligible.filter(
              (e) =>
                first.get(e.session)?.[dimensionKey] === name &&
                category(e.path) === cat,
            );
            return {
              category: cat,
              views: list.length,
              engaged: list.filter(engaged).length,
            };
          },
        ),
      }));
  return {
    views: eligible.length,
    sessions: sessions.size,
    engaged: eligible.filter(engaged).length,
    avgSeconds: Math.round(
      eligible.reduce((n, e) => n + (engagement.get(e.view)?.seconds || 0), 0) /
        (eligible.length || 1),
    ),
    timeline,
    traffic: {
      daily: trafficSeries("daily"),
      weekly: trafficSeries("weekly"),
      monthly: trafficSeries("monthly"),
    },
    pages,
    dimensions: {
      topics: dimensions("tags"),
      formats: dimensions("format"),
      emphasis: dimensions("emphasis"),
    },
    titles: Object.fromEntries(
      Object.entries(catalog).map(([path, info]) => [path, info.title]),
    ),
    sources: dimension("source"),
    devices: dimension("device"),
    countries: dimension("country"),
    campaigns: dimension("campaign"),
    mediums: dimension("medium"),
    entries: rank(acquisition.map((e) => e.path)),
    exits: rank(exits),
    journeys: rank(journeys),
    journeyFlow: {
      routes: routes.slice(0, 300),
      totalSessions: sessions.size,
      omittedSessions: routes.slice(300).reduce((n, r) => n + r.sessions, 0),
      continuedSessions,
      ambiguousSessions,
      contentFilter: filters.category || null,
    },
    interests,
    presentationFunnel: summarizePresentation(
      events,
      start,
      now,
      filters,
      category,
    ),
    cohorts: cohortFor("source"),
    audienceCohorts: {
      source: cohortFor("source"),
      device: cohortFor("device"),
      country: cohortFor("country"),
    },
    outbound: rank(
      matched
        .filter((e) => e.type === "click" && !e.target.startsWith("/"))
        .map((e) => e.target),
    ),
    interactions: rank(
      matched
        .filter((e) => e.type === "interaction")
        .map((e) => `${e.path} · ${e.target}`),
    ),
    options: {
      sources: [
        ...new Set(views.map((e) => first.get(e.session)!.source)),
      ].sort(),
      devices: [...new Set(views.map((e) => e.device))].sort(),
      countries: [...new Set(views.map((e) => e.country))].sort(),
    },
  };
}
