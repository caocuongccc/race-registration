// app/api/admin/registrations/route.ts
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

    const registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        distance: {
          select: {
            name: true,
          },
        },
        event: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        registrationDate: "desc",
      },
    });

    return NextResponse.json({ registrations });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
