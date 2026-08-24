import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { evaluateChallengeActivity } from "@/lib/challenge-rules/engine";
import { parseChallengeRuleConfig } from "@/lib/challenge-rules/schema";
import { getStravaActivity, getStravaActivityStreams } from "@/lib/strava/client";
import {
  normalizeStravaActivity,
  type StravaActivityStreams,
  type StravaDetailedActivity,
} from "@/lib/strava/activity-normalizer";
import { getValidStravaAccessToken } from "@/lib/strava/access-token";
import { rebuildAthleteAggregates, rebuildTeamAggregates } from "./aggregates";

const activityJobPayloadSchema = z.object({
  webhookEventId: z.string().min(1).optional(),
  stravaActivityId: z.string().regex(/^\d+$/),
  stravaAthleteId: z.string().regex(/^\d+$/),
  aspectType: z.enum(["create", "update", "delete"]),
});

type ActivityJobPayload = z.infer<typeof activityJobPayloadSchema>;

function jsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function localDateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function markWebhookProcessed(
  tx: Prisma.TransactionClient,
  webhookEventId: string | undefined,
): Promise<void> {
  if (!webhookEventId) return;
  await tx.challengeWebhookEvent.updateMany({
    where: { id: webhookEventId },
    data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
  });
}

async function reverseCurrentEvaluations(
  tx: Prisma.TransactionClient,
  activityId: string,
  revision: number,
): Promise<Array<{ eventId: string; userId: string; teamId: string | null; localDate: Date }>> {
  const activity = await tx.challengeActivity.findUniqueOrThrow({
    where: { id: activityId },
    select: { userId: true },
  });
  const evaluations = await tx.challengeActivityEvaluation.findMany({
    where: { activityId, isCurrent: true },
    include: {
      ledgerEntries: {
        where: { entryType: "CREDIT" },
        include: { reversedBy: { select: { id: true } } },
      },
    },
  });
  const affected: Array<{ eventId: string; userId: string; teamId: string | null; localDate: Date }> = [];
  for (const evaluation of evaluations) {
    for (const entry of evaluation.ledgerEntries) {
      affected.push({
        eventId: entry.eventId,
        userId: activity.userId,
        teamId: entry.teamId,
        localDate: entry.localDate,
      });
      if (entry.reversedBy.length > 0) continue;
      await tx.challengePointLedger.create({
        data: {
          operationKey: `reverse:${entry.id}:revision:${revision}`,
          eventId: entry.eventId,
          activityId: entry.activityId,
          evaluationId: entry.evaluationId,
          userId: entry.userId,
          teamId: entry.teamId,
          localDate: entry.localDate,
          subjectType: entry.subjectType,
          entryType: "REVERSAL",
          distanceMeters: -entry.distanceMeters,
          points: entry.points.negated(),
          reversesEntryId: entry.id,
        },
      });
    }
  }
  await tx.challengeActivityEvaluation.updateMany({
    where: { activityId, isCurrent: true },
    data: { isCurrent: false },
  });
  return affected;
}

async function rebuildAffected(
  tx: Prisma.TransactionClient,
  affected: Array<{ eventId: string; userId: string; teamId: string | null; localDate: Date }>,
): Promise<void> {
  const unique = new Map<string, (typeof affected)[number]>();
  for (const item of affected) {
    unique.set(`${item.eventId}:${item.userId}:${item.teamId ?? "-"}:${item.localDate.toISOString()}`, item);
  }
  for (const item of unique.values()) {
    await rebuildAthleteAggregates(tx, item.eventId, item.userId, item.localDate);
    if (item.teamId) await rebuildTeamAggregates(tx, item.eventId, item.teamId, item.localDate);
  }
}

export async function syncStravaActivity(payloadValue: Prisma.JsonValue): Promise<void> {
  const payload = activityJobPayloadSchema.parse(payloadValue) as ActivityJobPayload;
  const access = await getValidStravaAccessToken(payload.stravaAthleteId);
  const detail = await getStravaActivity<StravaDetailedActivity>(
    payload.stravaActivityId,
    access.accessToken,
  );
  const preliminary = normalizeStravaActivity(detail);
  const enrollments = await prisma.challengeEnrollment.findMany({
    where: {
      userId: access.userId,
      activeFrom: { lte: preliminary.startDate },
      OR: [{ activeUntil: null }, { activeUntil: { gt: preliminary.startDate } }],
      event: {
        startsAt: { lte: preliminary.startDate },
        endsAt: { gt: preliminary.startDate },
      },
    },
    include: {
      event: {
        include: {
          currentRuleset: { include: { timeWindows: true, specialDays: true } },
        },
      },
      teamMemberships: {
        where: {
          joinedAt: { lte: preliminary.startDate },
          OR: [{ leftAt: null }, { leftAt: { gt: preliminary.startDate } }],
        },
        orderBy: { joinedAt: "desc" },
        take: 1,
      },
    },
  });

  if (enrollments.length === 0) {
    await prisma.$transaction((tx) => markWebhookProcessed(tx, payload.webhookEventId));
    return;
  }

  const configs = enrollments.map((enrollment) => {
    if (!enrollment.event.currentRuleset) throw new Error(`Event ${enrollment.eventId} chưa có ruleset`);
    return parseChallengeRuleConfig(enrollment.event.currentRuleset.configJson);
  });
  const streamKeys = new Set<string>();
  if (configs.some((config) => config.gps.enabled && config.gps.mode === "STRICT")) streamKeys.add("latlng");
  if (configs.some((config) => config.heartRate.enabled)) streamKeys.add("heartrate");
  const streams = streamKeys.size > 0
    ? await getStravaActivityStreams<StravaActivityStreams>(
      payload.stravaActivityId,
      access.accessToken,
      [...streamKeys],
    )
    : {};
  const normalized = normalizeStravaActivity(detail, streams);
  const snapshot = jsonSnapshot({ detail, streams });
  const date = localDateOnly(normalized.startDateLocal);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.challengeActivity.findUnique({
      where: { stravaActivityId: BigInt(payload.stravaActivityId) },
    });
    const revision = (existing?.revision ?? 0) + 1;
    const commonData = {
      userId: access.userId,
      revision,
      name: normalized.name,
      sportType: normalized.sportType,
      startDate: normalized.startDate,
      startDateLocal: normalized.startDateLocal,
      activityTimezone: normalized.activityTimezone,
      distanceMeters: normalized.distanceMeters,
      movingTimeSeconds: normalized.movingTimeSeconds,
      elapsedTimeSeconds: normalized.elapsedTimeSeconds,
      isManual: normalized.isManual,
      isTrainer: normalized.isTrainer,
      hasGps: normalized.hasGps,
      mapPolyline: normalized.mapPolyline,
      hasHeartRate: normalized.hasHeartRate,
      averageHeartRate: normalized.averageHeartRate,
      maxHeartRate: normalized.maxHeartRate,
      normalizedJson: snapshot,
      processingStatus: "PROCESSING" as const,
      lastError: null,
      deletedAt: null,
    };
    const activity = existing
      ? await tx.challengeActivity.update({ where: { id: existing.id }, data: commonData })
      : await tx.challengeActivity.create({
        data: { ...commonData, stravaActivityId: BigInt(payload.stravaActivityId) },
      });
    const affected = existing
      ? await reverseCurrentEvaluations(tx, activity.id, revision)
      : [];
    await tx.challengeActivityRevision.create({
      data: {
        activityId: activity.id,
        revision,
        changeType: existing ? "UPDATED" : "CREATED",
        snapshotJson: snapshot,
      },
    });

    let accepted = false;
    let acceptedWithCap = false;
    for (let index = 0; index < enrollments.length; index += 1) {
      const enrollment = enrollments[index];
      const ruleset = enrollment.event.currentRuleset!;
      const baseConfig = configs[index];
      const config = {
        ...baseConfig,
        timeWindows: {
          ...baseConfig.timeWindows,
          windows: ruleset.timeWindows.map((window) => ({
            weekday: window.weekday,
            startMinute: window.startMinute,
            endMinute: window.endMinute,
          })),
        },
        scoring: {
          ...baseConfig.scoring,
          enabled: enrollment.event.enablePoints,
          pointsPerKm: Number(enrollment.event.pointsPerKm),
        },
      };
      const membership = enrollment.teamMemberships[0] ?? null;
      const [individualBefore, teamBefore] = await Promise.all([
        tx.challengePointLedger.aggregate({
          where: { eventId: enrollment.eventId, userId: access.userId, localDate: date, subjectType: "INDIVIDUAL" },
          _sum: { distanceMeters: true },
        }),
        membership
          ? tx.challengePointLedger.aggregate({
            where: { eventId: enrollment.eventId, teamId: membership.teamId, localDate: date, subjectType: "TEAM" },
            _sum: { distanceMeters: true },
          })
          : Promise.resolve({ _sum: { distanceMeters: 0 } }),
      ]);
      const specialMultipliers = ruleset.specialDays
        .filter((special) => special.localDate.toISOString().slice(0, 10) === date.toISOString().slice(0, 10))
        .map((special) => Number(special.multiplier));
      if (
        config.scoring.weekendMultiplier
        && (normalized.ruleInput.localStartWeekday === 0 || normalized.ruleInput.localStartWeekday === 6)
      ) specialMultipliers.push(config.scoring.weekendMultiplier);

      const result = evaluateChallengeActivity(config, normalized.ruleInput, {
        eventStartsAt: enrollment.event.startsAt,
        eventEndsAt: enrollment.event.endsAt,
        enrollment: { activeFrom: enrollment.activeFrom, activeUntil: enrollment.activeUntil },
        teamMembership: membership
          ? { teamId: membership.teamId, joinedAt: membership.joinedAt, leftAt: membership.leftAt }
          : null,
        individualDistanceBeforeTodayMeters: individualBefore._sum.distanceMeters ?? 0,
        teamDistanceBeforeTodayMeters: teamBefore._sum.distanceMeters ?? 0,
        applicableMultipliers: specialMultipliers,
      });
      const evaluation = await tx.challengeActivityEvaluation.create({
        data: {
          activityId: activity.id,
          eventId: enrollment.eventId,
          rulesetId: ruleset.id,
          teamId: result.teamId,
          activityRevision: revision,
          status: result.status,
          failureReasons: jsonSnapshot(result.failures),
          validDistanceMeters: result.validDistanceMeters,
          creditedIndividualMeters: result.creditedIndividualMeters,
          creditedTeamMeters: result.creditedTeamMeters,
          individualPoints: result.individualPoints,
          teamPoints: result.teamPoints,
        },
      });
      if (result.status !== "REJECTED") {
        accepted = true;
        acceptedWithCap ||= result.status === "ACCEPTED_WITH_CAP";
        await tx.challengePointLedger.create({
          data: {
            operationKey: `credit:${evaluation.id}:individual`,
            eventId: enrollment.eventId,
            activityId: activity.id,
            evaluationId: evaluation.id,
            userId: access.userId,
            localDate: date,
            subjectType: "INDIVIDUAL",
            entryType: "CREDIT",
            distanceMeters: result.creditedIndividualMeters,
            points: result.individualPoints,
          },
        });
        if (result.teamId) {
          await tx.challengePointLedger.create({
            data: {
              operationKey: `credit:${evaluation.id}:team`,
              eventId: enrollment.eventId,
              activityId: activity.id,
              evaluationId: evaluation.id,
              userId: access.userId,
              teamId: result.teamId,
              localDate: date,
              subjectType: "TEAM",
              entryType: "CREDIT",
              distanceMeters: result.creditedTeamMeters,
              points: result.teamPoints,
            },
          });
        }
      }
      affected.push({ eventId: enrollment.eventId, userId: access.userId, teamId: result.teamId, localDate: date });
    }

    await tx.challengeActivity.update({
      where: { id: activity.id },
      data: {
        processingStatus: acceptedWithCap ? "ACCEPTED_WITH_CAP" : accepted ? "ACCEPTED" : "REJECTED",
        processedAt: new Date(),
      },
    });
    await rebuildAffected(tx, affected);
    await markWebhookProcessed(tx, payload.webhookEventId);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 });
}

export async function deleteStravaActivity(payloadValue: Prisma.JsonValue): Promise<void> {
  const payload = activityJobPayloadSchema.parse(payloadValue) as ActivityJobPayload;
  await prisma.$transaction(async (tx) => {
    const activity = await tx.challengeActivity.findUnique({
      where: { stravaActivityId: BigInt(payload.stravaActivityId) },
    });
    if (!activity) {
      await markWebhookProcessed(tx, payload.webhookEventId);
      return;
    }
    const revision = activity.revision + 1;
    const affected = await reverseCurrentEvaluations(tx, activity.id, revision);
    await tx.challengeActivityRevision.create({
      data: {
        activityId: activity.id,
        revision,
        changeType: "DELETED",
        snapshotJson: activity.normalizedJson as Prisma.InputJsonValue,
      },
    });
    await tx.challengeActivity.update({
      where: { id: activity.id },
      data: { revision, processingStatus: "DELETED", deletedAt: new Date(), processedAt: new Date() },
    });
    await rebuildAffected(tx, affected);
    await markWebhookProcessed(tx, payload.webhookEventId);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 });
}

