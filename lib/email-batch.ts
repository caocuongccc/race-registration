import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { BatchPaymentConfirmedEmail } from "@/emails/batch-payment-confirmed";
import { prisma } from "@/lib/prisma";

export async function sendBatchPaymentEmail(data: {
  batch: any;
  contactEmail: string;
}) {
  const { batch, contactEmail } = data;

  // Get event info
  const batchWithEvent = await prisma.importBatch.findUnique({
    where: { id: batch.id },
    include: { event: true },
  });

  if (!batchWithEvent) {
    throw new Error("Batch not found");
  }

  const result = await sendEmailGmailFirst({
    to: contactEmail,
    subject: `Xác nhận thanh toán hàng loạt - ${batch.successCount} VĐV - ${batchWithEvent.event.name}`,
    react: BatchPaymentConfirmedEmail({
      batch: {
        fileName: batch.fileName,
        bibRangeStart: batch.bibRangeStart,
        bibRangeEnd: batch.bibRangeEnd,
        successCount: batch.successCount,
        totalShirts: batch.totalShirts,
        qrBatchUrl: batch.qrBatchUrl,
      },
      event: batchWithEvent.event,
    }),
    fromName: batchWithEvent.event.name,
    fromEmail: process.env.FROM_EMAIL,
  });

  if (!result.success) {
    throw new Error(`Email send failed: ${result.error}`);
  }

  return result;
}
