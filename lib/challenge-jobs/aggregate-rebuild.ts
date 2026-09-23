import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rebuildAthleteAggregates, rebuildTeamAggregates } from "./aggregates";

const schema = z.object({ eventId: z.string().min(1), cursor: z.string().optional(), rebuilt: z.number().int().nonnegative().default(0) });
const PAGE_SIZE = 100;

export async function processAggregateRebuildPage(value: Prisma.JsonValue): Promise<Prisma.InputJsonValue> {
  const payload = schema.parse(value);
  if (!payload.cursor) {
    await prisma.$transaction([
      prisma.challengeAthleteDailyTotal.deleteMany({ where: { eventId: payload.eventId } }),
      prisma.challengeAthleteEventTotal.deleteMany({ where: { eventId: payload.eventId } }),
      prisma.challengeTeamDailyTotal.deleteMany({ where: { eventId: payload.eventId } }),
      prisma.challengeTeamEventTotal.deleteMany({ where: { eventId: payload.eventId } }),
    ]);
  }
  const entries = await prisma.challengePointLedger.findMany({
    where: { eventId: payload.eventId },
    select: { id: true, userId: true, teamId: true, localDate: true },
    orderBy: { id: "asc" }, take: PAGE_SIZE + 1,
    ...(payload.cursor ? { cursor: { id: payload.cursor }, skip: 1 } : {}),
  });
  const page = entries.slice(0, PAGE_SIZE);
  await prisma.$transaction(async (tx) => {
    const athletes = new Map<string, (typeof page)[number]>();
    const teams = new Map<string, (typeof page)[number]>();
    for (const entry of page) {
      athletes.set(`${entry.userId}:${entry.localDate.toISOString()}`, entry);
      if (entry.teamId) teams.set(`${entry.teamId}:${entry.localDate.toISOString()}`, entry);
    }
    for (const entry of athletes.values()) await rebuildAthleteAggregates(tx, payload.eventId, entry.userId, entry.localDate);
    for (const entry of teams.values()) await rebuildTeamAggregates(tx, payload.eventId, entry.teamId!, entry.localDate);
  });
  const hasMore = entries.length > PAGE_SIZE;
  const nextCursor = hasMore ? page.at(-1)?.id : undefined;
  if (nextCursor) {
    await prisma.challengeJob.create({ data: {
      eventId: payload.eventId, type: "REBUILD_AGGREGATES", dedupeKey: `rebuild:${payload.eventId}:cursor:${nextCursor}`,
      payloadJson: { eventId: payload.eventId, cursor: nextCursor, rebuilt: payload.rebuilt + page.length },
    } });
  }
  return { rebuilt: payload.rebuilt + page.length, pageSize: page.length, hasMore, nextCursor: nextCursor ?? null };
}
