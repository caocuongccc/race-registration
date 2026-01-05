// app/api/admin/import/[batchId]/pay-batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Generate BIB number for batch payment
 */
async function generateBibNumberForBatch(
  distanceId: string,
  providedBib?: string | null
): Promise<string> {
  // If BIB already provided in Excel, use it
  if (providedBib) {
    return providedBib;
  }

  // Otherwise, generate new BIB
  const distance = await prisma.distance.findUnique({
    where: { id: distanceId },
  });

  if (!distance) {
    throw new Error("Distance not found");
  }

  // Count paid registrations for this distance
  const paidCount = await prisma.registration.count({
    where: {
      distanceId: distanceId,
      paymentStatus: "PAID",
      bibNumber: {
        not: null,
      },
    },
  });

  // Generate BIB: prefix + zero-padded number
  const bibNumber = `${distance.bibPrefix}${String(paidCount + 1).padStart(3, "0")}`;

  return bibNumber;
}

/**
 * Pay all registrations in a batch
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> }
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
        { status: 400 }
      );
    }

    // Process payment for all registrations in batch
    let successCount = 0;
    const errors: any[] = [];

    for (const registration of batch.registrations) {
      try {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Generate or use existing BIB
          const bibNumber = await generateBibNumberForBatch(
            registration.distanceId,
            registration.bibNumber
          );

          // Update registration
          await tx.registration.update({
            where: { id: registration.id },
            data: {
              paymentStatus: "PAID",
              bibNumber: bibNumber,
              paymentDate: new Date(),
              notes: `Thanh toán hàng loạt từ batch import ${batch.fileName}`,
            },
          });

          // Create payment record
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
                paidAt: new Date().toISOString(),
              },
            },
          });
        });

        successCount++;
      } catch (error: any) {
        errors.push({
          registrationId: registration.id,
          fullName: registration.fullName,
          error: error.message,
        });
        console.error(
          `Failed to pay registration ${registration.id}:`,
          error.message
        );
      }
    }

    // Log the batch payment action
    console.log(
      `Batch payment completed: ${successCount}/${batch.registrations.length} succeeded`
    );

    return NextResponse.json({
      success: true,
      count: successCount,
      total: batch.registrations.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Batch payment error:", error);
    return NextResponse.json(
      { error: "Failed to process batch payment" },
      { status: 500 }
    );
  }
}
