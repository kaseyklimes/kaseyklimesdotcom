import "server-only";
import { createHmac } from "node:crypto";
import type { AnalyticsEvent } from "./model";
export const DAILY_LIMIT = 20000;
// Leave room for Redis indexing and rate-limit keys within the free 256 MB plan.
export const STORAGE_BUDGET_BYTES = 128 * 1024 * 1024;
export type ViewSnapshot = AnalyticsEvent & {
  hasView: boolean;
  presentations?: Record<
    string,
    {
      target: string;
      at: number;
      presentation: NonNullable<AnalyticsEvent["presentation"]>;
    }
  >;
  navigations?: Record<
    string,
    { target: string; at: number; exposure?: string }
  >;
  impressions: Record<string, boolean>;
  cardClicks: Record<string, boolean>;
  clicks: Record<string, boolean>;
  interactions: Record<string, boolean>;
};
export function configured() {
  return Boolean(
    (process.env.ANALYTICS_REDIS_URL || process.env.KV_REST_API_URL) &&
      (process.env.ANALYTICS_REDIS_TOKEN || process.env.KV_REST_API_TOKEN) &&
      (process.env.ANALYTICS_SESSION_SECRET?.length || 0) >= 32 &&
      /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(
        process.env.ANALYTICS_PASSWORD_HASH || "",
      ),
  );
}
export async function redis<T = unknown>(
  ...command: (string | number)[]
): Promise<T> {
  const url = process.env.ANALYTICS_REDIS_URL || process.env.KV_REST_API_URL,
    token = process.env.ANALYTICS_REDIS_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Analytics storage is not configured");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Analytics storage unavailable");
  const result = await response.json();
  if (result.error) throw new Error("Analytics storage command failed");
  return result.result as T;
}
export async function limited(
  identity: string,
  scope: string,
  max: number,
  windowSeconds: number,
) {
  const hash = createHmac(
    "sha256",
    process.env.ANALYTICS_SESSION_SECRET || "unconfigured",
  )
    .update(identity)
    .digest("hex");
  const key = `analytics:rate:${scope}:${hash}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const count = await redis<number>(
    "EVAL",
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
    1,
    key,
    windowSeconds,
  );
  return count > max;
}
export async function save(events: AnalyticsEvent[]) {
  const date = new Date().toISOString().slice(0, 10);
  // Compact directly into idempotent per-view summaries. Repeated heartbeats,
  // retries, card exposures and destination actions cannot inflate the totals.
  // Summaries do not expire: every date remains available for all-time queries.
  await redis(
    "EVAL",
    `
 local bytes=tonumber(redis.call('GET',KEYS[3]) or '0');
 local received=tonumber(redis.call('GET',KEYS[4]) or '0'); local accepted=0;
 for i=4,#ARGV do
   local e=cjson.decode(ARGV[i]);
   if received >= tonumber(ARGV[2]) then
     redis.call('HSET',KEYS[5],ARGV[3],'daily collection limit');
   else
     received=received+1;
     local raw=redis.call('HGET',KEYS[1],e.view); local v;
     if raw then v=cjson.decode(raw) else
       v=cjson.decode(ARGV[i]); v.type='view'; v.hasView=false; v.seconds=0; v.depth=0;
       v.impressions={}; v.cardClicks={}; v.clicks={}; v.interactions={};
     end;
     if v.session==e.session and v.path==e.path then
       if e.type=='view' then v.hasView=true; v.at=math.min(v.at,e.at); if e.referral and not v.referral then v.referral=e.referral end
       elseif e.type=='engagement' then v.seconds=math.max(v.seconds,e.seconds); v.depth=math.max(v.depth,e.depth)
       elseif e.type=='impression' then
         v.impressions[e.target]=true;
         if e.exposure and e.presentation then
           v.presentations=v.presentations or {}; v.presentationCount=v.presentationCount or 0;
           if not v.presentations[e.exposure] then
             if v.presentationCount<200 then
               v.presentations[e.exposure]={target=e.target,at=e.at,presentation=e.presentation}; v.presentationCount=v.presentationCount+1;
             else redis.call('HSET',KEYS[5],ARGV[3],'per-view presentation limit') end;
           end;
         end
       elseif e.type=='card_click' then
         v.cardClicks[e.target]=true;
         if e.navigation then
           v.navigations=v.navigations or {}; v.navigationCount=v.navigationCount or 0;
           if not v.navigations[e.navigation] then
             if v.navigationCount<100 then
               v.navigations[e.navigation]={target=e.target,at=e.at,exposure=e.exposure}; v.navigationCount=v.navigationCount+1;
             else redis.call('HSET',KEYS[5],ARGV[3],'per-view navigation limit') end;
           end;
         end
       elseif e.type=='click' then v.clicks[e.target]=true
       elseif e.type=='interaction' then v.interactions[e.target]=true end;
       v.target=''; v.exposure=nil; v.navigation=nil; v.presentation=nil; local encoded=cjson.encode(v); local delta=string.len(encoded)-(raw and string.len(raw) or -300);
       if bytes+delta <= tonumber(ARGV[1]) then
         redis.call('HSET',KEYS[1],e.view,encoded); redis.call('ZADD',KEYS[2],v.at,e.view);
         bytes=bytes+delta; accepted=accepted+1;
       else redis.call('HSET',KEYS[5],ARGV[3],'storage budget reached') end;
     end;
   end;
 end;
 redis.call('SET',KEYS[3],bytes); redis.call('SET',KEYS[4],received,'EX',172800);
 return accepted`,
    5,
    "analytics:views",
    "analytics:view-index",
    "analytics:storage-bytes",
    `analytics:ingest:${date}`,
    "analytics:coverage-warnings",
    STORAGE_BUDGET_BYTES,
    DAILY_LIMIT,
    date,
    ...events.map((e) => JSON.stringify(e)),
  );
}
export async function historyBounds() {
  const first = await redis<string[]>(
    "ZRANGE",
    "analytics:view-index",
    0,
    0,
    "WITHSCORES",
  );
  return { firstAt: first.length ? Number(first[1]) : null };
}
export async function readEvents(start: number, end: number) {
  const ids = await redis<string[]>(
    "ZRANGEBYSCORE",
    "analytics:view-index",
    start - 86400000,
    end,
  );
  const events: AnalyticsEvent[] = [];
  for (let i = 0; i < ids.length; i += 400) {
    const rows = await redis<(string | null)[]>(
      "HMGET",
      "analytics:views",
      ...ids.slice(i, i + 400),
    );
    for (const raw of rows) {
      if (!raw) continue;
      const view = JSON.parse(raw) as ViewSnapshot;
      if (!view.hasView) continue;
      const base: AnalyticsEvent = {
        id: view.id,
        session: view.session,
        view: view.view,
        type: "view",
        path: view.path,
        target: "",
        at: view.at,
        seconds: 0,
        depth: 0,
        source: view.source,
        medium: view.medium,
        campaign: view.campaign,
        country: view.country,
        device: view.device,
      };
      events.push({
        ...base,
        ...(view.referral ? { referral: view.referral } : {}),
      });
      if (view.seconds || view.depth)
        events.push({
          ...base,
          type: "engagement",
          seconds: view.seconds,
          depth: view.depth,
        });
      for (const [field, type] of [
        ["impressions", "impression"],
        ["cardClicks", "card_click"],
        ["clicks", "click"],
        ["interactions", "interaction"],
      ] as const) {
        for (const target of Object.keys(view[field])) {
          // New presentation impressions replace their legacy boolean counterpart.
          if (
            type === "impression" &&
            Object.values(view.presentations || {}).some(
              (p) => p.target === target,
            )
          )
            continue;
          events.push({ ...base, type, target });
        }
      }
      for (const [exposure, p] of Object.entries(view.presentations || {}))
        events.push({
          ...base,
          type: "impression",
          target: p.target,
          at: p.at,
          exposure,
          presentation: p.presentation,
        });
      for (const [navigation, n] of Object.entries(view.navigations || {}))
        events.push({
          ...base,
          type: "card_click",
          target: n.target,
          at: n.at,
          navigation,
          ...(n.exposure ? { exposure: n.exposure } : {}),
        });
    }
  }
  const warnings = await redis<string[]>(
    "HGETALL",
    "analytics:coverage-warnings",
  );
  const coverageWarnings = [];
  for (let i = 0; i < warnings.length; i += 2) {
    const date = warnings[i];
    if (Date.parse(date) + 86400000 > start && Date.parse(date) <= end)
      coverageWarnings.push({ date, reason: warnings[i + 1] });
  }
  return { events, coverageWarnings };
}
