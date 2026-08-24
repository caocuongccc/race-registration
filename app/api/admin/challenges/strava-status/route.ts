import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { getStravaServerConfig } from "@/lib/strava/config";
import { createStravaSubscription, listStravaSubscriptions } from "@/lib/strava/subscription";

async function admin() { const user = await getUserSession(); if (user.role !== "ADMIN") throw new Error("FORBIDDEN"); }

export async function GET(request: NextRequest) {
  try {
    await admin();
    const config = getStravaServerConfig();
    const callbackUrl = new URL("/api/webhooks/strava", request.nextUrl.origin).toString();
    const [subscriptions, connectedAthletes, pendingJobs, failedJobs] = await Promise.all([
      listStravaSubscriptions(config.STRAVA_CLIENT_ID, config.STRAVA_CLIENT_SECRET),
      prisma.challengeStravaAccount.count({ where: { disconnectedAt: null } }),
      prisma.challengeJob.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
      prisma.challengeJob.count({ where: { status: "FAILED" } }),
    ]);
    return NextResponse.json({ ready: true, redirectUri: config.STRAVA_REDIRECT_URI, callbackUrl, callbackUsesHttps: callbackUrl.startsWith("https://"), subscriptions, connectedAthletes, pendingJobs, failedJobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể kiểm tra Strava";
    return NextResponse.json({ ready: false, error: message }, { status: message === "FORBIDDEN" ? 403 : 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await admin();
    const config = getStravaServerConfig();
    const body = await request.json().catch(() => ({}));
    const callbackUrl = typeof body.callbackUrl === "string" ? body.callbackUrl : new URL("/api/webhooks/strava", request.nextUrl.origin).toString();
    if (!callbackUrl.startsWith("https://")) return NextResponse.json({ error: "Webhook callback phải là URL HTTPS public" }, { status: 400 });
    const existing = await listStravaSubscriptions(config.STRAVA_CLIENT_ID, config.STRAVA_CLIENT_SECRET);
    if (existing.length > 0) return NextResponse.json({ created: false, subscriptions: existing });
    const created = await createStravaSubscription({ clientId: config.STRAVA_CLIENT_ID, clientSecret: config.STRAVA_CLIENT_SECRET, callbackUrl, verifyToken: config.STRAVA_WEBHOOK_VERIFY_TOKEN });
    return NextResponse.json({ created: true, subscription: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể đăng ký webhook" }, { status: 503 });
  }
}

