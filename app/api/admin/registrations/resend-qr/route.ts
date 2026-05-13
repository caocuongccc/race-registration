// app/api/admin/registrations/resend-qr/route.ts
// Gửi lại email QR check-in sau thanh toán cho các đơn bị lỗi

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { registrationIds } = await req.json();

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return NextResponse.json({ error: "Cần truyền danh sách registrationIds" }, { status: 400 });
    }

    if (registrationIds.length > 50) {
      return NextResponse.json({ error: "Tối đa 50 đơn mỗi lần gửi" }, { status: 400 });
    }

    // Lấy đơn đăng ký đã thanh toán
    const registrations = await prisma.registration.findMany({
      where: {
        id: { in: registrationIds },
        paymentStatus: "PAID",
      },
      include: {
        event: {
          include: {
            emailConfig: true,
          },
        },
        distance: true,
      },
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn đã thanh toán nào trong danh sách" },
        { status: 400 },
      );
    }

    let sent = 0;
    let failed = 0;
    const results: { id: string; email: string; status: "sent" | "failed"; error?: string }[] = [];

    for (const reg of registrations) {
      try {
        const emailConfig = reg.event.emailConfig;
        const fromName = emailConfig?.fromName || process.env.FROM_NAME;
        const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;

        // Build subject
        const subject =
          emailConfig?.subjectPaymentConfirmed?.replace("{{bibNumber}}", reg.bibNumber || "") ||
          `Mã QR Check-in - Số BIB ${reg.bibNumber} - ${reg.event.name}`;

        // Import email template
        const { PaymentConfirmedEmail } = await import("@/emails/payment-confirmed");
        const emailReact = PaymentConfirmedEmail({ registration: reg, event: reg.event });

        // Chuẩn bị QR attachment nếu có
        const allAttachments: any[] = [];

        if (reg.qrCheckinUrl && reg.qrCheckinUrl.startsWith("data:image/png;base64,")) {
          // QR lưu dưới dạng base64 data URL
          const base64Data = reg.qrCheckinUrl.split("base64,")[1];
          allAttachments.push({
            filename: `qr-checkin-${reg.bibNumber || reg.id}.png`,
            content: base64Data,
            encoding: "base64",
            cid: "qrcheckin",
          });
        } else {
          // Generate QR mới bằng qr-inline
          try {
            const { generateCheckinQRBuffer } = await import("@/lib/qr-inline");
            const qrBuffer = await generateCheckinQRBuffer(
              reg.id,
              reg.bibNumber || "",
              reg.fullName,
              reg.gender,
              reg.dob,
              reg.phone,
              reg.shirtCategory,
              reg.shirtType,
              reg.shirtSize,
            );
            allAttachments.push({
              filename: `qr-checkin-${reg.bibNumber || reg.id}.png`,
              content: qrBuffer,
              contentType: "image/png",
              cid: "qrcheckin",
            });
          } catch (qrErr: any) {
            console.warn(`⚠️ Không thể gen QR cho BIB ${reg.bibNumber}:`, qrErr.message);
            // Vẫn gửi email không có QR đính kèm
          }
        }

        const result = await sendEmailGmailFirst(
          {
            to: reg.email,
            subject,
            react: emailReact,
            attachments: allAttachments,
            fromName,
            fromEmail,
          },
          emailConfig?.id,
        );

        if (result.success) {
          // Log vào emailLog
          await prisma.emailLog.create({
            data: {
              registrationId: reg.id,
              emailType: "PAYMENT_CONFIRMED",
              subject,
              status: "SENT",
              recipientEmail: reg.email,
              emailProvider: result.provider,
              bibNumber: reg.bibNumber,
            },
          });

          sent++;
          results.push({ id: reg.id, email: reg.email, status: "sent" });
          console.log(`✅ Resend QR → ${reg.email} (BIB: ${reg.bibNumber}) via ${result.provider}`);
        } else {
          throw new Error(result.error || "Gửi thất bại");
        }

        // Tránh spam rate limit
        await new Promise((r) => setTimeout(r, 800));
      } catch (err: any) {
        console.error(`❌ Resend QR failed for ${reg.email}:`, err.message);

        await prisma.emailLog.create({
          data: {
            registrationId: reg.id,
            emailType: "PAYMENT_CONFIRMED",
            subject: `[Resend QR] ${reg.event.name}`,
            status: "FAILED",
            errorMessage: err.message,
            recipientEmail: reg.email,
            emailProvider: "resend_qr",
            bibNumber: reg.bibNumber,
          },
        });

        failed++;
        results.push({ id: reg.id, email: reg.email, status: "failed", error: err.message });
      }
    }

    return NextResponse.json({ success: true, sent, failed, total: registrations.length, results });
  } catch (error: any) {
    console.error("Resend QR error:", error);
    return NextResponse.json({ error: "Lỗi server: " + error.message }, { status: 500 });
  }
}

// GET: Tìm kiếm đơn đăng ký để hiển thị danh sách
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const eventId = searchParams.get("eventId") || undefined;

    if (!q && !eventId) {
      return NextResponse.json({ registrations: [] });
    }

    const registrations = await prisma.registration.findMany({
      where: {
        paymentStatus: "PAID",
        ...(eventId ? { eventId } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { fullName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { bibNumber: { contains: q } },
                { shortCode: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        bibNumber: true,
        shortCode: true,
        paymentStatus: true,
        registrationDate: true,
        paymentDate: true,
        shirtSize: true,
        event: { select: { id: true, name: true } },
        distance: { select: { name: true } },
        emailLogs: {
          where: { emailType: "PAYMENT_CONFIRMED" },
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { sentAt: true, status: true, emailProvider: true },
        },
      },
      orderBy: { paymentDate: "desc" },
      take: 30,
    });

    return NextResponse.json({ registrations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
