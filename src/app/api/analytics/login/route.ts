import { boundedText } from "@/lib/analytics/request";
import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE,
  MAX_AGE,
  PRIVATE_HEADERS,
  sameOrigin,
  signSession,
  validPassword,
} from "@/lib/analytics/auth";
import { configured, limited } from "@/lib/analytics/store";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 403, headers: PRIVATE_HEADERS },
    );
  if (!configured())
    return NextResponse.json(
      { error: "Owner access has not been configured." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  try {
    const ip = process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for") ||
        request.headers.get("x-forwarded-for") ||
        "unknown"
      : "local";
    if (await limited(ip, "login", 5, 900))
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429, headers: PRIVATE_HEADERS },
      );
    if (Number(request.headers.get("content-length") || 0) > 1024)
      return new NextResponse(null, { status: 413 });
    const text = await boundedText(request, 1024);
    if (text.length > 1024) return new NextResponse(null, { status: 413 });
    const { password } = JSON.parse(text);
    if (!validPassword(password))
      return NextResponse.json(
        { error: "Incorrect access key." },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    const response = NextResponse.json(
      { ok: true },
      { headers: PRIVATE_HEADERS },
    );
    response.cookies.set(COOKIE, signSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof RangeError)
      return new NextResponse(null, { status: 413 });
    if (error instanceof SyntaxError)
      return new NextResponse(null, { status: 400 });
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
