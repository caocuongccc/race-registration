// app/api/admin/import/batches/route.ts - WITH PAYMENT STATUS
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const whereClause: any = {};
    if (eventId && eventId !== "all") {
      whereClause.eventId = eventId;
    }

    // ✅ Get batches with registrations to calculate payment status
    const batches = await prisma.importBatch.findMany({
      where: whereClause,
      include: {
        event: {
          select: { id: true, name: true },
        },
        uploadedByUser: {
          select: { name: true, email: true },
        },
        // ✅ Include registrations to calculate payment stats
        registrations: {
          select: {
            id: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    // ✅ Calculate payment stats for each batch
    const batchesWithStats = batches.map((batch) => {
      const paidCount = batch.registrations.filter(
        (r) => r.paymentStatus === "PAID",
      ).length;
      const pendingCount = batch.registrations.filter(
        (r) => r.paymentStatus === "PENDING",
      ).length;
      const paymentProgress =
        batch.successCount > 0 ? (paidCount / batch.successCount) * 100 : 0;

      // Remove registrations from response to keep it clean
      const { registrations, ...batchData } = batch;

      return {
        ...batchData,
        paidCount,
        pendingCount,
        paymentProgress,
      };
    });

    return NextResponse.json({ batches: batchesWithStats });
  } catch (error) {
    console.error("Error fetching import batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch import batches" },
      { status: 500 },
    );
  }
}
