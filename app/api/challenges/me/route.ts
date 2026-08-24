import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStravaServerConfig } from "@/lib/strava/config";
import { clearChallengeSessionCookie, readChallengeSession } from "@/lib/strava/session";

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

