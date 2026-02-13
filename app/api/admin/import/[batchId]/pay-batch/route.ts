import { generateBatchQRBuffer } from "@/lib/qr-batch";
import { sendBatchPaymentEmail } from "@/lib/email-batch";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateBibNumberHybrid } from "@/lib/bib-generator";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  const batchId = (await context.params).batchId;

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      registrations: {
        where: { paymentStatus: "PENDING" },
        include: { distance: true, event: true, shirt: true },
        orderBy: { bibNumber: "asc" },
      },
    },
  });

  if (!batch || batch.registrations.length === 0) {
    return NextResponse.json(
      { error: "No registrations to pay" },
      { status: 400 },
    );
  }

  let successCount = 0;
  const errors: any[] = [];
  const bibNumbers: string[] = [];

  // ✅ Process payments
  for (const registration of batch.registrations) {
    try {
      const bibNumber = await generateBibNumberHybrid(
        registration.id,
        registration.distanceId,
      );

      await prisma.registration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: "PAID",
          bibNumber,
          paymentDate: new Date(),
        },
      });

      bibNumbers.push(bibNumber);
      successCount++;
    } catch (error: any) {
      errors.push({ id: registration.id, error: error.message });
    }
  }

  // ✅ Sort BIB numbers and get range
  bibNumbers.sort();
  const bibRangeStart = bibNumbers[0];
  const bibRangeEnd = bibNumbers[bibNumbers.length - 1];

  // ✅ Generate Batch QR Code
  const qrData = {
    type: "batch",
    batchId: batch.id,
    bibRange: `${bibRangeStart} - ${bibRangeEnd}`,
    totalRegistrations: successCount,
    totalShirts: batch.totalShirts,
  };

  const qrBuffer = await generateBatchQRBuffer(JSON.stringify(qrData));
  const qrBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;

  // ✅ Update batch with BIB range and QR
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      bibRangeStart,
      bibRangeEnd,
      qrBatchUrl: qrBase64,
    },
  });

  // ✅ Send email to contact email
  if (batch.contactEmail) {
    try {
      await sendBatchPaymentEmail({
        batch: {
          ...batch,
          bibRangeStart,
          bibRangeEnd,
          qrBatchUrl: qrBase64,
          successCount,
        },
        contactEmail: batch.contactEmail,
      });

      console.log(`✅ Batch payment email sent to ${batch.contactEmail}`);
    } catch (emailError) {
      console.error("❌ Email send failed:", emailError);
    }
  }

  return NextResponse.json({
    success: true,
    count: successCount,
    total: batch.registrations.length,
    bibRange: `${bibRangeStart} - ${bibRangeEnd}`,
    totalShirts: batch.totalShirts,
    contactEmail: batch.contactEmail,
  });
}
