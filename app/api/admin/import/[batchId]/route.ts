import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function countById(items: Array<{ id: string | null }>) {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item.id) return acc;
    acc[item.id] = (acc[item.id] || 0) + 1;
    return acc;
  }, {});
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = (await context.params).batchId;
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        registrations: {
          select: {
            id: true,
            distanceId: true,
            shirtId: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const paidCount = batch.registrations.filter(
      (registration) => registration.paymentStatus === "PAID",
    ).length;

    if (paidCount > 0) {
      return NextResponse.json(
        {
          error:
            "Batch này đã có VĐV thanh toán/tạo BIB, không thể xóa tự động.",
        },
        { status: 400 },
      );
    }

    const distanceCounts = countById(
      batch.registrations.map((registration) => ({
        id: registration.distanceId,
      })),
    );
    const shirtCounts = countById(
      batch.registrations.map((registration) => ({
        id: registration.shirtId,
      })),
    );

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const [distanceId, count] of Object.entries(distanceCounts)) {
      operations.push(prisma.$executeRaw`
        UPDATE "distances"
        SET "currentParticipants" = GREATEST("currentParticipants" - ${count}, 0)
        WHERE "id" = ${distanceId}
      `);
    }

    for (const [shirtId, count] of Object.entries(shirtCounts)) {
      operations.push(prisma.$executeRaw`
        UPDATE "event_shirts"
        SET "soldQuantity" = GREATEST("soldQuantity" - ${count}, 0)
        WHERE "id" = ${shirtId}
      `);
    }

    operations.push(
      prisma.registration.deleteMany({
        where: { importBatchId: batch.id },
      }),
    );

    operations.push(
      prisma.importBatch.delete({
        where: { id: batch.id },
      }),
    );

    await prisma.$transaction(operations);

    return NextResponse.json({
      success: true,
      deletedRegistrations: batch.registrations.length,
      restoredShirts: Object.values(shirtCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    });
  } catch (error: any) {
    console.error("Delete import batch error:", error);
    return NextResponse.json(
      { error: "Failed to delete import batch", details: error.message },
      { status: 500 },
    );
  }
}
