import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    await prisma.$transaction(async (tx) => {
      for (const [distanceId, count] of Object.entries(distanceCounts)) {
        const distance = await tx.distance.findUnique({
          where: { id: distanceId },
          select: { currentParticipants: true },
        });
        if (!distance) continue;

        await tx.distance.update({
          where: { id: distanceId },
          data: {
            currentParticipants: Math.max(
              0,
              distance.currentParticipants - count,
            ),
          },
        });
      }

      for (const [shirtId, count] of Object.entries(shirtCounts)) {
        const shirt = await tx.eventShirt.findUnique({
          where: { id: shirtId },
          select: { soldQuantity: true },
        });
        if (!shirt) continue;

        await tx.eventShirt.update({
          where: { id: shirtId },
          data: {
            soldQuantity: Math.max(0, shirt.soldQuantity - count),
          },
        });
      }

      await tx.registration.deleteMany({
        where: { importBatchId: batch.id },
      });

      await tx.importBatch.delete({
        where: { id: batch.id },
      });
    });

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
