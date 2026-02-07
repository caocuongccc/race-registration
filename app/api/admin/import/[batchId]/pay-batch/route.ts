// app/api/admin/import/[batchId]/pay-batch/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateCheckinQRBuffer } from "@/lib/qr-inline";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";

/**
 * ✅ COMPLETE BATCH PAYMENT FLOW
 * - Generate BIB
 * - Generate QR check-in
 * - Send email confirmation
 * - Log everything
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = (await context.params).batchId;

    // Get batch with registrations
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        registrations: {
          where: {
            paymentStatus: "PENDING",
          },
          include: {
            distance: true,
            event: {
              include: {
                emailConfig: true, // ✅ NEW: Need email config
              },
            },
            shirt: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.registrations.length === 0) {
      return NextResponse.json(
        { error: "Không có đăng ký nào cần thanh toán" },
        { status: 400 },
      );
    }

    console.log(
      `💰 Starting batch payment for ${batch.registrations.length} registrations...`,
    );

    let successCount = 0;
    const errors: any[] = [];

    // ✅ Process each registration
    for (const registration of batch.registrations) {
      try {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // ✅ 1. Generate BIB number
          const bibNumber = await generateBibNumber(
            registration.id,
            registration.distanceId,
          );

          // ✅ 2. Update registration
          const updatedReg = await tx.registration.update({
            where: { id: registration.id },
            data: {
              paymentStatus: "PAID",
              bibNumber: bibNumber,
              paymentDate: new Date(),
              notes: registration.notes
                ? `${registration.notes}\nThanh toán batch: ${batch.fileName}`
                : `Thanh toán hàng loạt từ batch import ${batch.fileName}`,
            },
          });

          // ✅ 3. Create payment record
          await tx.payment.create({
            data: {
              registrationId: registration.id,
              amount: registration.totalAmount,
              status: "PAID",
              paymentMethod: "batch_import",
              webhookData: {
                batchId: batch.id,
                batchFileName: batch.fileName,
                paidBy: session.user.id,
                paidByName: session.user.name,
                paidAt: new Date().toISOString(),
              },
            },
          });

          console.log(
            `✅ Processed payment for ${registration.fullName} - BIB: ${bibNumber}`,
          );
        });

        // ✅ 4. Generate QR check-in (outside transaction - non-critical)
        try {
          const reg = await prisma.registration.findUnique({
            where: { id: registration.id },
          });

          if (reg && reg.bibNumber) {
            const qrBuffer = await generateCheckinQRBuffer(
              reg.id,
              reg.bibNumber,
              reg.fullName,
              reg.gender,
              reg.dob,
              reg.phone,
              reg.shirtCategory,
              reg.shirtType,
              reg.shirtSize,
            );

            // Convert buffer to base64 data URL
            const qrBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;

            await prisma.registration.update({
              where: { id: registration.id },
              data: { qrCheckinUrl: qrBase64 },
            });

            console.log(`✅ Generated QR for BIB ${reg.bibNumber}`);
          }
        } catch (qrError) {
          console.warn(
            `⚠️ QR generation failed for ${registration.fullName}:`,
            qrError,
          );
          // Continue - QR is not critical
        }

        // ✅ 5. Send email confirmation (outside transaction - non-critical)
        try {
          const fullReg = await prisma.registration.findUnique({
            where: { id: registration.id },
            include: {
              distance: true,
              event: true,
              shirt: true,
            },
          });

          if (fullReg) {
            const emailConfig = registration.event.emailConfig;
            const fromName = emailConfig?.fromName || process.env.FROM_NAME;
            const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;

            // Import email template
            const { PaymentConfirmedEmail } =
              await import("@/emails/payment-confirmed");

            const result = await sendEmailGmailFirst(
              {
                to: fullReg.email,
                subject: `Thanh toán thành công - Số BIB ${fullReg.bibNumber}`,
                react: PaymentConfirmedEmail({
                  registration: fullReg,
                  event: fullReg.event,
                }),
                fromName,
                fromEmail,
              },
              emailConfig?.id,
            );

            if (result.success) {
              // Log email sent
              await prisma.emailLog.create({
                data: {
                  registrationId: registration.id,
                  emailType: "PAYMENT_CONFIRMED",
                  subject: `Thanh toán thành công - Số BIB ${fullReg.bibNumber}`,
                  status: "SENT",
                  recipientEmail: fullReg.email,
                  emailProvider: result.provider,
                  bibNumber: fullReg.bibNumber,
                },
              });

              console.log(
                `✅ Email sent to ${fullReg.email} via ${result.provider}`,
              );
            } else {
              throw new Error(result.error || "Failed to send email");
            }
          }
        } catch (emailError: any) {
          console.warn(
            `⚠️ Email failed for ${registration.fullName}:`,
            emailError.message,
          );

          // Log email failure
          await prisma.emailLog.create({
            data: {
              registrationId: registration.id,
              emailType: "PAYMENT_CONFIRMED",
              subject: `Thanh toán thành công - Số BIB ${registration.bibNumber}`,
              status: "FAILED",
              errorMessage: emailError.message,
              recipientEmail: registration.email,
              bibNumber: registration.bibNumber,
            },
          });

          // Continue - Email failure shouldn't block payment
        }

        successCount++;
      } catch (error: any) {
        errors.push({
          registrationId: registration.id,
          fullName: registration.fullName,
          error: error.message,
        });
        console.error(
          `❌ Failed to process ${registration.fullName}:`,
          error.message,
        );
      }
    }

    console.log(
      `✅ Batch payment completed: ${successCount}/${batch.registrations.length} succeeded`,
    );

    return NextResponse.json({
      success: true,
      count: successCount,
      total: batch.registrations.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Đã xác nhận thanh toán cho ${successCount} VĐV. Email đang được gửi.`,
    });
  } catch (error) {
    console.error("Batch payment error:", error);
    return NextResponse.json(
      { error: "Failed to process batch payment" },
      { status: 500 },
    );
  }
}

async function generateBibNumber(
  registrationId: string,
  distanceId: string,
): Promise<string> {
  const distance = await prisma.distance.findUnique({
    where: { id: distanceId },
  });

  if (!distance) {
    throw new Error("Distance not found");
  }

  const paidCount = await prisma.registration.count({
    where: {
      distanceId: distanceId,
      paymentStatus: "PAID",
      bibNumber: {
        not: null,
      },
    },
  });

  const basePrefix = distance.bibPrefix;
  const MAX_PER_PREFIX = 999;

  // ✅ CASE 1: Numeric prefix (17, 57) → Auto increment
  if (/^\d+$/.test(basePrefix)) {
    const prefixIncrement = Math.floor(paidCount / MAX_PER_PREFIX);
    const numberInCurrentPrefix = (paidCount % MAX_PER_PREFIX) + 1;
    const numericPrefix = parseInt(basePrefix) + prefixIncrement;
    const finalPrefix = String(numericPrefix);
    const bibNumber = `${finalPrefix}${String(numberInCurrentPrefix).padStart(3, "0")}`;

    console.log(`📊 BIB (Numeric Prefix):
    - Base: ${basePrefix} → Current: ${finalPrefix}
    - Paid: ${paidCount} → BIB: ${bibNumber}
    `);

    return bibNumber;
  }

  // ✅ CASE 2: Alphanumeric prefix (5K, 10K) → Fixed range
  if (paidCount >= MAX_PER_PREFIX) {
    throw new Error(
      `❌ Đã hết BIB cho cự ly ${distance.name} (prefix: ${basePrefix}). ` +
        `Tối đa ${MAX_PER_PREFIX} VĐV. ` +
        `Hiện tại: ${paidCount} VĐV đã thanh toán.`,
    );
  }

  const bibNumber = `${basePrefix}${String(paidCount + 1).padStart(3, "0")}`;

  console.log(`📊 BIB (Alpha Prefix):
  - Prefix: ${basePrefix}
  - Paid: ${paidCount}/${MAX_PER_PREFIX}
  - BIB: ${bibNumber}
  `);

  return bibNumber;
}
