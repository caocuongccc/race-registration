// app/api/admin/emails/send-selected/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { BibAnnouncementEmail } from "@/emails/bib-announcement";
import { RacePackInfoEmail } from "@/emails/race-pack-info";
import { generateCheckinQRBuffer } from "@/lib/qr-inline";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { registrationIds, emailType } = await req.json();

    if (
      !registrationIds ||
      !Array.isArray(registrationIds) ||
      registrationIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Registration IDs required" },
        { status: 400 },
      );
    }

    console.log(
      `📧 Sending ${emailType} to ${registrationIds.length} registrations...`,
    );

    // Get registrations with full data
    const registrations = await prisma.registration.findMany({
      where: {
        id: { in: registrationIds },
        paymentStatus: "PAID",
      },
      include: {
        event: true,
        distance: true,
        shirt: true,
      },
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "No valid registrations found" },
        { status: 400 },
      );
    }

    let sent = 0;
    let failed = 0;

    // Send emails one by one (to avoid rate limits)
    for (const registration of registrations) {
      try {
        let emailReact;
        let subject;
        let attachments: any[] = [];

        switch (emailType) {
          case "BIB_ANNOUNCEMENT":
            emailReact = BibAnnouncementEmail({ registration });
            subject = `Thông báo số BIB - ${registration.event.name}`;
            // ✅ GEN QR CHECK-IN INLINE (không upload)
            if (registration.bibNumber) {
              try {
                const qrBuffer = await generateCheckinQRBuffer(
                  registration.id,
                  registration.bibNumber,
                  registration.fullName,
                  registration.gender,
                  registration.dob,
                  registration.phone,
                  registration.shirtCategory,
                  registration.shirtType,
                  registration.shirtSize,
                );

                attachments.push({
                  filename: `qr-checkin-${registration.bibNumber}.png`,
                  content: qrBuffer,
                  contentType: "image/png",
                  cid: `qr-checkin-${registration.bibNumber}`, // ✅ Content-ID for inline display
                });

                console.log(
                  `✅ Generated QR for BIB ${registration.bibNumber}`,
                );
              } catch (qrError) {
                console.warn(
                  `⚠️ Failed to generate QR for ${registration.bibNumber}:`,
                  qrError,
                );
                // Continue sending email without QR
              }
            }
            break;

          case "RACE_PACK_INFO":
            emailReact = RacePackInfoEmail({ registration });
            subject = `Thông tin quan trọng - ${registration.event.name}`;
            break;

          case "REMINDER":
            emailReact = RacePackInfoEmail({ registration }); // Can create separate reminder template
            subject = `Nhắc nhở - ${registration.event.name}`;
            break;

          default:
            throw new Error("Invalid email type");
        }

        // Send email with Gmail-first fallback
        const result = await sendEmailGmailFirst({
          to: registration.email,
          subject,
          react: emailReact,
          attachments: attachments.length > 0 ? attachments : undefined,
          fromName: registration.event.name || process.env.FROM_NAME,
          fromEmail: process.env.FROM_EMAIL,
        });

        if (result.success) {
          // Log success
          await prisma.emailLog.create({
            data: {
              registrationId: registration.id,
              emailType: emailType,
              subject: subject,
              status: "SENT",
              recipientEmail: registration.email,
              emailProvider: result.provider,
            },
          });

          sent++;
          console.log(
            `✅ Sent to ${registration.email} via ${result.provider}`,
          );
        } else {
          throw new Error(result.error || "Failed to send");
        }

        // Small delay between emails to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(
          `❌ Failed to send to ${registration.email}:`,
          error.message,
        );

        // Log failure
        await prisma.emailLog.create({
          data: {
            registrationId: registration.id,
            emailType: emailType,
            subject: `${emailType} - ${registration.event.name}`,
            status: "FAILED",
            errorMessage: error.message,
            recipientEmail: registration.email,
            emailProvider: "gmail_first",
          },
        });

        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: registrations.length,
    });
  } catch (error) {
    console.error("Send selected emails error:", error);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 },
    );
  }
}
