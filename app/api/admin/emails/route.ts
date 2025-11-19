// app/api/admin/emails/route.ts
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
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const whereClause: any = {};

    if (eventId && eventId !== "all") {
      whereClause.registration = {
        eventId: eventId,
      };
    }

    if (status && status !== "all") {
      whereClause.status = status;
    }

    if (type && type !== "all") {
      whereClause.emailType = type;
    }

    const logs = await prisma.emailLog.findMany({
      where: whereClause,
      include: {
        registration: {
          select: {
            fullName: true,
            email: true,
            bibNumber: true,
          },
        },
      },
      orderBy: {
        sentAt: "desc",
      },
      take: 100, // Limit to 100 most recent
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch email logs" },
      { status: 500 }
    );
  }
}
