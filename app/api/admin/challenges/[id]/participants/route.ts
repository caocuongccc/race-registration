import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({ userId: z.string().min(1), activeFrom: z.coerce.date().default(() => new Date()) });

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: eventId } = await context.params; const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const enrollments = await prisma.challengeEnrollment.findMany({ where: { eventId, ...(query ? { user: { displayName: { contains: query, mode: "insensitive" } } } : {}) }, include: { user: { select: { id: true, displayName: true, avatarUrl: true, gender: true, status: true, stravaAccount: { select: { stravaAthleteId: true, disconnectedAt: true } } } }, teamMemberships: { orderBy: { joinedAt: "desc" }, take: 1, include: { team: { select: { id: true, name: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ participants: enrollments.map((item) => ({ ...item, user: { ...item.user, stravaAccount: item.user.stravaAccount ? { ...item.user.stravaAccount, stravaAthleteId: item.user.stravaAccount.stravaAthleteId.toString() } : null } })) });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: eventId } = await context.params; const input = createSchema.parse(await request.json());
    const enrollment = await prisma.$transaction(async (tx) => {
      if (!await tx.challengeEvent.findUnique({ where: { id: eventId }, select: { id: true } })) throw new Error("EVENT_NOT_FOUND");
      if (!await tx.challengeUser.findFirst({ where: { id: input.userId, status: "ACTIVE", stravaAccount: { is: { disconnectedAt: null } } }, select: { id: true } })) throw new Error("USER_NOT_FOUND");
      if (await tx.challengeEnrollment.findFirst({ where: { eventId, userId: input.userId, status: "ACTIVE", activeUntil: null } })) throw new Error("ALREADY_ENROLLED");
      const created = await tx.challengeEnrollment.create({ data: { eventId, userId: input.userId, activeFrom: input.activeFrom } });
      await tx.challengeAuditLog.create({ data: { eventId, actorType: "ADMIN", actorId: admin.id, action: "PARTICIPANT_ENROLLED", entityType: "ChallengeEnrollment", entityId: created.id, afterJson: { userId: input.userId, activeFrom: input.activeFrom.toISOString() } } }); return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) { const message = error instanceof Error ? error.message : "Không thể thêm người chơi"; const status = ["EVENT_NOT_FOUND", "USER_NOT_FOUND"].includes(message) ? 404 : message === "ALREADY_ENROLLED" ? 409 : error instanceof Error && error.name === "ZodError" ? 400 : 500; return NextResponse.json({ error: message }, { status }); }
}

