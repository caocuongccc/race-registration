import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getValidStravaAccessToken } from "@/lib/strava/access-token";
import { listStravaAthleteActivities } from "@/lib/strava/client";

const schema = z.object({ eventId: z.string(), userId: z.string(), stravaAthleteId: z.string().regex(/^\d+$/), from: z.string().datetime(), to: z.string().datetime(), page: z.number().int().positive().default(1), parentJobKey: z.string() });
type SummaryActivity = { id: number; start_date: string };

export async function processBackfillPage(value: Prisma.JsonValue) {
  const payload = schema.parse(value);
  const access = await getValidStravaAccessToken(payload.stravaAthleteId);
  if (access.userId !== payload.userId) throw new Error("Tài khoản Strava không khớp vận động viên");
  const result = await listStravaAthleteActivities<SummaryActivity>({ accessToken: access.accessToken, after: new Date(payload.from), before: new Date(payload.to), page: payload.page });
  await prisma.challengeJob.createMany({ data: result.activities.map((activity) => ({ eventId: payload.eventId, type: "SYNC_ACTIVITY" as const, dedupeKey: `backfill:${payload.parentJobKey}:activity:${activity.id}`, payloadJson: { stravaActivityId: String(activity.id), stravaAthleteId: payload.stravaAthleteId, aspectType: "update", targetEventId: payload.eventId } })), skipDuplicates: true });
  if (result.activities.length === 100) await prisma.challengeJob.create({ data: { eventId: payload.eventId, type: "BACKFILL_ACTIVITIES" as any, dedupeKey: `backfill:${payload.parentJobKey}:user:${payload.userId}:page:${payload.page + 1}`, payloadJson: { ...payload, page: payload.page + 1 } } });
  return { found: result.activities.length, page: payload.page, hasMore: result.activities.length === 100, rateLimit: result.rateLimit };
}

