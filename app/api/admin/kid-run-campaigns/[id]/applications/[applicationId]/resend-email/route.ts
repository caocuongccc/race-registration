import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { sendKidRunRegistrationEmail } from "@/lib/kid-run-email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
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

    const email = String((await req.json()).email || "")
      .trim()
      .toLowerCase();
    if (!EMAIL_PATTERN.test(email))
      return NextResponse.json(
        { error: "Định dạng email chưa đúng. Vui lòng kiểm tra lại." },
        { status: 400 },
      );

    const application = await prisma.kidRunFamilyApplication.findFirst({
      where: { id: applicationId, campaignId: id },
      select: { id: true, email: true },
    });
    if (!application)
      return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

    await sendKidRunRegistrationEmail(
      application.id,
      undefined,
      undefined,
      undefined,
      email,
    );
    await prisma.kidRunFamilyApplication.update({
      where: { id: application.id },
      data: { email },
    });

    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không gửi lại được email" },
      { status: 400 },
    );
  }
}
