import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { KidRunEventScheduleEmail } from "@/emails/kid-run-event-schedule";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_TYPE = "EVENT_SCHEDULE_ANNOUNCEMENT" as any;

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await authorize(id);
    const campaign = await prisma.kidRunCampaign.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!campaign) throw new Error("Không tìm thấy chương trình Kid Run");

    const { renderToStaticMarkup } = await import("react-dom/server");
    const origin = new URL(req.url).origin;
    const html = renderToStaticMarkup(
      KidRunEventScheduleEmail({
        mapImageUrl: `${origin}/SoDoKidRun.png`,
      }),
    );
    return new Response(`<!doctype html>${html}`, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return new Response(error.message || "Không xem trước được email", {
      status: error.message === "FORBIDDEN" ? 403 : 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await authorize(id);
    const body = await req.json().catch(() => ({}));
    const preview = body.preview === true;

    const campaign = await prisma.kidRunCampaign.findUnique({
      where: { id },
      select: {
        name: true,
        contactEmail: true,
        applications: {
          where: {
            status: "CONFIRMED",
            participants: { some: { bibStatus: "ACTIVE" } },
            emailLogs: {
              none: { type: EMAIL_TYPE, status: "SENT" },
            },
          },
          select: { id: true, email: true },
        },
      },
    });
    if (!campaign) throw new Error("Không tìm thấy chương trình Kid Run");

    const applications = campaign.applications.filter((application) =>
      EMAIL_PATTERN.test(application.email.trim()),
    );
    const uniqueEmails = [
      ...new Set(
        applications.map((application) => application.email.trim().toLowerCase()),
      ),
    ];

    if (preview) {
      return NextResponse.json({
        success: true,
        applications: applications.length,
        recipients: uniqueEmails.length,
      });
    }
    if (!uniqueEmails.length)
      return NextResponse.json(
        { error: "Không còn email hợp lệ chưa nhận thông báo lịch trình" },
        { status: 400 },
      );
    if (uniqueEmails.length > 450)
      return NextResponse.json(
        { error: `Có ${uniqueEmails.length} email, vượt giới hạn an toàn 450 người nhận mỗi lần.` },
        { status: 400 },
      );

    const to =
      campaign.contactEmail ||
      process.env.GMAIL_USER ||
      process.env.FROM_EMAIL;
    if (!to) throw new Error("Chưa cấu hình email người gửi");
    const normalizedTo = to.trim().toLowerCase();
    const bcc = uniqueEmails.filter((email) => email !== normalizedTo);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://dangkygiaichay.vercel.app";
    const subject = "Mid-Autumn Kids Run 2026 – Sơ đồ & Timeline chương trình";
    const result = await sendEmailGmailFirst({
      to,
      bcc,
      subject,
      react: KidRunEventScheduleEmail({
        mapImageUrl: `${appUrl}/SoDoKidRun.png`,
      }),
      fromName: campaign.name,
      fromEmail: campaign.contactEmail || process.env.FROM_EMAIL,
    });

    const now = new Date();
    await prisma.kidRunEmailLog.createMany({
      data: applications.map((application) => ({
        applicationId: application.id,
        type: EMAIL_TYPE,
        recipientEmail: application.email,
        subject,
        status: result.success ? "SENT" : "FAILED",
        provider: result.provider,
        errorMessage: result.error,
        sentAt: result.success ? now : null,
      })) as any,
    });
    if (!result.success)
      throw new Error(result.error || "Không gửi được email lịch trình");

    return NextResponse.json({
      success: true,
      applications: applications.length,
      recipients: uniqueEmails.length,
      provider: result.provider,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không gửi được email lịch trình" },
      { status: error.message === "FORBIDDEN" ? 403 : 400 },
    );
  }
}