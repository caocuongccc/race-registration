import { NextRequest, NextResponse } from "next/server";
import { getStravaServerConfig } from "@/lib/strava/config";
import { storeStravaWebhookEvent } from "@/lib/strava/webhook-inbox";
import {
  parseStravaWebhookEvent,
  verifyStravaWebhookChallenge,
} from "@/lib/strava/webhook";

export const runtime = "nodejs";

// Strava calls this endpoint while creating a webhook subscription.
export async function GET(request: NextRequest) {
  try {
    const challenge = verifyStravaWebhookChallenge({
      mode: request.nextUrl.searchParams.get("hub.mode"),
      receivedToken: request.nextUrl.searchParams.get("hub.verify_token"),
      expectedToken: getStravaServerConfig().STRAVA_WEBHOOK_VERIFY_TOKEN,
      challenge: request.nextUrl.searchParams.get("hub.challenge"),
    });
    return NextResponse.json({ "hub.challenge": challenge });
  } catch (error) {
    console.warn("Strava webhook verification rejected", error);
    return NextResponse.json(
      { error: "Invalid webhook verification" },
      { status: 403 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const event = parseStravaWebhookEvent(await request.json());
    const result = await storeStravaWebhookEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && error.name === "ZodError")
    ) {
      return NextResponse.json(
        { error: "Invalid Strava webhook payload" },
        { status: 400 },
      );
    }
    console.error("Cannot persist Strava webhook", error);
    // A non-2xx response asks Strava to retry instead of losing the event.
    return NextResponse.json(
      { error: "Webhook persistence unavailable" },
      { status: 503 },
    );
  }
}
