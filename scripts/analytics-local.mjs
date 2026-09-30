// Local-only fixture. Requires redis-server and redis-cli on PATH. Never connects to production.
import http from "node:http";
import { fileURLToPath } from "node:url";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { scryptSync, randomBytes, randomUUID } from "node:crypto";
const exec = promisify(execFile),
  root = fileURLToPath(new URL("..", import.meta.url));
const redis = spawn(
  "redis-server",
  [
    "--bind",
    "127.0.0.1",
    "--port",
    "16379",
    "--save",
    "",
    "--appendonly",
    "no",
  ],
  { stdio: "inherit", env: { ...process.env, LC_ALL: "C", LANG: "C" } },
);
await new Promise((r) => setTimeout(r, 1500));
const command = async (args) =>
  JSON.parse(
    (
      await exec(
        "redis-cli",
        ["-2", "-p", "16379", "--json", ...args.map(String)],
        { maxBuffer: 20 * 1024 * 1024 },
      )
    ).stdout,
  );
const server = http
  .createServer(async (req, res) => {
    if (req.headers.authorization !== "Bearer local-test-only") {
      res.statusCode = 401;
      res.end();
      return;
    }
    try {
      let text = "";
      for await (const c of req) text += c;
      const args = JSON.parse(text);
      const result = await command(args);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
  })
  .listen(16380, "127.0.0.1");
const salt = randomBytes(16).toString("hex");
const app = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3100", "-H", "127.0.0.1"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ANALYTICS_REDIS_URL: "http://127.0.0.1:16380",
      ANALYTICS_REDIS_TOKEN: "local-test-only",
      ANALYTICS_PASSWORD_HASH:
        salt +
        ":" +
        scryptSync("local-review-key-only", salt, 64).toString("hex"),
      ANALYTICS_SESSION_SECRET: randomBytes(48).toString("hex"),
      ANALYTICS_SITE_ORIGIN: "http://localhost:3100",
    },
  },
);
app.on("exit", (code) => {
  if (code) {
    redis.kill();
    server.close();
    process.exit(code);
  }
});
const cleanup = () => {
  app.kill();
  redis.kill();
  server.close();
};
process.on("SIGINT", () => {
  cleanup();
  process.exit();
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit();
});
if (process.argv.includes("--seed")) {
  let bytes = 0;
  for (let day = 0; day < 420; day += day < 14 ? 1 : 7) {
    const at = Date.now() - day * 86400000;
    for (let n = 0; n < 12 + (day % 9); n++) {
      const session = randomUUID(),
        source = [
          "google.com",
          "linkedin.com",
          "Direct / unknown",
          "newsletter",
        ][n % 4],
        device = n % 3 ? "Desktop" : "Mobile",
        country = ["US", "GB", "DE", "CA"][n % 4];
      const path = [
        "/blog/a-constructive-critique-of-data-as-labor",
        "/work/google",
        "/photography/azores1",
        "/shelf/understanding-comics",
      ][(n + day) % 4];
      const pages =
        n % 5 === 0
          ? [path]
          : n % 3 === 0
            ? ["/", path, "/work/google", "/shelf/understanding-comics"]
            : n % 3 === 1
              ? ["/", path, path]
              : ["/", path];
      for (let i = 0; i < pages.length; i++) {
        const view = randomUUID(),
          base = {
            id: randomUUID(),
            session,
            view,
            type: "view",
            hasView: true,
            path: pages[i],
            source,
            device,
            country,
            at: at + i * 1000,
            medium: source === "newsletter" ? "email" : "",
            campaign: source === "newsletter" ? "September update" : "",
            target: "",
            seconds: n % 4 === 0 ? 5 : 10 + (n % 9) * 7,
            depth: Math.min(100, 12 + n * 6),
            impressions: {},
            cardClicks: {},
            clicks: {},
            interactions: {},
          };
        if (i === 0) {
          base.impressions = {
            [path]: true,
            "/work/google": true,
            "/blog/a-constructive-critique-of-data-as-labor": true,
          };
          if (n % 5 !== 0) {
            base.cardClicks = { [path]: true };
            base.clicks = { [path]: true };
          }
        } else if (n % 3 === 0) base.clicks = { "getprimitive.ai": true };
        const raw = JSON.stringify(base);
        bytes += Buffer.byteLength(raw) + 300;
        await command(["HSET", "analytics:views", view, raw]);
        await command(["ZADD", "analytics:view-index", base.at, view]);
      }
    }
  }
  await command(["SET", "analytics:storage-bytes", bytes]);
  console.log(
    "Local synthetic fixtures seeded across 420 days; no production connection.",
  );
}
