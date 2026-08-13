import { prisma } from "@/lib/prisma";
import { generateQRBuffer } from "@/lib/qr-inline";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { KidRunRegistrationEmail } from "@/emails/kid-run-registration";
import { generateKidRunBibAttachments } from "@/lib/kid-run-bib-image";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://dangkygiaichay.vercel.app";

async function loadApplication(applicationId) {
  return prisma.kidRunFamilyApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      campaign: true,
      participants: {
        where: { bibStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: { category: true, shirts: true },
      },
      shirts: true,
    },
  });
}

async function logResult(applicationId, type, email, subject, result) {
  await prisma.kidRunEmailLog.create({
    data: {
      applicationId,
      type,
      recipientEmail: email,
      subject,
      status: result.success ? "SENT" : "FAILED",
      provider: result.provider,
      errorMessage: result.error,
      sentAt: result.success ? new Date() : null,
    },
  });
}

export async function sendKidRunRegistrationEmail(
  applicationId: string,
  secretCode?: string,
  payment?: any,
  existingBibAttachments?: any[],
  recipientOverride?: string,
) {
  const application = await loadApplication(applicationId);
  const hasBib =
    application.participants.length > 0 &&
    application.participants.every((participant) => participant.bibNumber);
  const qrCode = hasBib
    ? `data:image/png;base64,${(await generateQRBuffer(`${appUrl}/admin/dashboard/kid-run/checkin/${application.bibQrToken}`)).toString("base64")}`
    : undefined;
  const bibAttachments =
    existingBibAttachments ??
    (hasBib ? await generateKidRunBibAttachments(application.participants) : []);
  const subject = `Đã nhận đăng ký Mid-Autumn Kids Runs - ${application.campaign.name} - ${application.publicCode}`;
  const result = await sendEmailGmailFirst({
    to: recipientOverride || application.email,
    subject,
    react: KidRunRegistrationEmail({
      application,
      campaign: application.campaign,
      secretCode,
      payment,
    }),
    fromName: application.campaign.name,
    fromEmail: application.campaign.contactEmail || process.env.FROM_EMAIL,
    qrCode,
    attachments: bibAttachments,
  });
  await logResult(
    applicationId,
    "REGISTRATION_CONFIRMED",
    recipientOverride || application.email,
    subject,
    result,
  );
  if (!result.success)
    throw new Error(result.error || "Không gửi được email Kid Run");
}

export async function sendKidRunBibEmail(applicationId: string) {
  const application = await loadApplication(applicationId);
  if (
    !application.participants.length ||
    application.participants.some((participant) => !participant.bibNumber)
  )
    throw new Error("Hồ sơ chưa được cấp đủ BIB");
  const subject = `Thông báo BIB - ${application.campaign.name} - ${application.publicCode}`;
  const qrBuffer = await generateQRBuffer(
    `${appUrl}/admin/dashboard/kid-run/checkin/${application.bibQrToken}`,
  );
  const qrCode = `data:image/png;base64,${qrBuffer.toString("base64")}`;
  const bibAttachments = await generateKidRunBibAttachments(
    application.participants,
  );
  const result = await sendEmailGmailFirst({
    to: application.email,
    subject,
    react: KidRunRegistrationEmail({
      application,
      campaign: application.campaign,
    }),
    fromName: application.campaign.name,
    fromEmail: application.campaign.contactEmail || process.env.FROM_EMAIL,
    qrCode,
    attachments: bibAttachments,
  });
  await logResult(
    applicationId,
    "BIB_ANNOUNCEMENT",
    application.email,
    subject,
    result,
  );
  if (!result.success)
    throw new Error(result.error || "Không gửi được email BIB Kid Run");
}

export async function sendKidRunShirtPaymentEmail(applicationId: string) {
  const application = await loadApplication(applicationId);
  const subject = `Đã nhận thanh toán áo - ${application.campaign.name} - ${application.publicCode}`;
  const result = await sendEmailGmailFirst({
    to: application.email,
    subject,
    react: KidRunRegistrationEmail({
      application,
      campaign: application.campaign,
      paid: true,
    }),
    fromName: application.campaign.name,
    fromEmail: application.campaign.contactEmail || process.env.FROM_EMAIL,
  });
  await logResult(
    applicationId,
    "SHIRT_PAYMENT_CONFIRMED",
    application.email,
    subject,
    result,
  );
  if (!result.success)
    throw new Error(result.error || "Không gửi được email xác nhận áo");
}
