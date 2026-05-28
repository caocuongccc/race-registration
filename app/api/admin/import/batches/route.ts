// app/api/admin/import/batches/route.ts - WITH PAYMENT STATUS
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sortBibNumbers(bibNumbers: string[]) {
  return [...bibNumbers].sort((a, b) =>
    a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }),
  );
}

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
            bibNumber: true,
            distance: {
              select: {
                id: true,
                name: true,
                sortOrder: true,
              },
            },
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
      const bibRangesByDistance = Object.values(
        batch.registrations.reduce<
          Record<
            string,
            {
              distanceId: string;
              distanceName: string;
              sortOrder: number;
              bibNumbers: string[];
            }
          >
        >((acc, registration) => {
          if (
            registration.paymentStatus !== "PAID" ||
            !registration.bibNumber ||
            !registration.distance
          ) {
            return acc;
          }

          const distanceId = registration.distance.id;
          if (!acc[distanceId]) {
            acc[distanceId] = {
              distanceId,
              distanceName: registration.distance.name,
              sortOrder: registration.distance.sortOrder,
              bibNumbers: [],
            };
          }

          acc[distanceId].bibNumbers.push(registration.bibNumber);
          return acc;
        }, {}),
      )
        .map((item) => {
          const sortedBibNumbers = sortBibNumbers(item.bibNumbers);
          return {
            distanceId: item.distanceId,
            distanceName: item.distanceName,
            sortOrder: item.sortOrder,
            count: sortedBibNumbers.length,
            start: sortedBibNumbers[0] || null,
            end: sortedBibNumbers[sortedBibNumbers.length - 1] || null,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // Remove registrations from response to keep it clean
      const { registrations, ...batchData } = batch;

      return {
        ...batchData,
        paidCount,
        pendingCount,
        paymentProgress,
        bibRangesByDistance,
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
