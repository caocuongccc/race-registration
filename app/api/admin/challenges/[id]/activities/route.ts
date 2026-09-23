import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { formatChallengeRuleFailuresVi } from "@/lib/challenge-rules/messages";
import type { ChallengeRuleFailure } from "@/lib/challenge-rules/engine";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await getUserSession();
  if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: eventId } = await context.params;
  const status = request.nextUrl.searchParams.get("status");
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const rows = await prisma.challengeActivityEvaluation.findMany({
    where: { eventId, isCurrent: true, ...(status ? { status: status as any } : {}), ...(query ? { activity: { user: { displayName: { contains: query, mode: "insensitive" } } } } : {}) },
    include: { activity: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } }, ruleset: { select: { version: true } }, team: { select: { name: true } } },
    orderBy: { evaluatedAt: "desc" }, take: 200,
  });
  return NextResponse.json({ activities: rows.map((row) => {
    const failures = Array.isArray(row.failureReasons) ? row.failureReasons as unknown as ChallengeRuleFailure[] : [];
    return {
      id: row.id, status: row.status, messages: formatChallengeRuleFailuresVi(failures), ruleVersion: row.ruleset.version,
      validDistanceMeters: row.validDistanceMeters, creditedIndividualMeters: row.creditedIndividualMeters,
      creditedTeamMeters: row.creditedTeamMeters, teamName: row.team?.name ?? null,
      activity: { id: row.activity.id, stravaActivityId: row.activity.stravaActivityId.toString(), name: row.activity.name, sportType: row.activity.sportType, startDate: row.activity.startDate, distanceMeters: row.activity.distanceMeters, hasGps: row.activity.hasGps, hasHeartRate: row.activity.hasHeartRate, user: row.activity.user },
    };
  }) });
}
