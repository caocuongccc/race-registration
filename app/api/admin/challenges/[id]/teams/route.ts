import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { createChallengeTeamSchema } from "@/lib/challenges/admin-schemas";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getUserSession();
    if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: eventId } = await context.params;
    const input = createChallengeTeamSchema.parse(await request.json());
    const team = await prisma.$transaction(async (tx) => {
      const event = await tx.challengeEvent.findUnique({ where: { id: eventId }, select: { id: true } });
      if (!event) throw new Error("EVENT_NOT_FOUND");
      const created = await tx.challengeTeam.create({ data: { eventId, ...input } });
      await tx.challengeAuditLog.create({
        data: {
          eventId,
          actorType: "ADMIN",
          actorId: admin.id,
          action: "TEAM_CREATED",
          entityType: "ChallengeTeam",
          entityId: created.id,
          afterJson: input,
        },
      });
      return created;
    });
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "EVENT_NOT_FOUND"
      ? 404
      : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? 409
        : error instanceof Error && error.name === "ZodError" ? 400 : 500;
    return NextResponse.json({ error: status === 409 ? "Tên đội đã tồn tại" : error instanceof Error ? error.message : "Không thể tạo đội" }, { status });
  }
}

