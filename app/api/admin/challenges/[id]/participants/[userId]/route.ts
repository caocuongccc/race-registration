import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({ reason: z.string().trim().min(2).max(1000), leftAt: z.coerce.date().default(() => new Date()) });
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: eventId, userId } = await context.params; const input = schema.parse(await request.json());
    await prisma.$transaction(async (tx) => {
      const enrollment = await tx.challengeEnrollment.findFirst({ where: { eventId, userId, status: "ACTIVE", activeUntil: null }, include: { teamMemberships: { where: { status: "ACTIVE", leftAt: null } } } });
      if (!enrollment) throw new Error("NOT_FOUND"); if (input.leftAt <= enrollment.activeFrom) throw new Error("INVALID_LEFT_AT");
      await tx.challengeTeamMembership.updateMany({ where: { enrollmentId: enrollment.id, status: "ACTIVE", leftAt: null }, data: { status: "REMOVED", leftAt: input.leftAt, removedReason: input.reason } });
      await tx.challengeEnrollment.update({ where: { id: enrollment.id }, data: { status: "REMOVED", activeUntil: input.leftAt, removedReason: input.reason } });
      await tx.challengeAuditLog.create({ data: { eventId, actorType: "ADMIN", actorId: admin.id, action: "PARTICIPANT_REMOVED", entityType: "ChallengeEnrollment", entityId: enrollment.id, beforeJson: JSON.parse(JSON.stringify(enrollment)) as Prisma.InputJsonValue, afterJson: { leftAt: input.leftAt.toISOString(), reason: input.reason } } });
    }); return NextResponse.json({ success: true });
  } catch (error) { const message = error instanceof Error ? error.message : "Không thể xóa người chơi"; return NextResponse.json({ error: message }, { status: message === "NOT_FOUND" ? 404 : 400 }); }
}

