import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const stravaWebhookEventSchema = z.object({
  object_type: z.enum(["activity", "athlete"]),
  object_id: z.number().int().nonnegative(),
  aspect_type: z.enum(["create", "update", "delete"]),
  owner_id: z.number().int().nonnegative(),
  subscription_id: z.number().int().nonnegative(),
  event_time: z.number().int().nonnegative(),
  updates: z.record(z.string(), z.unknown()).default({}),
});

export type StravaWebhookEvent = z.infer<typeof stravaWebhookEventSchema>;

export function parseStravaWebhookEvent(value: unknown): StravaWebhookEvent {
  return stravaWebhookEventSchema.parse(value);
}

export function buildStravaWebhookEventKey(event: StravaWebhookEvent): string {
  const identity = [
    event.subscription_id,
    event.object_type,
    event.object_id,
    event.aspect_type,
    event.owner_id,
    event.event_time,
  ].join(":");
  return createHash("sha256").update(identity).digest("hex");
}

export function verifyStravaWebhookChallenge(input: {
  mode: string | null;
  receivedToken: string | null;
  expectedToken: string;
  challenge: string | null;
}): string {
  if (input.mode !== "subscribe" || !input.receivedToken || !input.challenge) {
    throw new Error("Thiếu tham số xác thực webhook Strava");
  }
  const received = Buffer.from(input.receivedToken);
  const expected = Buffer.from(input.expectedToken);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error("Webhook verify token không hợp lệ");
  }
  return input.challenge;
}

