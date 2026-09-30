import "server-only";
import { createHmac, timingSafeEqual, scryptSync } from "node:crypto";
import { cookies } from "next/headers";
export const COOKIE = "analytics_owner";
export const MAX_AGE = 8 * 3600;
function secret() {
  const s = process.env.ANALYTICS_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function signSession(now = Date.now()) {
  const key = secret();
  if (!key) throw new Error("Owner access is not configured");
  const expires = String(Math.floor(now / 1000) + MAX_AGE);
  return `${expires}.${createHmac("sha256", key).update(`owner:${expires}`).digest("hex")}`;
}
export function validSession(token: string | undefined, now = Date.now()) {
  const key = secret();
  if (!key || !token) return false;
  const [expires, signature, extra] = token.split(".");
  if (
    extra ||
    !/^\d{10}$/.test(expires) ||
    !signature ||
    Number(expires) <= now / 1000 ||
    Number(expires) > now / 1000 + MAX_AGE + 1
  )
    return false;
  return equal(
    signature,
    createHmac("sha256", key).update(`owner:${expires}`).digest("hex"),
  );
}
export async function isOwner() {
  return validSession((await cookies()).get(COOKIE)?.value);
}
export function validPassword(password: unknown) {
  const stored = process.env.ANALYTICS_PASSWORD_HASH;
  if (
    !stored ||
    typeof password !== "string" ||
    password.length < 16 ||
    password.length > 256
  )
    return false;
  const [salt, hash] = stored.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(hash || ""))
    return false;
  return equal(scryptSync(password, salt, 64).toString("hex"), hash);
}
export function sameOrigin(request: Request) {
  const configured = process.env.ANALYTICS_SITE_ORIGIN;
  const origin =
    configured ||
    (process.env.NODE_ENV !== "production"
      ? new URL(request.url).origin
      : "https://kaseyklimes.com");
  const supplied = request.headers.get("origin");
  const allowed = new Set([origin]);
  // Both live hostnames currently serve the same site. Keep the allowlist exact.
  if (origin === "https://kaseyklimes.com")
    allowed.add("https://www.kaseyklimes.com");
  return supplied !== null && allowed.has(supplied);
}
export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  Vary: "Cookie",
};
