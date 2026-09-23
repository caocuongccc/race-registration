import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStravaServerConfig } from "@/lib/strava/config";
import { clearChallengeSessionCookie, readChallengeSession } from "@/lib/strava/session";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = readChallengeSession(request, getStravaServerConfig().oauthStateSecret);
    const user = await prisma.challengeUser.findUnique({
      where: { id: session.userId },
      select: {
        id: true, displayName: true, avatarUrl: true, gender: true, status: true,
        enrollments: {
          where: { status: "ACTIVE", activeUntil: null },
          include: {
            event: { select: { id: true, name: true, slug: true, startsAt: true, endsAt: true, enablePoints: true, rankingMetric: true } },
            teamMemberships: { where: { status: "ACTIVE", leftAt: null }, include: { team: { select: { id: true, name: true } } } },
          },
        },
        athleteTotals: { include: { event: { select: { slug: true } } } },
      },
    });
    if (!user || user.status !== "ACTIVE") throw new Error("UNAUTHORIZED");
    return NextResponse.json({ user });
  } catch {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    clearChallengeSessionCookie(response);
    return response;
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const session = readChallengeSession(request, getStravaServerConfig().oauthStateSecret);
    const input = z.object({ gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]) }).parse(await request.json());
    const current = await prisma.challengeUser.findUnique({ where: { id: session.userId }, select: { gender: true } });
    if (!current) throw new Error("UNAUTHORIZED");
    const user = await prisma.challengeUser.update({ where: { id: session.userId }, data: { gender: input.gender }, select: { id: true, gender: true } });
    await prisma.challengeAuditLog.create({ data: { actorType: "ATHLETE", actorId: session.userId, action: "GENDER_UPDATED", entityType: "ChallengeUser", entityId: session.userId, beforeJson: { gender: current.gender }, afterJson: { gender: user.gender } } });
    return NextResponse.json({ user });
  } catch (error) {
    const invalid = error instanceof Error && error.name === "ZodError";
    return NextResponse.json({ error: invalid ? "Giới tính không hợp lệ" : "Unauthorized" }, { status: invalid ? 400 : 401 });
  }
}
