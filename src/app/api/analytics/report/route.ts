import { contentCatalog } from "@/lib/analytics/catalog";
import { NextRequest, NextResponse } from "next/server";
import { isOwner, PRIVATE_HEADERS } from "@/lib/analytics/auth";
import { historyBounds, readEvents } from "@/lib/analytics/store";
import { summarize } from "@/lib/analytics/model";
import { resolveRange } from "@/lib/analytics/range";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  if (!(await isOwner()))
    return NextResponse.json(
      { error: "Sign in to view analytics." },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  const p = request.nextUrl.searchParams;
  try {
    const { firstAt } = await historyBounds();
    let range;
    try {
      range = resolveRange(
        p.get("days") || "7",
        p.get("from"),
        p.get("to"),
        firstAt,
      );
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    const { events, coverageWarnings } = await readEvents(
      range.start,
      range.end,
    );
    return NextResponse.json(
      {
        ...summarize(
          events,
          range.days,
          {
            source: p.get("source") || undefined,
            device: p.get("device") || undefined,
            country: p.get("country") || undefined,
            category: p.get("category") || undefined,
          },
          range.end,
          contentCatalog(),
        ),
        coverageWarnings,
        range,
        trackingSince: firstAt ? new Date(firstAt).toISOString() : null,
        generatedAt: new Date().toISOString(),
      },
      { headers: PRIVATE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "Analytics storage is unavailable. Please retry." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
