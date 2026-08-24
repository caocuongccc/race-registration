import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { createChallengeRulesetSchema } from "@/lib/challenges/admin-schemas";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getUserSession();
    if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: eventId } = await context.params;
    const input = createChallengeRulesetSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "challenge_events" WHERE "id" = ${eventId} FOR UPDATE`);
      const event = await tx.challengeEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new Error("EVENT_NOT_FOUND");
      const latest = await tx.challengeRuleset.aggregate({
        where: { eventId },
        _max: { version: true },
      });
      const version = (latest._max.version ?? 0) + 1;
      const ruleset = await tx.challengeRuleset.create({
        data: {
          eventId,
          version,
          effectiveFrom: input.effectiveFrom,
          applicationScope: input.applicationScope,
          configJson: JSON.parse(JSON.stringify(input.config)) as Prisma.InputJsonValue,
          changeReason: input.changeReason || null,
          createdBy: admin.id,
          timeWindows: {
            create: input.config.timeWindows.windows.map((window, sortOrder) => ({
              ...window,
              sortOrder,
            })),
          },
          specialDays: {
            create: input.specialDays.map((day) => ({
              localDate: day.localDate,
              name: day.name,
              multiplier: day.multiplier,
            })),
          },
        },
        include: { timeWindows: true, specialDays: true },
      });
      await tx.challengeEvent.update({
        where: { id: eventId },
        data: { currentRulesetId: ruleset.id },
      });
      let recalculationJobId: string | null = null;
      if (input.applicationScope !== "FROM_NOW") {
        const job = await tx.challengeJob.create({
          data: {
            eventId,
            type: "RECALCULATE_EVENT",
            dedupeKey: `recalculate:${eventId}:ruleset:${ruleset.id}`,
            payloadJson: {
              eventId,
              rulesetId: ruleset.id,
              applicationScope: input.applicationScope,
              effectiveFrom: input.effectiveFrom.toISOString(),
            },
          },
        });
        recalculationJobId = job.id;
      }
      await tx.challengeAuditLog.create({
        data: {
          eventId,
          actorType: "ADMIN",
          actorId: admin.id,
          action: "RULESET_PUBLISHED",
          entityType: "ChallengeRuleset",
          entityId: ruleset.id,
          afterJson: JSON.parse(JSON.stringify({ version, ...input })) as Prisma.InputJsonValue,
        },
      });
      return { ruleset, recalculationJobId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tạo ruleset";
    const status = message === "EVENT_NOT_FOUND" ? 404 : error instanceof Error && error.name === "ZodError" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

