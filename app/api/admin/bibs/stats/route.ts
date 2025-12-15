// app/api/admin/bibs/stats/route.ts
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

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    // Total paid registrations
    const totalPaid = await prisma.registration.count({
      where: {
        eventId,
        paymentStatus: "PAID",
      },
    });

    // With BIB number
    const withBib = await prisma.registration.count({
      where: {
        eventId,
        paymentStatus: "PAID",
        bibNumber: { not: null },
      },
    });

    // BIB email sent
    const bibEmailSent = await prisma.emailLog.count({
      where: {
        emailType: "BIB_ANNOUNCEMENT",
        status: "SENT",
        registration: {
          eventId,
        },
      },
    });

    // Pending = have BIB but email not sent yet
    const pending = await prisma.registration.count({
      where: {
        eventId,
        paymentStatus: "PAID",
        bibNumber: { not: null },
        emailLogs: {
          none: {
            emailType: "BIB_ANNOUNCEMENT",
            status: "SENT",
          },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalPaid,
        withBib,
        bibEmailSent,
        pending,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
