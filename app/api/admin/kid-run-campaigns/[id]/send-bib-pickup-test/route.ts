import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { sendKidRunBibPickupEmail } from "@/lib/kid-run-email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserSession();
    const { id } = await context.params;
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.role === "MEMBER") {
      const access = await prisma.kidRunCampaignUser.findUnique({
        where: { campaignId_userId: { campaignId: id, userId: user.id } },
      });
      if (!access)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email))
      return NextResponse.json(
        { error: "Định dạng email chưa đúng. Vui lòng kiểm tra lại." },
        { status: 400 },
      );

    const application = await prisma.kidRunFamilyApplication.findFirst({
      where: {
        campaignId: id,
        status: "CONFIRMED",
        participants: {
          some: { bibStatus: "ACTIVE", bibNumber: { not: null } },
        },
      },
      select: { id: true, publicCode: true },
      orderBy: { createdAt: "asc" },
    });
    if (!application)
      return NextResponse.json(
        { error: "Không có hồ sơ còn BIB hiệu lực để tạo email mẫu" },
        { status: 404 },
      );

    await sendKidRunBibPickupEmail(application.id, {
      recipientOverride: email,
      isTest: true,
    });
    return NextResponse.json({
      success: true,
      email,
      samplePublicCode: application.publicCode,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không gửi được email test" },
      { status: 400 },
    );
  }
}