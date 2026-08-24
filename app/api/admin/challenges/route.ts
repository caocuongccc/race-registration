import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import {
  createChallengeEventSchema,
  defaultChallengeRuleConfig,
} from "@/lib/challenges/admin-schemas";

async function requireAdmin() {
  const user = await getUserSession();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export async function GET() {
  try {
    await requireAdmin();
    const events = await prisma.challengeEvent.findMany({
      include: {
        _count: { select: { teams: true, enrollments: true } },
        currentRuleset: { select: { id: true, version: true, effectiveFrom: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải sự kiện" },
      { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const input = createChallengeEventSchema.parse(await request.json());
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.challengeEvent.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description || null,
          timezone: input.timezone,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          participationMode: input.participationMode,
          defaultTeamSize: input.defaultTeamSize,
          enablePoints: input.enablePoints,
          pointsPerKm: input.pointsPerKm,
          rankingMetric: input.enablePoints ? input.rankingMetric : "DISTANCE",
          topCount: input.topCount,
        },
      });
      const ruleset = await tx.challengeRuleset.create({
        data: {
          eventId: created.id,
          version: 1,
          effectiveFrom: created.startsAt,
          applicationScope: "FROM_NOW",
          configJson: defaultChallengeRuleConfig(),
          changeReason: "Ruleset mặc định khi tạo sự kiện",
          createdBy: admin.id,
        },
      });
      await tx.challengeEvent.update({
        where: { id: created.id },
        data: { currentRulesetId: ruleset.id },
      });
      await tx.challengeAuditLog.create({
        data: {
          eventId: created.id,
          actorType: "ADMIN",
          actorId: admin.id,
          action: "EVENT_CREATED",
          entityType: "ChallengeEvent",
          entityId: created.id,
          afterJson: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue,
        },
      });
      return tx.challengeEvent.findUniqueOrThrow({
        where: { id: created.id },
        include: { currentRuleset: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "FORBIDDEN"
      ? 403
      : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? 409
        : error instanceof Error && error.name === "ZodError" ? 400 : 500;
    return NextResponse.json(
      { error: status === 409 ? "Slug sự kiện đã tồn tại" : error instanceof Error ? error.message : "Không thể tạo sự kiện" },
      { status },
    );
  }
}

