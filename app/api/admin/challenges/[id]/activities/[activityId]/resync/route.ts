import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ id: string; activityId: string }> }) {
  const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: eventId, activityId } = await context.params;
  const activity = await prisma.challengeActivity.findFirst({ where: { id: activityId, evaluations: { some: { eventId } } }, include: { user: { select: { stravaAccount: { select: { stravaAthleteId: true, disconnectedAt: true } } } } } });
  if (!activity?.user.stravaAccount || activity.user.stravaAccount.disconnectedAt) return NextResponse.json({ error: "Activity hoặc tài khoản Strava không khả dụng" }, { status: 404 });
  const key = `manual-resync:${eventId}:${activity.stravaActivityId}:${Date.now()}`;
  const job = await prisma.challengeJob.create({ data: { eventId, type: "SYNC_ACTIVITY", dedupeKey: key, payloadJson: { stravaActivityId: activity.stravaActivityId.toString(), stravaAthleteId: activity.user.stravaAccount.stravaAthleteId.toString(), aspectType: "update", targetEventId: eventId } } });
  await prisma.challengeAuditLog.create({ data: { eventId, actorType: "ADMIN", actorId: admin.id, action: "ACTIVITY_RESYNC_REQUESTED", entityType: "ChallengeActivity", entityId: activity.id, metadataJson: { jobId: job.id } } });
  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

