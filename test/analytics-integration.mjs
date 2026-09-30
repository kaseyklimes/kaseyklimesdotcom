// Run against the production build and an isolated local Redis REST fixture.
// Never point this at production: it creates synthetic analytics events.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = "http://localhost:3100";
const request = (path, options = {}) => fetch(base + path, options);
const post = (path, body, headers = {}) =>
  request(path, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
let r = await request("/api/analytics/report");
assert.equal(r.status, 401);
assert.match(r.headers.get("cache-control"), /no-store/);
r = await post(
  "/api/analytics/login",
  { password: "local-review-key-only" },
  { origin: "https://evil.test" },
);
assert.equal(r.status, 403);
r = await post("/api/analytics/login", { password: "incorrect-long-password" });
assert.equal(r.status, 401);
r = await post("/api/analytics/login", { password: "local-review-key-only" });
assert.equal(r.status, 200);
const rawCookie = r.headers.get("set-cookie");
assert.match(rawCookie, /HttpOnly/i);
assert.match(rawCookie, /Secure/i);
assert.match(rawCookie, /SameSite=Strict/i);
const cookie = rawCookie.split(";")[0];
r = await request("/insights", { headers: { cookie } });
const html = await r.text();
assert.ok(html.includes("Website") || html.includes("WEBSITE"));
assert.ok(!html.includes("Owner access key"));
assert.match(r.headers.get("cache-control"), /no-store/);
r = await request("/api/analytics/report", {
  headers: { cookie: cookie + "tampered" },
});
assert.equal(r.status, 401);
r = await request("/api/analytics/report?days=1000", { headers: { cookie } });
assert.equal(r.status, 400);
const report = async () => {
  const response = await request("/api/analytics/report", {
    headers: { cookie },
  });
  assert.equal(response.status, 200);
  return response.json();
};
const before = await report();
const e = {
  id: randomUUID(),
  session: randomUUID(),
  view: randomUUID(),
  type: "view",
  path: "/work/integration-test",
  source: "integration-test",
  medium: "",
  campaign: "",
  at: Date.now(),
};
r = await post("/api/analytics/collect", [e], { origin: "https://evil.test" });
assert.equal(r.status, 403);
r = await post("/api/analytics/collect", [{ ...e, path: "/insights" }]);
assert.equal(r.status, 400);
r = await post("/api/analytics/collect", [
  { ...e, payload: "x".repeat(17000) },
]);
assert.equal(r.status, 413);
r = await post("/api/analytics/collect", [e], { cookie });
assert.equal(r.status, 204);
assert.equal((await report()).views, before.views);
r = await post("/api/analytics/collect", [e], { dnt: "1" });
assert.equal(r.status, 204);
assert.equal((await report()).views, before.views);
r = await post("/api/analytics/collect", [e], { "sec-gpc": "1" });
assert.equal(r.status, 204);
assert.equal((await report()).views, before.views);
r = await post("/api/analytics/collect", [e]);
assert.equal(r.status, 204);
r = await post("/api/analytics/collect", [e]);
assert.equal(r.status, 204);
assert.equal((await report()).views, before.views + 1);
r = await post("/api/analytics/collect", [
  { ...e, id: randomUUID(), type: "engagement", seconds: 20, depth: 70 },
  { ...e, id: randomUUID(), type: "engagement", seconds: 40, depth: 90 },
]);
assert.equal(r.status, 204);
const page = (await report()).pages.find((p) => p.path === e.path);
assert.equal(page.seconds, 40);
assert.equal(page.depth, 90);
r = await post("/api/analytics/logout", {}, { cookie });
assert.equal(r.status, 200);
assert.match(r.headers.get("set-cookie"), /Max-Age=0/i);
r = await request("/insights");
assert.ok((await r.text()).includes("Owner access key"));
console.log(
  "PASS: production-build auth, cache isolation, forgery/CSRF, payload limits, owner/DNT/GPC exclusion, persistent collection, deduplication, engagement, and logout.",
);
// Exercise the actual storage Lua with tiny thresholds and isolated key names.
const { readFileSync } = await import("node:fs");
const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
const ts = require("typescript"),
  vm = require("node:vm");
let clock = Date.now();
const RealDate = Date;
class TestDate extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clock]));
  }
  static now() {
    return clock;
  }
}
const prefix = `integration-${randomUUID()}:`;
const source = readFileSync(
  new URL("../src/lib/analytics/store.ts", import.meta.url),
  "utf8",
)
  .replace("DAILY_LIMIT = 20000", "DAILY_LIMIT = 3")
  .replaceAll("analytics:", prefix);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const module = { exports: {} };
vm.runInThisContext(
  `(function(require,module,exports,Date,process){${output}\n})`,
)(
  (name) => (name === "server-only" ? {} : require(name)),
  module,
  module.exports,
  TestDate,
  {
    env: {
      ANALYTICS_REDIS_URL: "http://127.0.0.1:16380",
      ANALYTICS_REDIS_TOKEN: "local-test-only",
    },
  },
);
const store = module.exports;
const initial = { ...e, view: randomUUID(), at: clock };
await store.save([initial]);
await store.save([
  { ...initial, type: "engagement", seconds: 20, depth: 70 },
  { ...initial, type: "engagement", seconds: 40, depth: 90 },
  { ...initial, type: "view", view: randomUUID() },
]);
let stored = await store.readEvents(clock - 86400000, clock);
assert.equal(stored.events.filter((e) => e.type === "view").length, 1);
assert.equal(stored.events.find((e) => e.type === "engagement").seconds, 40);
assert.equal(stored.coverageWarnings.length, 1);
assert.equal(await store.redis("TTL", prefix + "views"), -1);
clock += 400 * 86400000;
stored = await store.readEvents(clock - 401 * 86400000, clock);
assert.equal(stored.events.filter((e) => e.type === "view").length, 1);
console.log(
  "PASS: Redis compaction, cumulative engagement, visible daily cap warnings, and non-expiring all-time history.",
);
for (const range of ["90", "180", "365", "730", "ytd", "all"]) {
  const r = await request("/api/analytics/report?days=" + range, {
    headers: { cookie },
  });
  assert.equal(r.status, 200, range);
  const data = await r.json();
  assert.ok(data.range.days > 0);
}
r = await request(
  "/api/analytics/report?days=custom&from=2026-09-01&to=2026-09-29",
  { headers: { cookie } },
);
assert.equal(r.status, 200);
assert.equal((await r.json()).range.days, 29);
r = await request(
  "/api/analytics/report?days=custom&from=2026-02-30&to=2026-09-29",
  { headers: { cookie } },
);
assert.equal(r.status, 400);
console.log(
  "PASS: all extended ranges, custom dates, and invalid date rejection.",
);
// Presentation snapshots and navigation tokens survive compaction and replays.
const parent = {
  ...e,
  id: randomUUID(),
  view: randomUUID(),
  session: randomUUID(),
  path: "/",
  source: "presentation-integration",
  at: Date.now() - 4000,
};
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
const exposure = {
  ...parent,
  id: randomUUID(),
  type: "impression",
  target: "/work/funnel-test",
  exposure: randomUUID(),
  presentation,
  at: parent.at + 1000,
};
const click = {
  ...parent,
  id: randomUUID(),
  type: "card_click",
  target: exposure.target,
  exposure: exposure.exposure,
  navigation: randomUUID(),
  at: parent.at + 2000,
};
const destination = {
  ...parent,
  id: randomUUID(),
  view: randomUUID(),
  path: exposure.target,
  referral: { view: parent.view, navigation: click.navigation },
  at: parent.at + 3000,
};
// Arrival and engagement can reach storage before the originating view/exposure.
for (const batch of [
  [{ ...destination, referral: undefined, type: "engagement", seconds: 25, depth: 80 }, destination],
  [click, exposure, parent],
  [click, exposure, parent],
]) {
  const r = await post("/api/analytics/collect", batch);
  assert.equal(r.status, 204);
}
let data = await (
  await request(
    "/api/analytics/report?days=7&source=presentation-integration",
    { headers: { cookie } },
  )
).json();
assert.deepEqual(data.presentationFunnel.totals, {
  seen: 1,
  clicked: 1,
  arrived: 1,
  engaged: 1,
});
assert.deepEqual(data.presentationFunnel.rows[0].presentation, presentation);
assert.equal(data.presentationFunnel.rows[0].seconds, 25);
// A replay cannot replace the originally captured stars/thumbnail.
await post("/api/analytics/collect", [
  {
    ...exposure,
    presentation: { ...presentation, stars: 1, thumbnail: "d".repeat(16) },
  },
]);
data = await (
  await request(
    "/api/analytics/report?days=7&source=presentation-integration",
    { headers: { cookie } },
  )
).json();
assert.deepEqual(data.presentationFunnel.rows[0].presentation, presentation);
assert.equal(data.presentationFunnel.legacyExposures, 0);
console.log(
  "PASS: immutable presentation snapshots, explicit funnel attribution, out-of-order arrival, and retry deduplication through real Redis.",
);
