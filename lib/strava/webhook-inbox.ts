import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildStravaWebhookEventKey,
  type StravaWebhookEvent,
} from "./webhook";

export type StoreStravaWebhookResult = "QUEUED" | "DUPLICATE" | "PROCESSED" | "IGNORED";

function isDeauthorization(event: StravaWebhookEvent): boolean {
  if (event.object_type !== "athlete" || event.aspect_type !== "update") return false;
  const authorized = event.updates.authorized;
  return authorized === false || authorized === "false";
}

export async function storeStravaWebhookEvent(
  event: StravaWebhookEvent,
): Promise<StoreStravaWebhookResult> {
  const providerEventKey = buildStravaWebhookEventKey(event);
  const payloadJson = event as unknown as Prisma.InputJsonValue;

  try {
    return await prisma.$transaction(async (tx) => {
      if (event.object_type === "athlete") {
        const deauthorization = isDeauthorization(event);
        const inbox = await tx.challengeWebhookEvent.create({
          data: {
            providerEventKey,
            objectType: event.object_type,
            objectId: BigInt(String(event.object_id)),
            aspectType: event.aspect_type,
            ownerStravaId: BigInt(String(event.owner_id)),
            eventTime: new Date(event.event_time * 1000),
            payloadJson,
            status: deauthorization ? "PROCESSED" : "IGNORED",
            processedAt: new Date(),
          },
        });
        if (deauthorization) {
          await tx.challengeStravaAccount.updateMany({
            where: { stravaAthleteId: BigInt(String(event.owner_id)) },
            data: { disconnectedAt: new Date() },
          });
          await tx.challengeUser.updateMany({
            where: { stravaAccount: { stravaAthleteId: BigInt(String(event.owner_id)) } },
            data: { status: "DISCONNECTED" },
          });
        }
        return inbox.status === "PROCESSED" ? "PROCESSED" : "IGNORED";
      }

      const inbox = await tx.challengeWebhookEvent.create({
        data: {
          providerEventKey,
          objectType: event.object_type,
          objectId: BigInt(String(event.object_id)),
          aspectType: event.aspect_type,
          ownerStravaId: BigInt(String(event.owner_id)),
          eventTime: new Date(event.event_time * 1000),
          payloadJson,
          status: "QUEUED",
        },
        select: { id: true },
      });
      await tx.challengeJob.create({
        data: {
          type: event.aspect_type === "delete" ? "DELETE_ACTIVITY" : "SYNC_ACTIVITY",
          dedupeKey: `strava-webhook:${providerEventKey}`,
          payloadJson: {
            webhookEventId: inbox.id,
            stravaActivityId: String(event.object_id),
            stravaAthleteId: String(event.owner_id),
            aspectType: event.aspect_type,
          },
        },
      });
      return "QUEUED";
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "DUPLICATE";
    }
    throw error;
  }
}

