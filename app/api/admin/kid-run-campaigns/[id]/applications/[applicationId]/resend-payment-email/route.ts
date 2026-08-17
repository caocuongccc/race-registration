import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { sendKidRunShirtPaymentEmail } from "@/lib/kid-run-email";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string; applicationId: string }> },
) {
  try {
    const user = await getUserSession();
    const { id, applicationId } = await context.params;
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.role === "MEMBER") {
      const access = await prisma.kidRunCampaignUser.findUnique({
        where: { campaignId_userId: { campaignId: id, userId: user.id } },
      });
      if (!access)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const application = await prisma.kidRunFamilyApplication.findFirst({
      where: {
        id: applicationId,
        campaignId: id,
        shirtPaymentStatus: "PAID",
      },
      select: { id: true, email: true, publicCode: true },
    });
    if (!application)
      return NextResponse.json(
        { error: "Hồ sơ chưa được xác nhận thanh toán áo" },
        { status: 400 },
      );

    await sendKidRunShirtPaymentEmail(application.id);
    return NextResponse.json({
      success: true,
      email: application.email,
      publicCode: application.publicCode,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không gửi lại được email xác nhận thanh toán" },
      { status: 400 },
    );
  }
}
