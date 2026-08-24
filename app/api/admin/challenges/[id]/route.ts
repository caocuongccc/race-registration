import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { updateChallengeEventSchema } from "@/lib/challenges/admin-schemas";

async function requireAdmin() {
  const user = await getUserSession();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const event = await prisma.challengeEvent.findUnique({
      where: { id },
      include: {
        currentRuleset: { include: { timeWindows: true, specialDays: true } },
        rulesets: { orderBy: { version: "desc" }, select: { id: true, version: true, effectiveFrom: true, applicationScope: true, changeReason: true, createdAt: true } },
        teams: {
          orderBy: { name: "asc" },
          include: {
            memberships: {
              where: { status: "ACTIVE", leftAt: null },
              include: { enrollment: { include: { user: true } } },
              orderBy: { joinedAt: "asc" },
            },
          },
        },
        _count: { select: { enrollments: true, evaluations: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Không tìm thấy sự kiện" }, { status: 404 });
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải sự kiện" },
      { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = updateChallengeEventSchema.parse(await request.json());
    const current = await prisma.challengeEvent.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Không tìm thấy sự kiện" }, { status: 404 });
    const startsAt = input.startsAt ?? current.startsAt;
    const endsAt = input.endsAt ?? current.endsAt;
    if (endsAt <= startsAt) return NextResponse.json({ error: "Thời gian kết thúc phải sau thời gian bắt đầu" }, { status: 400 });
    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.challengeEvent.update({
        where: { id },
        data: {
          ...input,
          description: input.description || undefined,
          rankingMetric: input.enablePoints === false ? "DISTANCE" : input.rankingMetric,
        },
      });
      await tx.challengeAuditLog.create({
        data: {
          eventId: id,
          actorType: "ADMIN",
          actorId: admin.id,
          action: "EVENT_UPDATED",
          entityType: "ChallengeEvent",
          entityId: id,
          beforeJson: JSON.parse(JSON.stringify(current)) as Prisma.InputJsonValue,
          afterJson: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    return NextResponse.json({ event });
  } catch (error) {
    const status = error instanceof Error && error.message === "FORBIDDEN" ? 403 : error instanceof Error && error.name === "ZodError" ? 400 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật sự kiện" }, { status });
  }
}

