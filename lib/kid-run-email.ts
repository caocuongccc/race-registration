import { prisma } from "@/lib/prisma";
import { generateQRBuffer } from "@/lib/qr-inline";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { KidRunRegistrationEmail } from "@/emails/kid-run-registration";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dangkygiaichay.vercel.app";

export async function sendKidRunRegistrationEmail(applicationId: string, secretCode?: string) {
  const application = await prisma.kidRunFamilyApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      campaign: true,
      participants: { orderBy: { createdAt: "asc" }, include: { category: true, shirts: true } },
      shirts: true,
    },
  });
  const subject = `Xác nhận Kid Run - ${application.campaign.name} - ${application.publicCode}`;
  const qrBuffer = await generateQRBuffer(`${appUrl}/admin/dashboard/kid-run/checkin/${application.bibQrToken}`);
  const qrCode = `data:image/png;base64,${qrBuffer.toString("base64")}`;
  const result = await sendEmailGmailFirst({
    to: application.email,
    subject,
    react: KidRunRegistrationEmail({ application, campaign: application.campaign, secretCode }),
    fromName: application.campaign.name,
    fromEmail: application.campaign.contactEmail || process.env.FROM_EMAIL,
    qrCode,
  });
  await prisma.kidRunEmailLog.create({
    data: {
      applicationId,
      type: "REGISTRATION_CONFIRMED",
      recipientEmail: application.email,
      subject,
      status: result.success ? "SENT" : "FAILED",
      provider: result.provider,
      errorMessage: result.error,
      sentAt: result.success ? new Date() : null,
    },
  });
  if (!result.success) throw new Error(result.error || "Không gửi được email Kid Run");
}

export async function sendKidRunShirtPaymentEmail(applicationId: string) {
  const application = await prisma.kidRunFamilyApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      campaign: true,
      participants: { orderBy: { createdAt: "asc" }, include: { category: true, shirts: true } },
      shirts: true,
    },
  });
  const subject = `Đã nhận thanh toán áo - ${application.campaign.name} - ${application.publicCode}`;
  const result = await sendEmailGmailFirst({
    to: application.email,
    subject,
    react: KidRunRegistrationEmail({ application, campaign: application.campaign, paid: true }),
    fromName: application.campaign.name,
    fromEmail: application.campaign.contactEmail || process.env.FROM_EMAIL,
  });
  await prisma.kidRunEmailLog.create({
    data: {
      applicationId,
      type: "SHIRT_PAYMENT_CONFIRMED",
      recipientEmail: application.email,
      subject,
      status: result.success ? "SENT" : "FAILED",
      provider: result.provider,
      errorMessage: result.error,
      sentAt: result.success ? new Date() : null,
    },
  });
  if (!result.success) throw new Error(result.error || "Không gửi được email xác nhận áo");
}