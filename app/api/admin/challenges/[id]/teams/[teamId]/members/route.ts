import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { addChallengeTeamMemberSchema } from "@/lib/challenges/admin-schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const admin = await getUserSession();
    if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: eventId, teamId } = await context.params;
    const input = addChallengeTeamMemberSchema.parse(await request.json());
    const membership = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "challenge_teams" WHERE "id" = ${teamId} FOR UPDATE`);
      const team = await tx.challengeTeam.findFirst({
        where: { id: teamId, eventId, status: "ACTIVE" },
      });
      if (!team) throw new Error("TEAM_NOT_FOUND");
      const user = await tx.challengeUser.findUnique({ where: { id: input.userId }, select: { id: true } });
      if (!user) throw new Error("USER_NOT_FOUND");
      const memberCount = await tx.challengeTeamMembership.count({
        where: { teamId, status: "ACTIVE", leftAt: null },
      });
      if (memberCount >= team.maxMembers) throw new Error("TEAM_FULL");

      let enrollment = await tx.challengeEnrollment.findFirst({
        where: { eventId, userId: input.userId, status: "ACTIVE", activeUntil: null },
      });
      if (!enrollment) {
        enrollment = await tx.challengeEnrollment.create({
          data: {
            eventId,
            userId: input.userId,
            status: "ACTIVE",
            activeFrom: input.activeFrom,
          },
        });
      }
      const existingMembership = await tx.challengeTeamMembership.findFirst({
        where: { enrollmentId: enrollment.id, status: "ACTIVE", leftAt: null },
      });
      if (existingMembership) throw new Error("ALREADY_IN_TEAM");
      const created = await tx.challengeTeamMembership.create({
        data: {
          teamId,
          enrollmentId: enrollment.id,
          status: "ACTIVE",
          joinedAt: input.activeFrom,
        },
        include: { enrollment: { include: { user: true } } },
      });
      await tx.challengeAuditLog.create({
        data: {
          eventId,
          actorType: "ADMIN",
          actorId: admin.id,
          action: "TEAM_MEMBER_ADDED",
          entityType: "ChallengeTeamMembership",
          entityId: created.id,
          afterJson: { teamId, userId: input.userId, joinedAt: input.activeFrom.toISOString() },
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể thêm thành viên";
    const statuses: Record<string, number> = {
      TEAM_NOT_FOUND: 404,
      USER_NOT_FOUND: 404,
      TEAM_FULL: 409,
      ALREADY_IN_TEAM: 409,
    };
    return NextResponse.json({ error: message }, { status: statuses[message] ?? (error instanceof Error && error.name === "ZodError" ? 400 : 500) });
  }
}

