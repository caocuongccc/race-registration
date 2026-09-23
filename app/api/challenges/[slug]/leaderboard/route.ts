import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const type = request.nextUrl.searchParams.get("type") ?? "overall";

  const event = await prisma.challengeEvent.findUnique({
    where: { slug },
    select: {
      id: true,
      enablePoints: true,
      rankingMetric: true,
      topCount: true,
      status: true,
    },
  });
  if (!event || event.status === "DRAFT" || event.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Không tìm thấy sự ki�?n" },
      { status: 404 },
    );
  }
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? event.topCount);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
    : event.topCount;
  const orderBy =
    event.enablePoints && event.rankingMetric === "POINTS"
      ? { points: "desc" as const }
      : { distanceMeters: "desc" as const };

  if (type === "team") {
    const rows = await prisma.challengeTeamEventTotal.findMany({
      where: { eventId: event.id, team: { status: "ACTIVE" } },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            maxMembers: true,
            _count: {
              select: {
                memberships: { where: { status: "ACTIVE", leftAt: null } },
              },
            },
          },
        },
      },
      orderBy: [orderBy, { team: { name: "asc" } }],
      take: limit,
    });
    return NextResponse.json({
      metric: event.enablePoints ? event.rankingMetric : "DISTANCE",
      rows: rows.map((row, index) => ({
        rank: index + 1,
        teamId: row.teamId,
        name: row.team.name,
        memberCount: row.team._count.memberships,
        maxMembers: row.team.maxMembers,
        distanceMeters: row.distanceMeters,
        points: Number(row.points),
        acceptedCount: row.acceptedCount,
      })),
    });
  }

  const gender =
    type === "male" ? "MALE" : type === "female" ? "FEMALE" : undefined;
  const rows = await prisma.challengeAthleteEventTotal.findMany({
    where: {
      eventId: event.id,
      user: {
        status: "ACTIVE",
        ...(gender ? { gender } : {}),
        enrollments: {
          some: { eventId: event.id, status: "ACTIVE", activeUntil: null },
        },
      },
    },
    include: {
      user: {
        select: { id: true, displayName: true, avatarUrl: true, gender: true },
      },
    },
    orderBy: [orderBy, { user: { displayName: "asc" } }],
    take: limit,
  });
  return NextResponse.json({
    metric: event.enablePoints ? event.rankingMetric : "DISTANCE",
    rows: rows.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      name: row.user.displayName,
      avatarUrl: row.user.avatarUrl,
      gender: row.user.gender,
      distanceMeters: row.distanceMeters,
      points: Number(row.points),
      acceptedCount: row.acceptedCount,
    })),
  });
}

