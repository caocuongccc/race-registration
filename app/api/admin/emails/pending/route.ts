// app/api/admin/emails/pending/route.ts
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
    const hasBib = searchParams.get("hasBib") === "true";
    const bibEmailNotSent = searchParams.get("bibEmailNotSent") === "true";

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    // Build where clause
    const whereClause: any = {
      eventId,
      paymentStatus: "PAID",
    };

    if (hasBib) {
      whereClause.bibNumber = { not: null };
    }

    // Find registrations
    let registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        distance: {
          select: { name: true },
        },
        event: {
          select: { name: true },
        },
        emailLogs: {
          where: {
            emailType: "BIB_ANNOUNCEMENT",
            status: "SENT",
          },
          select: { id: true },
        },
      },
      orderBy: {
        bibNumber: "asc",
      },
    });

    // Filter out those who already received BIB email
    if (bibEmailNotSent) {
      registrations = registrations.filter((r) => r.emailLogs.length === 0);
    }

    // Remove emailLogs from response
    const cleanRegistrations = registrations.map(
      ({ emailLogs, ...rest }) => rest
    );

    return NextResponse.json({
      registrations: cleanRegistrations,
      total: cleanRegistrations.length,
    });
  } catch (error) {
    console.error("Error fetching pending emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending emails" },
      { status: 500 }
    );
  }
}
