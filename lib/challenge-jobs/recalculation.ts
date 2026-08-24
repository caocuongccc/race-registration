import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  eventId: z.string().min(1), rulesetId: z.string().min(1),
  applicationScope: z.enum(["FROM_SELECTED_DATETIME", "RECALCULATE_WHOLE_EVENT"]),
  effectiveFrom: z.string().datetime(), cursor: z.string().optional(),
  enqueued: z.number().int().nonnegative().default(0),
});
const PAGE_SIZE = 100;

export async function processRecalculationPage(payloadValue: Prisma.JsonValue) {
  const payload = schema.parse(payloadValue);
  const event = await prisma.challengeEvent.findUnique({ where: { id: payload.eventId }, select: { id: true, startsAt: true, endsAt: true, currentRulesetId: true } });
  if (!event) throw new Error("Không tìm thấy Challenge Event cần quét lại");
  if (event.currentRulesetId !== payload.rulesetId) throw new Error("Ruleset quét lại không còn là ruleset hiện hành");
  const fromDate = payload.applicationScope === "RECALCULATE_WHOLE_EVENT" ? event.startsAt : new Date(payload.effectiveFrom);
  const activities = await prisma.challengeActivity.findMany({
    where: { processingStatus: { not: "DELETED" }, startDate: { gte: fromDate, lt: event.endsAt }, user: { enrollments: { some: { eventId: event.id } }, stravaAccount: { isNot: null } } },
    select: { id: true, stravaActivityId: true, user: { select: { stravaAccount: { select: { stravaAthleteId: true } } } } },
    orderBy: { id: "asc" }, take: PAGE_SIZE + 1,
    ...(payload.cursor ? { cursor: { id: payload.cursor }, skip: 1 } : {}),
  });
  const page = activities.slice(0, PAGE_SIZE);
  const hasMore = activities.length > PAGE_SIZE;
  await prisma.challengeJob.createMany({
    data: page.flatMap((activity) => activity.user.stravaAccount ? [{
      eventId: event.id, type: "SYNC_ACTIVITY" as const,
      dedupeKey: `recalculate:${payload.rulesetId}:activity:${activity.stravaActivityId.toString()}`,
      payloadJson: { stravaActivityId: activity.stravaActivityId.toString(), stravaAthleteId: activity.user.stravaAccount.stravaAthleteId.toString(), aspectType: "update", targetEventId: event.id, targetRulesetId: payload.rulesetId },
    }] : []),
    skipDuplicates: true,
  });
  const nextCursor = hasMore ? page.at(-1)?.id ?? null : null;
  if (hasMore && nextCursor) await prisma.challengeJob.create({ data: { eventId: event.id, type: "RECALCULATE_EVENT", dedupeKey: `recalculate:${payload.rulesetId}:cursor:${nextCursor}`, payloadJson: { ...payload, cursor: nextCursor, enqueued: payload.enqueued + page.length } } });
  return { enqueued: page.length, hasMore, nextCursor };
}

