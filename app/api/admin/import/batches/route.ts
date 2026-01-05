// app/api/admin/import/batches/route.ts
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

    const batches = await prisma.importBatch.findMany({
      where: whereClause,
      include: {
        event: {
          select: { name: true },
        },
        uploadedByUser: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent
    });

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("Error fetching import batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch import batches" },
      { status: 500 }
    );
  }
}
