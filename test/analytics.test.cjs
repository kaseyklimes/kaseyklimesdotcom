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
