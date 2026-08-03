import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { confirmKidRunShirtPayment } from "@/lib/kid-run-service";
import { sendKidRunShirtPaymentEmail } from "@/lib/kid-run-email";

export async function POST(_req: Request, context: { params: Promise<{ id: string; applicationId: string }> }) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN" && user.role !== "MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id, applicationId } = await context.params;
    if (user.role === "MEMBER") {
      const access = await prisma.kidRunCampaignUser.findUnique({ where: { campaignId_userId: { campaignId: id, userId: user.id } } });
      if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const current = await prisma.kidRunFamilyApplication.findFirst({ where: { id: applicationId, campaignId: id } });
    if (!current) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });
    const application = await confirmKidRunShirtPayment({
      publicCode: current.publicCode,
      transactionId: `manual_kid_run_${applicationId}_${Date.now()}`,
      amount: current.shirtTotalAmount,
      paymentMethod: "manual_admin",
    });
    after(async () => {
      try { await sendKidRunShirtPaymentEmail(application.id); }
      catch (error) { console.error("Kid Run paid email failed:", error); }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}