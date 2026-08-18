import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { sendKidRunBibPickupEmail } from "@/lib/kid-run-email";

async function authorize(campaignId: string) {
  const user = await getUserSession();
  if (user.role === "ADMIN") return;
  if (user.role === "MEMBER") {
    const access = await prisma.kidRunCampaignUser.findUnique({
      where: { campaignId_userId: { campaignId, userId: user.id } },
    });
    if (access) return;
  }
  throw new Error("FORBIDDEN");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await authorize(id);
    const body = await req.json().catch(() => ({}));
    const retryFailed = body.retryFailed === true;
    const emailType = "BIB_PICKUP_ANNOUNCEMENT" as any;
    const baseWhere: any = {
      campaignId: id,
      status: "CONFIRMED",
      participants: {
        some: { bibStatus: "ACTIVE", bibNumber: { not: null } },
      },
    };
    const emailWhere: any = {
      ...baseWhere,
      emailLogs: retryFailed
        ? {
            none: { type: emailType, status: "SENT" },
            some: { type: emailType, status: "FAILED" },
          }
        : { none: { type: emailType } },
    };
    const applications = await prisma.kidRunFamilyApplication.findMany({
      where: emailWhere,
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    let sent = 0;
    let failed = 0;
    for (const application of applications) {
      try {
        await sendKidRunBibPickupEmail(application.id);
        sent++;
      } catch (error) {
        console.error("Send Kid Run pickup email failed:", application.id, error);
        failed++;
      }
    }

    const remainingUnattempted = await prisma.kidRunFamilyApplication.count({
      where: {
        ...baseWhere,
        emailLogs: { none: { type: emailType } },
      },
    });
    const failedRemaining = await prisma.kidRunFamilyApplication.count({
      where: {
        ...baseWhere,
        emailLogs: {
          none: { type: emailType, status: "SENT" },
          some: { type: emailType, status: "FAILED" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      processed: applications.length,
      sent,
      failed,
      remainingUnattempted,
      failedRemaining,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không gửi được thông báo nhận BIB" },
      { status: error.message === "FORBIDDEN" ? 403 : 400 },
    );
  }
}