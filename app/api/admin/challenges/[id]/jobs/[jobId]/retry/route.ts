import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ id: string; jobId: string }> }) {
  const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: eventId, jobId } = await context.params;
  const result = await prisma.challengeJob.updateMany({ where: { id: jobId, eventId, status: { in: ["FAILED", "PARTIALLY_FAILED"] } }, data: { status: "QUEUED", attempts: 0, runAfter: new Date(), completedAt: null, lockedAt: null, lastError: null } });
  if (!result.count) return NextResponse.json({ error: "Job không ở trạng thái có thể thử lại" }, { status: 409 });
  await prisma.challengeAuditLog.create({ data: { eventId, actorType: "ADMIN", actorId: admin.id, action: "JOB_RETRIED", entityType: "ChallengeJob", entityId: jobId } });
  return NextResponse.json({ success: true });
}

