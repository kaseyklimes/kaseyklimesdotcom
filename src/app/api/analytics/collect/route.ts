import { boundedText } from "@/lib/analytics/request";
import { NextRequest, NextResponse } from "next/server";
import { normalizeEvent, type AnalyticsEvent } from "@/lib/analytics/model";
import { configured, limited, save } from "@/lib/analytics/store";
import { sameOrigin, validSession, COOKIE } from "@/lib/analytics/auth";
import { visitorIP, excludedIP } from "@/lib/analytics/exclusions";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  if (!configured()) return new NextResponse(null, { status: 503 });
  if (
    request.headers.get("dnt") === "1" ||
    request.headers.get("sec-gpc") === "1" ||
    validSession(request.cookies.get(COOKIE)?.value)
  )
    return new NextResponse(null, { status: 204 });
  const clientIP = visitorIP(request.headers);
  if (excludedIP(clientIP)) return new NextResponse(null, { status: 204 });
  const ua = request.headers.get("user-agent") || "";
  if (/bot|crawler|spider|headless|preview|facebookexternalhit/i.test(ua))
    return new NextResponse(null, { status: 204 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 16000)
      return new NextResponse(null, { status: 413 });
    // Excluded addresses never reach rate limiting or analytics storage.
    const ip = clientIP || (process.env.VERCEL ? "unknown" : "local");
    if (await limited(ip, "collect", 120, 60))
      return new NextResponse(null, { status: 429 });
    const text = await boundedText(request, 16000);
    if (Buffer.byteLength(text) > 16000)
      return new NextResponse(null, { status: 413 });
    const body = JSON.parse(text);
    if (!Array.isArray(body) || body.length > 30)
      return new NextResponse(null, { status: 400 });
    const context = {
      device: /ipad|tablet/i.test(ua)
        ? "Tablet"
        : /mobile|android|iphone/i.test(ua)
          ? "Mobile"
          : "Desktop",
      country: process.env.VERCEL
        ? (request.headers.get("x-vercel-ip-country") || "Unknown").slice(0, 8)
        : "Unknown",
    };
    const events = body
      .map((e) => normalizeEvent(e, context))
      .filter((e): e is AnalyticsEvent => Boolean(e));
    if (events.length !== body.length)
      return new NextResponse(null, { status: 400 });
    if (events.length) await save(events);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof RangeError)
      return new NextResponse(null, { status: 413 });
    if (error instanceof SyntaxError)
      return new NextResponse(null, { status: 400 });
    return new NextResponse(null, { status: 503 });
  }
}
