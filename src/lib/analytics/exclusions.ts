import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function canonicalIP(value: string | null): string | null {
  const ip = value?.trim();
  if (!ip || ip.includes("%") || !isIP(ip)) return null;
  if (isIP(ip) === 4) return ip;
  const normalized = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(normalized);
  if (!mapped) return normalized;
  const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

// Trust only Vercel's platform-owned header, never client-provided alternatives.
export function visitorIP(headers: Pick<Headers, "get">, onVercel = process.env.VERCEL === "1") {
  return onVercel ? canonicalIP(headers.get("x-vercel-forwarded-for")) : null;
}

export function exclusionHash(ip: string | null, secret: string): string | null {
  const normalized = canonicalIP(ip);
  if (!normalized || secret.length < 32) return null;
  return createHmac("sha256", secret)
    .update(`analytics-ip-exclusion:${normalized}`)
    .digest("hex");
}

export function excludedIP(
  ip: string | null,
  hashes = process.env.ANALYTICS_EXCLUDED_IP_HASHES || "",
  secret = process.env.ANALYTICS_SESSION_SECRET || "",
) {
  if (!hashes) return false;
  const hash = exclusionHash(ip, secret);
  return !!hash && hashes.split(/[\s,]+/).includes(hash);
}
