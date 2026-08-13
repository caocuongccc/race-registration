import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

async function loadAndAuthorize(token: string) {
  const user = await getUserSession();
  const application = await prisma.kidRunFamilyApplication.findUnique({
    where: { bibQrToken: token },
    include: {
      campaign: true,
      participants: {
        where: { bibStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: { category: true, shirts: true },
      },
    },
  });
  if (!application) throw new Error("NOT_FOUND");
  if (user.role === "MEMBER") {
    const access = await prisma.kidRunCampaignUser.findUnique({
      where: {
        campaignId_userId: {
          campaignId: application.campaignId,
          userId: user.id,
        },
      },
    });
    if (!access) throw new Error("FORBIDDEN");
  } else if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return { user, application };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const { application } = await loadAndAuthorize(token);
    return NextResponse.json({ application });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message === "NOT_FOUND"
            ? "Không tìm thấy QR gia đình"
            : "Forbidden",
      },
      { status: error.message === "NOT_FOUND" ? 404 : 403 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const { user, application } = await loadAndAuthorize(token);
    const body = await req.json();
    const requested = Array.isArray(body.participantIds)
      ? body.participantIds.map(String)
      : [];
    const validIds = application.participants
      .filter((p) => requested.includes(p.id))
      .map((p) => p.id);
    if (!validIds.length)
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất một BIB" },
        { status: 400 },
      );
    const now = new Date();
    await prisma.$transaction([
      prisma.kidRunParticipant.updateMany({
        where: {
          applicationId: application.id,
          id: { in: validIds },
          bibCollectedAt: null,
        },
        data: { bibCollectedAt: now, bibCollectedBy: user.email },
      }),
      ...validIds.map((participantId) =>
        prisma.kidRunCheckinLog.create({
          data: {
            applicationId: application.id,
            participantId,
            action: "BIB_COLLECTED",
            performedBy: user.email,
          },
        }),
      ),
    ]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
