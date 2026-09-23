import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({ from: z.coerce.date(), to: z.coerce.date() }).refine((v) => v.to > v.from, { message: "Ngày kết thúc phải sau ngày bắt đầu" });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: eventId } = await context.params; const input = schema.parse(await request.json());
    const event = await prisma.challengeEvent.findUnique({ where: { id: eventId }, select: { startsAt: true, endsAt: true } });
    if (!event) return NextResponse.json({ error: "Không tìm thấy sự kiện" }, { status: 404 });
    const from = input.from < event.startsAt ? event.startsAt : input.from; const to = input.to > event.endsAt ? event.endsAt : input.to;
    if (to <= from) return NextResponse.json({ error: "Khoảng đồng bộ không giao với thời gian sự kiện" }, { status: 400 });
    const enrollments = await prisma.challengeEnrollment.findMany({ where: { eventId, activeFrom: { lt: to }, user: { status: "ACTIVE", stravaAccount: { is: { disconnectedAt: null } } } }, select: { userId: true, user: { select: { stravaAccount: { select: { stravaAthleteId: true } } } } } });
    const parentJobKey = `${eventId}:${Date.now()}`;
    await prisma.challengeJob.createMany({ data: enrollments.flatMap((item) => item.user.stravaAccount ? [{ eventId, type: "BACKFILL_ACTIVITIES" as any, dedupeKey: `backfill:${parentJobKey}:user:${item.userId}:page:1`, payloadJson: { eventId, userId: item.userId, stravaAthleteId: item.user.stravaAccount.stravaAthleteId.toString(), from: from.toISOString(), to: to.toISOString(), page: 1, parentJobKey } }] : []), skipDuplicates: true });
    await prisma.challengeAuditLog.create({ data: { eventId, actorType: "ADMIN", actorId: admin.id, action: "BACKFILL_REQUESTED", entityType: "ChallengeEvent", entityId: eventId, metadataJson: { from: from.toISOString(), to: to.toISOString(), athletes: enrollments.length, parentJobKey } } });
    return NextResponse.json({ queued: enrollments.length, from, to, parentJobKey }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo đồng bộ bù" }, { status: error instanceof Error && error.name === "ZodError" ? 400 : 500 }); }
}

