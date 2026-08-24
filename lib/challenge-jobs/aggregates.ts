import type { Prisma } from "@prisma/client";

const acceptedStatuses = ["ACCEPTED", "ACCEPTED_WITH_CAP"] as const;

export async function rebuildAthleteAggregates(
  tx: Prisma.TransactionClient,
  eventId: string,
  userId: string,
  localDate: Date,
): Promise<void> {
  const [daily, eventTotal, acceptedCount] = await Promise.all([
    tx.challengePointLedger.aggregate({
      where: { eventId, userId, localDate, subjectType: "INDIVIDUAL" },
      _sum: { distanceMeters: true, points: true },
    }),
    tx.challengePointLedger.aggregate({
      where: { eventId, userId, subjectType: "INDIVIDUAL" },
      _sum: { distanceMeters: true, points: true },
    }),
    tx.challengeActivityEvaluation.count({
      where: {
        eventId,
        isCurrent: true,
        status: { in: [...acceptedStatuses] },
        activity: { userId },
      },
    }),
  ]);

  await tx.challengeAthleteDailyTotal.upsert({
    where: { eventId_userId_localDate: { eventId, userId, localDate } },
    create: {
      eventId,
      userId,
      localDate,
      distanceMeters: daily._sum.distanceMeters ?? 0,
      points: daily._sum.points ?? 0,
    },
    update: {
      distanceMeters: daily._sum.distanceMeters ?? 0,
      points: daily._sum.points ?? 0,
    },
  });
  await tx.challengeAthleteEventTotal.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: {
      eventId,
      userId,
      distanceMeters: eventTotal._sum.distanceMeters ?? 0,
      points: eventTotal._sum.points ?? 0,
      acceptedCount,
    },
    update: {
      distanceMeters: eventTotal._sum.distanceMeters ?? 0,
      points: eventTotal._sum.points ?? 0,
      acceptedCount,
    },
  });
}

export async function rebuildTeamAggregates(
  tx: Prisma.TransactionClient,
  eventId: string,
  teamId: string,
  localDate: Date,
): Promise<void> {
  const [daily, eventTotal, acceptedCount] = await Promise.all([
    tx.challengePointLedger.aggregate({
      where: { eventId, teamId, localDate, subjectType: "TEAM" },
      _sum: { distanceMeters: true, points: true },
    }),
    tx.challengePointLedger.aggregate({
      where: { eventId, teamId, subjectType: "TEAM" },
      _sum: { distanceMeters: true, points: true },
    }),
    tx.challengeActivityEvaluation.count({
      where: {
        eventId,
        teamId,
        isCurrent: true,
        status: { in: [...acceptedStatuses] },
      },
    }),
  ]);

  await tx.challengeTeamDailyTotal.upsert({
    where: { eventId_teamId_localDate: { eventId, teamId, localDate } },
    create: {
      eventId,
      teamId,
      localDate,
      distanceMeters: daily._sum.distanceMeters ?? 0,
      points: daily._sum.points ?? 0,
    },
    update: {
      distanceMeters: daily._sum.distanceMeters ?? 0,
      points: daily._sum.points ?? 0,
    },
  });
  await tx.challengeTeamEventTotal.upsert({
    where: { eventId_teamId: { eventId, teamId } },
    create: {
      eventId,
      teamId,
      distanceMeters: eventTotal._sum.distanceMeters ?? 0,
      points: eventTotal._sum.points ?? 0,
      acceptedCount,
    },
    update: {
      distanceMeters: eventTotal._sum.distanceMeters ?? 0,
      points: eventTotal._sum.points ?? 0,
      acceptedCount,
    },
  });
}

