import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStravaServerConfig } from "@/lib/strava/config";
import { readChallengeSession } from "@/lib/strava/session";

const COOLDOWN_MS = 2 * 60_000;

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string; activityId: string }> }) {
  try {
    const session = readChallengeSession(request, getStravaServerConfig().oauthStateSecret);
    const { slug, activityId } = await context.params;
    const activity = await prisma.challengeActivity.findFirst({
      where: { id: activityId, userId: session.userId, deletedAt: null },
      select: { stravaActivityId: true, user: { select: { stravaAccount: { select: { stravaAthleteId: true, disconnectedAt: true } } } }, evaluations: { where: { event: { slug }, isCurrent: true }, select: { eventId: true }, take: 1 } },
    });
    const eventId = activity?.evaluations[0]?.eventId;
    if (!activity || !eventId) return NextResponse.json({ error: "Không tìm thấy activity trong sự kiện này" }, { status: 404 });
    const enrollment = await prisma.challengeEnrollment.findFirst({ where: { eventId, userId: session.userId, status: "ACTIVE", activeUntil: null }, select: { id: true } });
    if (!enrollment) return NextResponse.json({ error: "Bạn không còn tham gia sự kiện này" }, { status: 403 });
    const account = activity.user.stravaAccount;
    if (!account || account.disconnectedAt) return NextResponse.json({ error: "Tài khoản Strava đã ngắt kết nối" }, { status: 409 });
    const recent = await prisma.challengeJob.findFirst({ where: { eventId, type: "SYNC_ACTIVITY", createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) }, payloadJson: { path: ["manualUserId"], equals: session.userId } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    if (recent) {
      const retryAfter = Math.max(1, Math.ceil((recent.createdAt.getTime() + COOLDOWN_MS - Date.now()) / 1000));
      return NextResponse.json({ error: `Vui lòng chờ ${retryAfter} giây trước khi đồng bộ lại`, retryAfter }, { status: 429 });
    }
    const bucket = Math.floor(Date.now() / COOLDOWN_MS);
    await prisma.challengeJob.create({ data: { eventId, type: "SYNC_ACTIVITY", dedupeKey: `self-resync:${eventId}:${session.userId}:${activity.stravaActivityId}:${bucket}`, payloadJson: { stravaActivityId: activity.stravaActivityId.toString(), stravaAthleteId: account.stravaAthleteId.toString(), aspectType: "update", targetEventId: eventId, manualUserId: session.userId } } });
    return NextResponse.json({ success: true, message: "Đã đưa activity vào hàng đợi đồng bộ lại" }, { status: 202 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Vui lòng đăng nhập Strava" }, { status: 401 });
    console.error("Challenge self resync failed", error);
    return NextResponse.json({ error: "Không thể tạo yêu cầu đồng bộ lại" }, { status: 500 });
  }
}
