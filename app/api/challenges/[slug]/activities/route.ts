import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatChallengeRuleFailuresVi } from "@/lib/challenge-rules/messages";
import type { ChallengeRuleFailure } from "@/lib/challenge-rules/engine";
import { getStravaServerConfig } from "@/lib/strava/config";
import { readChallengeSession } from "@/lib/strava/session";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const session = readChallengeSession(
      request,
      getStravaServerConfig().oauthStateSecret,
    );
    const { slug } = await context.params;
    const event = await prisma.challengeEvent.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!event)
      return NextResponse.json(
        { error: "Không tìm thấy sự kiện" },
        { status: 404 },
      );
    const enrollment = await prisma.challengeEnrollment.findFirst({
      where: {
        eventId: event.id,
        userId: session.userId,
        status: "ACTIVE",
        activeUntil: null,
      },
    });
    if (!enrollment)
      return NextResponse.json(
        { error: "Bạn không tham gia sự kiện này" },
        { status: 403 },
      );
    const evaluations = await prisma.challengeActivityEvaluation.findMany({
      where: {
        eventId: event.id,
        isCurrent: true,
        activity: { userId: session.userId },
      },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            sportType: true,
            startDate: true,
            distanceMeters: true,
            movingTimeSeconds: true,
            elapsedTimeSeconds: true,
            hasGps: true,
            hasHeartRate: true,
            mapPolyline: true,
            processingStatus: true,
          },
        },
        ruleset: { select: { version: true } },
        team: { select: { name: true } },
      },
      orderBy: { activity: { startDate: "desc" } },
      take: 100,
    });
    return NextResponse.json({
      event,
      activities: evaluations.map((evaluation) => {
        const failures = Array.isArray(evaluation.failureReasons)
          ? (evaluation.failureReasons as unknown as ChallengeRuleFailure[])
          : [];
        return {
          evaluationId: evaluation.id,
          status: evaluation.status,
          ruleVersion: evaluation.ruleset.version,
          reasons: formatChallengeRuleFailuresVi(failures),
          validDistanceMeters: evaluation.validDistanceMeters,
          creditedIndividualMeters: evaluation.creditedIndividualMeters,
          creditedTeamMeters: evaluation.creditedTeamMeters,
          individualPoints: Number(evaluation.individualPoints),
          teamPoints: Number(evaluation.teamPoints),
          teamName: evaluation.team?.name ?? null,
          activity: evaluation.activity,
        };
      }),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
