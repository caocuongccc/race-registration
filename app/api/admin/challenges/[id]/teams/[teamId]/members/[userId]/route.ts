import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { removeChallengeTeamMemberSchema } from "@/lib/challenges/admin-schemas";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; teamId: string; userId: string }> },
) {
  try {
    const admin = await getUserSession();
    if (admin.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: eventId, teamId, userId } = await context.params;
    const input = removeChallengeTeamMemberSchema.parse(await request.json());
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "challenge_teams" WHERE "id" = ${teamId} FOR UPDATE`,
        );
        const membership = await tx.challengeTeamMembership.findFirst({
          where: {
            teamId,
            status: "ACTIVE",
            leftAt: null,
            team: { eventId },
            enrollment: {
              userId,
              eventId,
              status: "ACTIVE",
              activeUntil: null,
            },
          },
          include: { enrollment: true },
        });
        if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND");
        if (input.leftAt <= membership.joinedAt)
          throw new Error("INVALID_LEFT_AT");
        await tx.challengeTeamMembership.update({
          where: { id: membership.id },
          data: {
            status: "REMOVED",
            leftAt: input.leftAt,
            removedReason: input.reason,
          },
        });
        await tx.challengeEnrollment.update({
          where: { id: membership.enrollmentId },
          data: {
            status: "REMOVED",
            activeUntil: input.leftAt,
            removedReason: input.reason,
          },
        });
        await tx.challengeAuditLog.create({
          data: {
            eventId,
            actorType: "ADMIN",
            actorId: admin.id,
            action: "TEAM_MEMBER_REMOVED_FROM_EVENT",
            entityType: "ChallengeTeamMembership",
            entityId: membership.id,
            beforeJson: JSON.parse(
              JSON.stringify(membership),
            ) as Prisma.InputJsonValue,
            afterJson: {
              status: "REMOVED",
              leftAt: input.leftAt.toISOString(),
              reason: input.reason,
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể xóa thành viên";
    const status =
      message === "MEMBERSHIP_NOT_FOUND"
        ? 404
        : message === "INVALID_LEFT_AT"
          ? 400
          : error instanceof Error && error.name === "ZodError"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
