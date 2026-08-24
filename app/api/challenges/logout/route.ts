import { NextResponse } from "next/server";
import { clearChallengeSessionCookie } from "@/lib/strava/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearChallengeSessionCookie(response);
  return response;
}

