// app/api/admin/import/[batchId]/pay-batch/route.ts
// UPDATED: Generate QR inline for each VĐV, no ImgBB, no DB storage

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBibNumberHybrid } from "@/lib/bib-generator";
import { sendRegistrationConfirmationEmail } from "@/lib/email-individual-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = (await context.params).batchId;

    // Get batch with all pending registrations
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        event: true,
        registrations: {
          where: { paymentStatus: "PENDING" },
          include: {
            distance: true,
            shirt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!batch || batch.registrations.length === 0) {
      return NextResponse.json(
        { error: "No pending registrations found" },
        { status: 400 },
      );
    }

    console.log(`\n📦 Starting batch payment for ${batch.fileName}`);
    console.log(`   Total registrations: ${batch.registrations.length}`);

    let successCount = 0;
    let emailSuccessCount = 0;
    const errors: any[] = [];
    const bibNumbers: string[] = [];

    // ✅ Process each registration
    for (const registration of batch.registrations) {
      try {
        console.log(`\n🔄 Processing: ${registration.fullName}`);

        // 1. Generate BIB
        const bibNumber = await generateBibNumberHybrid(
          registration.id,
          registration.distanceId,
          registration.distanceGoalId,
        );
        console.log(`   ✅ BIB: ${bibNumber}`);

        // 2. ✅ Update registration - NO qrCheckinUrl saved
        await prisma.registration.update({
          where: { id: registration.id },
          data: {
            paymentStatus: "PAID",
            bibNumber,
            // ❌ NO qrCheckinUrl - QR will be generated in email service
            paymentDate: new Date(),
          },
        });

        bibNumbers.push(bibNumber);
        successCount++;
        console.log(`   ✅ Updated to PAID`);

        // 3. ✅ Send individual email
        // QR will be generated inside sendRegistrationConfirmationEmail
        if (registration.email) {
          try {
            console.log(`   📧 Sending email...`);

            await sendRegistrationConfirmationEmail({
              registration: {
                ...registration,
                bibNumber,
                // No qrCode here - email service will generate it
              },
              event: batch.event,
            });

            emailSuccessCount++;
            console.log(`   ✅ Email sent to ${registration.email}`);
          } catch (emailError: any) {
            console.error(`   ❌ Email failed: ${emailError.message}`);
            errors.push({
              registrationId: registration.id,
              email: registration.email,
              error: `Email failed: ${emailError.message}`,
            });
          }
        } else {
          console.warn(`   ⚠️ No email address`);
          errors.push({
            registrationId: registration.id,
            error: "No email address",
          });
        }
      } catch (error: any) {
        console.error(`   ❌ Processing failed: ${error.message}`);
        errors.push({
          registrationId: registration.id,
          email: registration.email,
          error: error.message,
        });
      }
    }

    // ✅ Update batch with BIB range
    if (bibNumbers.length > 0) {
      bibNumbers.sort();
      const bibRangeStart = bibNumbers[0];
      const bibRangeEnd = bibNumbers[bibNumbers.length - 1];

      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          bibRangeStart,
          bibRangeEnd,
        },
      });

      console.log(`\n📊 BIB range: ${bibRangeStart} - ${bibRangeEnd}`);
    }

    const summary = {
      totalRegistrations: batch.registrations.length,
      paidCount: successCount,
      emailsSent: emailSuccessCount,
      emailsFailed: successCount - emailSuccessCount,
      bibRange:
        bibNumbers.length > 0
          ? `${bibNumbers[0]} - ${bibNumbers[bibNumbers.length - 1]}`
          : null,
    };

    console.log(`\n✅ Batch payment complete:`);
    console.log(`   Total: ${summary.totalRegistrations}`);
    console.log(`   Paid: ${summary.paidCount}`);
    console.log(`   Emails sent: ${summary.emailsSent}`);
    console.log(`   Emails failed: ${summary.emailsFailed}`);

    return NextResponse.json({
      success: true,
      summary,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error: any) {
    console.error("\n❌ Batch payment error:", error);
    return NextResponse.json(
      { error: "Batch payment failed", details: error.message },
      { status: 500 },
    );
  }
}
