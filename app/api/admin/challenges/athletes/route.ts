import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const admin = await getUserSession();
    if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const eventId = request.nextUrl.searchParams.get("eventId")?.trim() || undefined;
    const athletes = await prisma.challengeUser.findMany({
      where: {
        status: "ACTIVE",
        stravaAccount: { isNot: null },
        ...(query ? { displayName: { contains: query, mode: "insensitive" } } : {}),
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        gender: true,
        stravaAccount: { select: { stravaAthleteId: true, connectedAt: true, lastSyncedAt: true } },
        enrollments: eventId ? {
          where: { eventId, status: "ACTIVE", activeUntil: null },
          select: {
            id: true,
            activeFrom: true,
            teamMemberships: {
              where: { status: "ACTIVE", leftAt: null },
              select: { teamId: true, team: { select: { name: true } } },
            },
          },
        } : false,
      },
      orderBy: { displayName: "asc" },
      take: 100,
    });
    return NextResponse.json({ athletes: athletes.map((athlete) => ({
      ...athlete,
      stravaAccount: athlete.stravaAccount ? {
        ...athlete.stravaAccount,
        stravaAthleteId: athlete.stravaAccount.stravaAthleteId.toString(),
      } : null,
    })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải vận động viên" }, { status: 500 });
  }
}

