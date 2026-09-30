import type { AnalyticsEvent, Filters } from "./model";
export type Presentation = {
  schema: 2;
  build: string;
  content: string;
  thumbnail: string;
  stars: number;
  position: number;
  columns: number;
  span: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  initialViewport: boolean;
  filter: string;
};
const revision = /^[a-f0-9]{16,64}$/;
export function normalizePresentation(input: unknown): Presentation | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  if (
    p.schema !== 2 ||
    ![p.build, p.content, p.thumbnail].every(
      (v) => typeof v === "string" && revision.test(v),
    ) ||
    typeof p.filter !== "string" ||
    !/^\/(?:[a-zA-Z0-9_-]+\/?){0,2}$/.test(p.filter) ||
    typeof p.initialViewport !== "boolean"
  )
    return null;
  const bounds = {
    stars: [1, 5],
    position: [1, 10000],
    columns: [1, 20],
    span: [1, 20],
    width: [16, 20000],
    height: [16, 100000],
    viewportWidth: [100, 20000],
    viewportHeight: [100, 20000],
  } as const;
  for (const [key, [min, max]] of Object.entries(bounds))
    if (
      !Number.isInteger(p[key]) ||
      (p[key] as number) < min ||
      (p[key] as number) > max
    )
      return null;
  if ((p.span as number) > (p.columns as number)) return null;
  return {
    schema: 2,
    build: p.build as string,
    content: p.content as string,
    thumbnail: p.thumbnail as string,
    stars: p.stars as number,
    position: p.position as number,
    columns: p.columns as number,
    span: p.span as number,
    width: p.width as number,
    height: p.height as number,
    viewportWidth: p.viewportWidth as number,
    viewportHeight: p.viewportHeight as number,
    initialViewport: p.initialViewport,
    filter: p.filter,
  };
}
// Half of the card's viewport-capped area, including oversized cards. Call only while visible.
export function qualifiesExposure(
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  },
  width: number,
  height: number,
) {
  const area =
    Math.max(0, Math.min(rect.right, width) - Math.max(0, rect.left)) *
    Math.max(0, Math.min(rect.bottom, height) - Math.max(0, rect.top));
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    area >= 0.5 * Math.min(rect.width, width) * Math.min(rect.height, height)
  );
}
export type FunnelRow = {
  target: string;
  origin: string;
  presentation: Presentation;
  seen: number;
  clicked: number;
  arrived: number;
  engaged: number;
  continued: number;
  seconds: number;
  firstAt: number;
  lastAt: number;
};
export function summarizePresentation(
  events: AnalyticsEvent[],
  start: number,
  end: number,
  filters: Filters,
  category: (p: string) => string,
) {
  const orderedViews = events
    .filter((e) => e.type === "view")
    .sort((a, b) => a.at - b.at);
  const views = new Map(orderedViews.map((e) => [e.view, e])),
    first = new Map<string, AnalyticsEvent>();
  const inSession = new Map<string, AnalyticsEvent[]>();
  for (const e of orderedViews) {
    if (!first.has(e.session)) first.set(e.session, e);
    const list = inSession.get(e.session) || [];
    list.push(e);
    inSession.set(e.session, list);
  }
  const attention = new Map<string, number>();
  for (const e of events)
    // Stored attention is cumulative for each destination view, including later heartbeats.
    if (e.type === "engagement")
      attention.set(e.view, Math.max(attention.get(e.view) || 0, e.seconds));
  const scope = (e: AnalyticsEvent) => {
    const origin = views.get(e.view),
      entry = origin && first.get(origin.session);
    return (
      origin &&
      entry &&
      e.at >= start &&
      e.at <= end &&
      e.at >= origin.at &&
      e.session === origin.session &&
      (!filters.source || entry.source === filters.source) &&
      (!filters.device || entry.device === filters.device) &&
      (!filters.country || entry.country === filters.country) &&
      (!filters.category || category(e.target) === filters.category)
    );
  };
  const exposures = new Map<string, AnalyticsEvent>(),
    rows = new Map<string, FunnelRow>();
  let legacyExposures = 0;
  for (const e of events)
    if (e.type === "impression" && scope(e)) {
      if (e.exposure && e.presentation)
        exposures.set(`${e.view}:${e.exposure}`, e);
      else legacyExposures++;
    }
  const clicks = new Map<string, AnalyticsEvent[]>();
  for (const e of events)
    if (e.type === "card_click" && e.exposure && e.navigation && e.at <= end) {
      const key = `${e.view}:${e.exposure}`,
        list = clicks.get(key) || [];
      list.push(e);
      clicks.set(key, list);
    }
  const arrivals = new Map<string, AnalyticsEvent[]>();
  for (const e of orderedViews)
    if (e.referral && e.at <= end) {
      const key = `${e.referral.view}:${e.referral.navigation}`,
        list = arrivals.get(key) || [];
      list.push(e);
      arrivals.set(key, list);
    }
  for (const [id, e] of exposures) {
    const key = JSON.stringify([e.target, e.path, e.presentation]);
    const row = rows.get(key) || {
      target: e.target,
      origin: e.path,
      presentation: e.presentation!,
      seen: 0,
      clicked: 0,
      arrived: 0,
      engaged: 0,
      continued: 0,
      seconds: 0,
      firstAt: e.at,
      lastAt: e.at,
    };
    row.seen++;
    row.firstAt = Math.min(row.firstAt, e.at);
    row.lastAt = Math.max(row.lastAt, e.at);
    const matchedClicks = (clicks.get(id) || []).filter(
      (c) => c.target === e.target && c.session === e.session && c.at >= e.at,
    );
    row.clicked += +!!matchedClicks.length;
    // One credited destination per exposure. An explicit click token, origin view,
    // target, session and two-minute window must all agree; no inferred adjacency.
    const destinations = matchedClicks.flatMap((c) =>
      (arrivals.get(`${c.view}:${c.navigation}`) || []).filter(
        (v) =>
          v.session === e.session &&
          v.path === e.target &&
          v.at >= c.at &&
          v.at - c.at <= 120000,
      ),
    );
    destinations.sort((a, b) => a.at - b.at || a.view.localeCompare(b.view));
    const destination = destinations[0];
    if (destination) {
      row.arrived++;
      const seconds = attention.get(destination.view) || 0;
      row.seconds += seconds;
      row.engaged += +(seconds >= 10);
      const list = inSession.get(destination.session) || [],
        i = list.findIndex((v) => v.view === destination.view),
        next = list
          .slice(i + 1)
          .find(
            (v) =>
              v.at > destination.at &&
              v.at <= end &&
              v.path !== destination.path,
          );
      row.continued += +!!(
        next &&
        next.at > destination.at &&
        next.at <= end &&
        next.path !== destination.path
      );
    }
    rows.set(key, row);
  }
  const sorted = [...rows.values()].sort(
    (a, b) => b.seen - a.seen || a.target.localeCompare(b.target),
  );
  const totals = sorted.reduce(
    (t, r) => ({
      seen: t.seen + r.seen,
      clicked: t.clicked + r.clicked,
      arrived: t.arrived + r.arrived,
      engaged: t.engaged + r.engaged,
    }),
    { seen: 0, clicked: 0, arrived: 0, engaged: 0 },
  );
  return {
    rows: sorted.slice(0, 500),
    totals,
    legacyExposures,
    omittedPresentations: Math.max(0, sorted.length - 500),
    omittedExposures: sorted.slice(500).reduce((n, r) => n + r.seen, 0),
    firstAt: exposures.size
      ? [...exposures.values()].reduce(
          (min, e) => Math.min(min, e.at),
          Infinity,
        )
      : null,
  };
}
