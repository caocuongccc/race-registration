import { NextRequest, NextResponse } from "next/server";
import { runChallengeJobBatch } from "@/lib/challenge-jobs/runner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requested = Number(request.nextUrl.searchParams.get("limit") ?? 5);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(10, Math.floor(requested)))
    : 5;
  try {
    return NextResponse.json(await runChallengeJobBatch(limit));
  } catch (error) {
    console.error("Challenge job batch failed", error);
    return NextResponse.json(
      { error: "Challenge worker unavailable" },
      { status: 503 },
    );
  }
}
