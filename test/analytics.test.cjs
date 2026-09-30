const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
const { randomUUID, scryptSync } = require("node:crypto");
function load(name) {
  const file = path.join(__dirname, "../src/lib/analytics", name + ".ts");
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  vm.runInThisContext(`(function(require,module,exports){${outputText}\n})`, {
    filename: file,
  })(
    (name) =>
      name === "server-only"
        ? {}
        : name === "next/headers"
          ? {}
          : name.startsWith("./")
            ? load(name.slice(2))
            : require(name),
    module,
    module.exports,
  );
  return module.exports;
}
const { publicPath, normalizeEvent, summarize } = load("model");
const { signSession, validSession, validPassword, sameOrigin } = load("auth");
const now = Date.UTC(2026, 8, 29, 12),
  session = randomUUID(),
  view = randomUUID();
const base = {
  id: randomUUID(),
  session,
  view,
  type: "view",
  path: "/blog/hello",
  source: "search.example",
  medium: "",
  campaign: "",
  target: "",
  at: now,
  seconds: 0,
  depth: 0,
  country: "US",
  device: "Desktop",
};
test("rejects private paths, arbitrary payloads and query strings", () => {
  for (const p of [
    "/insights",
    "/api/analytics/report",
    "/_next/static",
    "/blog/a?email=secret",
    "https://evil.test",
    "/../insights",
    "/blog/<script>",
  ])
    assert.equal(publicPath(p), null, p);
  assert.equal(
    normalizeEvent(null, { country: "US", device: "Desktop" }),
    null,
  );
  assert.equal(normalizeEvent({ ...base, session: "bad" }, base), null);
  assert.equal(publicPath("/blog/hello/"), "/blog/hello");
});
test("outbound URLs discard personal paths and query strings; numeric fields clamp", () => {
  const e = normalizeEvent(
    {
      ...base,
      type: "click",
      target: "https://example.com/private/person?email=secret",
    },
    { country: "US", device: "Desktop" },
    now,
  );
  assert.equal(e.target, "example.com");
  assert.equal(e.at, now);
  assert.equal(
    normalizeEvent(
      { ...base, type: "click", target: "javascript:alert(1)" },
      base,
    ),
    null,
  );
  const p = normalizeEvent(
    { ...base, type: "engagement", seconds: 999999, depth: 999 },
    { country: "US", device: "Desktop" },
  );
  assert.equal(p.seconds, 1800);
  assert.equal(p.depth, 100);
});
test("cumulative heartbeats never double count reading time and source follows entry", () => {
  const second = {
    ...base,
    id: randomUUID(),
    view: randomUUID(),
    source: "internal.example",
    path: "/work/project",
    at: now + 1000,
  };
  const events = [
    base,
    { ...base, type: "engagement", seconds: 15, depth: 50 },
    { ...base, type: "engagement", seconds: 30, depth: 80 },
    second,
  ];
  const r = summarize(events, 7, {}, now + 10000);
  assert.equal(r.views, 2);
  assert.equal(r.sessions, 1);
  assert.equal(r.avgSeconds, 15);
  assert.equal(r.engaged, 1);
  assert.equal(r.pages.find((p) => p.path === base.path).depth, 80);
  assert.deepEqual(r.sources, [{ name: "search.example", count: 1 }]);
  assert.equal(r.journeys[0].name, "/blog/hello → /work/project");
  assert.equal(
    summarize(events, 7, { source: "search.example" }, now + 10000).views,
    2,
  );
  assert.equal(
    summarize(events, 7, { device: "Mobile" }, now + 10000).views,
    0,
  );
});
test("card conversion counts unique page views and requires exposure", () => {
  const e = { ...base, target: "/work/project" };
  const r = summarize(
    [
      base,
      { ...e, type: "impression" },
      { ...e, type: "impression" },
      { ...e, type: "card_click" },
      { ...e, type: "card_click" },
      { ...e, type: "card_click", target: "/work/unseen" },
    ],
    7,
    {},
    now,
  );
  assert.deepEqual(
    r.interests.find((x) => x.target === "/work/project"),
    { target: "/work/project", seen: 1, clicked: 1 },
  );
  assert.equal(r.interests.find((x) => x.target === "/work/unseen").clicked, 0);
});
test("midnight lookback preserves entry attribution without counting prior-day views", () => {
  const before = { ...base, at: Date.UTC(2026, 8, 22, 23, 58) };
  const after = {
    ...base,
    view: randomUUID(),
    source: "different",
    at: Date.UTC(2026, 8, 23, 0, 2),
  };
  const r = summarize([before, after], 7, {}, now);
  assert.equal(r.views, 1);
  assert.equal(r.sources[0].name, "search.example");
  assert.equal(r.timeline.length, 7);
});
test("owner tokens fail closed, reject tampering, expire and revoke on rotation", () => {
  const old = process.env.ANALYTICS_SESSION_SECRET;
  try {
    delete process.env.ANALYTICS_SESSION_SECRET;
    assert.equal(validSession("1234.signature", now), false);
    assert.throws(() => signSession(now));
    process.env.ANALYTICS_SESSION_SECRET = "a".repeat(64);
    const token = signSession(now);
    assert.equal(validSession(token, now), true);
    assert.equal(validSession(token + "x", now), false);
    assert.equal(validSession(token, now + 8 * 3600000), false);
    assert.equal(validSession(token + ".extra", now), false);
    process.env.ANALYTICS_SESSION_SECRET = "b".repeat(64);
    assert.equal(validSession(token, now), false);
  } finally {
    if (old === undefined) delete process.env.ANALYTICS_SESSION_SECRET;
    else process.env.ANALYTICS_SESSION_SECRET = old;
  }
});
test("access key verification and CSRF origin checks", () => {
  const old = process.env.ANALYTICS_PASSWORD_HASH,
    origin = process.env.ANALYTICS_SITE_ORIGIN;
  try {
    const salt = "a".repeat(32),
      password = "test-key-with-enough-entropy";
    process.env.ANALYTICS_PASSWORD_HASH =
      salt + ":" + scryptSync(password, salt, 64).toString("hex");
    assert.equal(validPassword(password), true);
    assert.equal(validPassword("wrong"), false);
    assert.equal(validPassword({}), false);
    process.env.ANALYTICS_SITE_ORIGIN = "https://kaseyklimes.com";
    assert.equal(
      sameOrigin(
        new Request("https://kaseyklimes.com/api", {
          headers: { origin: "https://evil.test" },
        }),
      ),
      false,
    );
    assert.equal(
      sameOrigin(
        new Request("https://kaseyklimes.com/api", {
          headers: { origin: "https://kaseyklimes.com" },
        }),
      ),
      true,
    );
    assert.equal(sameOrigin(new Request("https://kaseyklimes.com/api")), false);
  } finally {
    if (old === undefined) delete process.env.ANALYTICS_PASSWORD_HASH;
    else process.env.ANALYTICS_PASSWORD_HASH = old;
    if (origin === undefined) delete process.env.ANALYTICS_SITE_ORIGIN;
    else process.env.ANALYTICS_SITE_ORIGIN = origin;
  }
});
test("content dimensions use metadata and exact totals rather than rounded page averages", () => {
  const events = [
    base,
    { ...base, type: "engagement", seconds: 13, depth: 45 },
  ];
  const catalog = {
    "/blog/hello": {
      title: "Hello",
      tags: ["design", "cities"],
      format: "Article",
      emphasis: "3",
    },
  };
  const r = summarize(events, 7, {}, now, catalog);
  assert.equal(r.dimensions.topics.length, 2);
  assert.equal(r.dimensions.formats[0].engaged, 100);
  assert.equal(r.dimensions.formats[0].seconds, 13);
  assert.equal(r.titles["/blog/hello"], "Hello");
});
test("content filtering does not invent a journey across an excluded page", () => {
  const events = [
    base,
    { ...base, view: randomUUID(), path: "/work/x", at: now + 1000 },
    { ...base, view: randomUUID(), path: "/blog/second", at: now + 2000 },
  ];
  assert.equal(
    summarize(events, 7, { category: "Notes" }, now + 3000).journeys.length,
    0,
  );
});
const { resolveRange } = load("range");
test("all-time and custom ranges preserve full history and UTC date boundaries", () => {
  const earliest = Date.UTC(2024, 0, 1);
  const all = resolveRange("all", null, null, earliest, now);
  assert.equal(all.from, "2024-01-01");
  assert.ok(all.days > 730);
  assert.equal(resolveRange("365", null, null, earliest, now).days, 365);
  assert.equal(
    resolveRange("ytd", null, null, earliest, now).from,
    "2026-01-01",
  );
  assert.equal(
    resolveRange("custom", "2024-02-28", "2024-03-01", earliest, now).days,
    3,
  );
  assert.throws(() =>
    resolveRange("custom", "2026-02-30", "2026-03-01", earliest, now),
  );
  assert.throws(() =>
    resolveRange("custom", "2026-09-30", "2026-09-29", earliest, now),
  );
});
test("weekly and monthly traffic deduplicate sessions across day boundaries", () => {
  const e1 = { ...base, at: Date.UTC(2026, 8, 28, 23, 58) },
    e2 = { ...base, view: randomUUID(), at: Date.UTC(2026, 8, 29, 0, 2) };
  const r = summarize([e1, e2], 7, {}, now);
  assert.equal(r.traffic.weekly.at(-1).sessions, 1);
  assert.equal(r.traffic.weekly.at(-1).views, 2);
  assert.equal(r.traffic.monthly.at(-1).sessions, 1);
  assert.equal(
    r.traffic.daily.reduce((n, d) => n + d.sessions, 0),
    2,
  );
});
test("today and yesterday use UTC calendar days", () => {
  const today = resolveRange("1", null, null, null, now);
  assert.equal(today.days, 1);
  assert.equal(today.from, "2026-09-29");
  const yesterday = resolveRange("yesterday", null, null, null, now);
  assert.equal(yesterday.from, "2026-09-28");
  assert.equal(yesterday.to, "2026-09-28");
  assert.equal(yesterday.days, 1);
});

test("journey summaries preserve context, actual order, and destination attention", () => {
  const second = {
    ...base,
    view: randomUUID(),
    path: "/work/project",
    at: now + 1000,
  };
  const third = {
    ...base,
    view: randomUUID(),
    path: "/blog/second",
    at: now + 2000,
  };
  const fourth = {
    ...base,
    view: randomUUID(),
    path: "/shelf/book",
    at: now + 3000,
  };
  const e = [
    fourth,
    third,
    base,
    second,
    { ...base, type: "engagement", seconds: 12 },
    { ...second, type: "engagement", seconds: 30 },
    { ...second, type: "engagement", seconds: 40 },
    { ...fourth, type: "engagement", seconds: 8 },
  ];
  const r = summarize(e, 7, { category: "Notes" }, now + 4000).journeyFlow;
  assert.equal(r.totalSessions, 1);
  assert.deepEqual(r.routes[0], {
    source: base.source,
    first: base.path,
    next: second.path,
    last: fourth.path,
    sessions: 1,
    engagedSessions: 1,
    seconds: 60,
    firstEngaged: 1,
    nextEngaged: 1,
    lastEngaged: 0,
    firstSeconds: 12,
    nextSeconds: 40,
    lastSeconds: 8,
    continued: 1,
    additionalViews: 1,
  });
  assert.equal(r.contentFilter, "Notes");
});
test("single-page and repeat-page journeys do not invent transitions", () => {
  const one = summarize([base], 7, {}, now).journeyFlow.routes[0];
  assert.equal(one.next, null);
  assert.equal(one.last, base.path);
  assert.equal(one.continued, 0);
  const repeat = { ...base, view: randomUUID(), at: now + 1000 };
  const two = summarize([base, repeat], 7, {}, now + 2000).journeyFlow
    .routes[0];
  assert.equal(two.next, base.path);
  assert.equal(two.last, base.path);
  assert.equal(two.sessions, 1);
  assert.equal(two.continued, 0);
});
test("journey range and acquisition filters retain boundaries and aggregate anonymous combinations", () => {
  const before = { ...base, at: Date.UTC(2026, 8, 22, 23, 58) };
  const inRange = {
    ...base,
    view: randomUUID(),
    at: Date.UTC(2026, 8, 23, 0, 2),
    path: "/work/new",
    source: "internal",
  };
  const another = {
    ...inRange,
    session: randomUUID(),
    view: randomUUID(),
    source: base.source,
  };
  const r = summarize(
    [before, inRange, another],
    7,
    { source: base.source },
    now,
  ).journeyFlow;
  assert.equal(r.continuedSessions, 1);
  assert.equal(r.totalSessions, 2);
  assert.equal(r.routes.length, 1);
  assert.equal(r.routes[0].first, "/work/new");
  assert.equal(r.routes[0].sessions, 2);
  assert.ok(!JSON.stringify(r).includes(base.session));
  assert.ok(!JSON.stringify(r).includes(base.view));
  assert.equal(
    summarize([base], 7, { country: "GB" }, now).journeyFlow.routes.length,
    0,
  );
});
test("large route sets explicitly report omitted sessions", () => {
  const events = Array.from({ length: 305 }, (_, i) => ({
    ...base,
    session: randomUUID(),
    view: randomUUID(),
    path: `/work/p${i}`,
  }));
  const r = summarize(events, 7, {}, now).journeyFlow;
  assert.equal(r.routes.length, 300);
  assert.equal(r.omittedSessions, 5);
  assert.equal(r.totalSessions, 305);
  assert.equal(
    r.routes.reduce((n, r) => n + r.sessions, 0) + r.omittedSessions,
    305,
  );
});
const { buildJourneyFlow } = load("journey-flow");
test("flow grouping, expansion, and geometry conserve sessions and attention", () => {
  const events = [];
  for (let i = 0; i < 30; i++) {
    const start = {
      ...base,
      session: randomUUID(),
      view: randomUUID(),
      source: `source-${i % 8}`,
      path: `/work/p${i % 7}`,
    };
    const next = {
      ...start,
      view: randomUUID(),
      path: "/blog/hello",
      at: now + 1000,
    };
    events.push(start, { ...start, type: "engagement", seconds: 12 });
    if (i % 3) events.push(next, { ...next, type: "engagement", seconds: 30 });
  }
  const data = summarize(events, 7, {}, now + 2000).journeyFlow;
  for (const expanded of [[], ["Work"], ["Work", "Notes"]]) {
    const g = buildJourneyFlow(data.routes, expanded, {
      "/blog/hello": "Hello",
    });
    assert.equal(g.sessions, 30);
    for (let stage = 0; stage < 4; stage++)
      assert.equal(
        g.nodes
          .filter((n) => n.stage === stage)
          .reduce((sum, n) => sum + n.sessions, 0),
        30,
      );
    for (let stage = 0; stage < 3; stage++)
      assert.equal(
        g.links
          .filter((l) => l.stage === stage)
          .reduce((sum, l) => sum + l.sessions, 0),
        30,
      );
    assert.equal(
      g.links
        .filter((l) => l.stage === 1)
        .reduce((sum, l) => sum + l.measured, 0),
      20,
    );
    for (const n of g.nodes) {
      assert.ok(n.height > 0);
      assert.ok(n.y >= 40);
      assert.ok(n.y + n.height <= g.height);
      for (const side of ["from", "to"]) {
        const edges = g.links.filter((l) => l[side] === n.id);
        if (edges.length)
          assert.ok(
            Math.abs(edges.reduce((sum, l) => sum + l.width, 0) - n.height) <
              1e-8,
          );
      }
    }
    assert.ok(g.links.every((l) => !l.path.includes("NaN")));
    assert.ok(g.nodes.some((n) => n.label === "Other sources"));
    if (expanded.includes("Work"))
      assert.ok(g.nodes.some((n) => n.label === "Other work pages"));
    else assert.ok(g.nodes.some((n) => n.label === "Work" && n.expandable));
  }
  const empty = buildJourneyFlow([], [], {});
  assert.equal(empty.sessions, 0);
  assert.equal(empty.links.length, 0);
});
test("journeys disclose ambiguous simultaneous observations instead of inventing order", () => {
  const r = summarize(
    [base, { ...base, view: randomUUID(), path: "/work/other" }],
    7,
    {},
    now,
  ).journeyFlow;
  assert.equal(r.routes.length, 0);
  assert.equal(r.ambiguousSessions, 1);
  assert.equal(r.totalSessions, 1);
});
const { normalizePresentation, qualifiesExposure } = load("presentation");
const presentation = {
  schema: 2,
  build: "a".repeat(40),
  content: "b".repeat(16),
  thumbnail: "c".repeat(16),
  stars: 3,
  position: 2,
  columns: 5,
  span: 3,
  width: 720,
  height: 480,
  viewportWidth: 1400,
  viewportHeight: 900,
  initialViewport: true,
  filter: "/",
};
function funnelFixture() {
  const origin = { ...base, path: "/", view: randomUUID(), at: now };
  const exposure = {
    ...origin,
    type: "impression",
    target: "/work/project",
    exposure: randomUUID(),
    presentation,
    at: now + 1000,
  };
  const click = {
    ...origin,
    type: "card_click",
    target: exposure.target,
    exposure: exposure.exposure,
    navigation: randomUUID(),
    at: now + 2000,
  };
  const arrival = {
    ...base,
    path: exposure.target,
    view: randomUUID(),
    referral: { view: origin.view, navigation: click.navigation },
    at: now + 3000,
  };
  return { origin, exposure, click, arrival };
}
test("presentation snapshots validate bounded fields and discard unknown data", () => {
  assert.deepEqual(
    normalizePresentation({ ...presentation, privateText: "not persisted" }),
    presentation,
  );
  for (const changes of [
    { stars: 6 },
    { position: 0 },
    { span: 6 },
    { width: NaN },
    { filter: "/?secret=1" },
    { build: "arbitrary" },
    { schema: 1 },
  ])
    assert.equal(normalizePresentation({ ...presentation, ...changes }), null);
  const { exposure } = funnelFixture();
  assert.deepEqual(
    normalizeEvent(exposure, base, now).presentation,
    presentation,
  );
  assert.equal(
    normalizeEvent(
      {
        ...exposure,
        presentation: { ...presentation, filter: "/api/private" },
        exposure: "bad",
      },
      base,
      now,
    ),
    null,
  );
  assert.equal(
    normalizeEvent(
      { ...base, referral: { view: base.view, navigation: randomUUID() } },
      base,
      now,
    ),
    null,
  );
});
test("oversized cards qualify using viewport-capped area without counting offscreen cards", () => {
  assert.equal(
    qualifiesExposure(
      { left: 0, right: 500, top: 0, bottom: 2000, width: 500, height: 2000 },
      800,
      800,
    ),
    true,
  );
  assert.equal(
    qualifiesExposure(
      { left: 0, right: 500, top: 700, bottom: 2700, width: 500, height: 2000 },
      800,
      800,
    ),
    false,
  );
  assert.equal(
    qualifiesExposure(
      { left: 900, right: 1400, top: 0, bottom: 200, width: 500, height: 200 },
      800,
      800,
    ),
    false,
  );
  assert.equal(
    qualifiesExposure(
      { left: 0, right: 500, top: 0, bottom: 200, width: 500, height: 200 },
      800,
      800,
    ),
    true,
  );
});
test("explicit funnel deduplicates retries and links exposure to cumulative attention and exploration", () => {
  const { origin, exposure, click, arrival } = funnelFixture();
  const events = [
    origin,
    exposure,
    exposure,
    click,
    click,
    arrival,
    { ...arrival, type: "engagement", seconds: 5 },
    { ...arrival, type: "engagement", seconds: 25 },
    { ...arrival, view: randomUUID(), referral: undefined, at: now + 4000 },
    {
      ...arrival,
      view: randomUUID(),
      referral: undefined,
      path: "/blog/next",
      at: now + 5000,
    },
  ];
  const r = summarize(events, 7, {}, now + 6000).presentationFunnel;
  assert.deepEqual(r.totals, { seen: 1, clicked: 1, arrived: 1, engaged: 1 });
  assert.equal(r.rows[0].continued, 1);
  assert.equal(r.rows[0].seconds, 25);
  assert.equal(r.rows[0].presentation.stars, 3);
  assert.equal(r.legacyExposures, 0);
  assert.ok(!JSON.stringify(r).includes(origin.view));
  const filtered = summarize(
    events,
    7,
    { category: "Work" },
    now + 6000,
  ).presentationFunnel;
  assert.equal(
    filtered.totals.engaged,
    1,
    "category selects the card, retaining homepage exposure",
  );
  assert.equal(
    summarize(events, 7, { country: "GB" }, now + 6000).presentationFunnel
      .totals.seen,
    0,
  );
});
test("direct, wrong-target, cross-session, stale and unmatched arrivals receive no credit", () => {
  for (const change of [
    { referral: undefined },
    { path: "/work/other" },
    { session: randomUUID() },
    { at: now + 123000 },
    { at: now + 1500 },
    { referral: { view: randomUUID(), navigation: randomUUID() } },
  ]) {
    const { origin, exposure, click, arrival } = funnelFixture();
    const v = { ...arrival, ...change };
    const r = summarize(
      [origin, exposure, click, v, { ...v, type: "engagement", seconds: 30 }],
      7,
      {},
      now + 180000,
    ).presentationFunnel;
    assert.deepEqual(r.totals, { seen: 1, clicked: 1, arrived: 0, engaged: 0 });
  }
  const { origin, exposure, click, arrival } = funnelFixture();
  assert.equal(
    summarize(
      [origin, exposure, { ...click, exposure: randomUUID() }, arrival],
      7,
      {},
      now + 5000,
    ).presentationFunnel.totals.clicked,
    0,
  );
});
test("presentation variants remain separate and first arrival defines each exposure outcome", () => {
  const { origin, exposure, click, arrival } = funnelFixture();
  const second = {
    ...exposure,
    exposure: randomUUID(),
    presentation: { ...presentation, stars: 1, position: 9 },
    at: now + 4000,
  };
  const r = summarize(
    [
      origin,
      exposure,
      click,
      arrival,
      second,
      { ...arrival, view: randomUUID(), at: now + 5000 },
      { ...arrival, type: "engagement", seconds: 8 },
    ],
    7,
    {},
    now + 6000,
    {
      [arrival.path]: {
        title: "Changed",
        stars: 5,
        tags: [],
        format: "Article",
        emphasis: "5",
      },
    },
  ).presentationFunnel;
  assert.deepEqual(r.totals, { seen: 2, clicked: 1, arrived: 1, engaged: 0 });
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].presentation.stars, 3);
});
test("funnel respects reporting boundaries and labels older unversioned impressions", () => {
  const { origin, exposure, click, arrival } = funnelFixture();
  const r = summarize(
    [
      origin,
      exposure,
      click,
      arrival,
      { ...origin, type: "impression", target: "/blog/old" },
    ],
    7,
    {},
    now + 2500,
  ).presentationFunnel;
  assert.deepEqual(r.totals, { seen: 1, clicked: 1, arrived: 0, engaged: 0 });
  assert.equal(r.legacyExposures, 1);
});

test("funnel destination attention is cumulative even when its heartbeat follows the selected range", () => {
  const { origin, exposure, click, arrival } = funnelFixture();
  const r = summarize([origin, exposure, click, arrival, { ...arrival, type: "engagement", at: now + 9000, seconds: 20 }], 7, {}, now + 5000).presentationFunnel;
  assert.equal(r.totals.engaged, 1);
  assert.equal(r.rows[0].seconds, 20);
});
