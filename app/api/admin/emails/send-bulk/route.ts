// app/api/admin/emails/send-bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { RacePackInfoEmail } from "@/emails/race-pack-info";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId, emailType } = await req.json();

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 },
      );
    }

    // Get all paid registrations for the event
    const registrations = await prisma.registration.findMany({
      where: {
        eventId: eventId,
        paymentStatus: "PAID",
      },
      include: {
        event: true,
        distance: true,
        shirt: true,
      },
    });

    if (registrations.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No paid registrations found",
      });
    }

    let sent = 0;
    let failed = 0;

    // Send emails in batches of 100
    const batchSize = 100;
    for (let i = 0; i < registrations.length; i += batchSize) {
      const batch = registrations.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (registration: any) => {
          try {
            await resend.emails.send({
              from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
              to: registration.email,
              subject: `Thông tin quan trọng - ${registration.event.name}`,
              react: RacePackInfoEmail({ registration }),
            });

            // Log email sent
            await prisma.emailLog.create({
              data: {
                registrationId: registration.id,
                emailType: emailType || "RACE_PACK_INFO",
                subject: `Thông tin quan trọng - ${registration.event.name}`,
                status: "SENT",
                recipientEmail: registration.email,
                emailProvider: "resend",
              },
            });
            sent++;
          } catch (error) {
            console.error(
              `Failed to send email to ${registration.email}:`,
              error,
            );

            // Log email failure
            await prisma.emailLog.create({
              data: {
                registrationId: registration.id,
                emailType: emailType || "RACE_PACK_INFO",
                subject: `Thông tin quan trọng - ${registration.event.name}`,
                status: "FAILED",
                errorMessage: (error as Error).message,
                recipientEmail: registration.email,
                emailProvider: "resend",
              },
            });

            failed++;
          }
        }),
      );

      // Wait 1 second between batches to avoid rate limiting
      if (i + batchSize < registrations.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: registrations.length,
    });
  } catch (error) {
    console.error("Bulk email error:", error);
    return NextResponse.json(
      { error: "Failed to send bulk emails" },
      { status: 500 },
    );
  }
}
