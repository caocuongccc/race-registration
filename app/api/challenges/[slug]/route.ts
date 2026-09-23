import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStravaServerConfig } from "@/lib/strava/config";
import { readChallengeSession } from "@/lib/strava/session";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const event = await prisma.challengeEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      startsAt: true,
      endsAt: true,
      status: true,
      enablePoints: true,
      rankingMetric: true,
      topCount: true,
      _count: {
        select: {
          teams: true,
          enrollments: { where: { status: "ACTIVE", activeUntil: null } },
        },
      },
    },
  });
  if (!event || event.status === "DRAFT" || event.status === "CANCELLED")
    return NextResponse.json(
      { error: "Không tìm thấy sự kiện" },
      { status: 404 },
    );
  let me = null;
  try {
    const session = readChallengeSession(
      request,
      getStravaServerConfig().oauthStateSecret,
    );
    const enrollment = await prisma.challengeEnrollment.findFirst({
      where: {
        eventId: event.id,
        userId: session.userId,
        status: "ACTIVE",
        activeUntil: null,
      },
      include: {
        user: { select: { displayName: true, avatarUrl: true } },
        teamMemberships: {
          where: { status: "ACTIVE", leftAt: null },
          include: { team: { select: { id: true, name: true } } },
        },
      },
    });
    const total = enrollment
      ? await prisma.challengeAthleteEventTotal.findUnique({
          where: {
            eventId_userId: { eventId: event.id, userId: session.userId },
          },
        })
      : null;
    if (enrollment)
      me = {
        userId: session.userId,
        displayName: enrollment.user.displayName,
        avatarUrl: enrollment.user.avatarUrl,
        team: enrollment.teamMemberships[0]?.team ?? null,
        distanceMeters: total?.distanceMeters ?? 0,
        points: Number(total?.points ?? 0),
        acceptedCount: total?.acceptedCount ?? 0,
      };
  } catch {
    /* Public event summary remains available without a session. */
  }
  return NextResponse.json({ event, me });
}
