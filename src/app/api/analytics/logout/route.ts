import { NextResponse } from "next/server";
import { COOKIE, PRIVATE_HEADERS, sameOrigin } from "@/lib/analytics/auth";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  const response = NextResponse.json(
    { ok: true },
    { headers: PRIVATE_HEADERS },
  );
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
