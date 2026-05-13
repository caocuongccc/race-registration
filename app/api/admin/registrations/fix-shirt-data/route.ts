// app/api/admin/registrations/fix-shirt-data/route.ts
// GET: List registrations có shirtId nhưng shirtSize = null
// POST: Update shirtCategory/shirtType/shirtSize và gửi lại email + QR

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPaymentConfirmationEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { generateCheckinQRBuffer } from "@/lib/qr-inline";

// GET: Tìm danh sách bị lỗi
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;

    const registrations = await prisma.registration.findMany({
      where: {
        shirtId: { not: null },
        shirtSize: null,
        paymentStatus: "PAID",
        ...(eventId ? { eventId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        bibNumber: true,
        paymentDate: true,
        shirtId: true,
        shirtFee: true,
        shirtCategory: true,
        shirtType: true,
        shirtSize: true,
        shirt: {
          select: {
            id: true,
            category: true,
            type: true,
            size: true,
            price: true,
          },
        },
        distance: { select: { name: true } },
        event: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ registrations, total: registrations.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Fix + resend email
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { registrationIds } = await req.json();
    if (!registrationIds?.length) {
      return NextResponse.json({ error: "Cần truyền danh sách registrationIds" }, { status: 400 });
    }

    const registrations = await prisma.registration.findMany({
      where: {
        id: { in: registrationIds },
        shirtId: { not: null },
        paymentStatus: "PAID",
      },
      include: {
        shirt: true,
        event: { include: { emailConfig: true } },
        distance: true,
      },
    });

    let fixed = 0;
    let failed = 0;
    const results: { id: string; fullName: string; status: "fixed" | "failed"; error?: string }[] = [];

    for (const reg of registrations) {
      try {
        if (!reg.shirt) {
          throw new Error("Không tìm thấy thông tin áo (shirtId không hợp lệ)");
        }

        // 1. Cập nhật DB
        const updated = await prisma.registration.update({
          where: { id: reg.id },
          data: {
            shirtCategory: reg.shirt.category,
            shirtType: reg.shirt.type,
            shirtSize: reg.shirt.size,
          },
          include: {
            shirt: true,
            event: { include: { emailConfig: true } },
            distance: true,
          },
        });

        // 2. Gen QR mới
        let qrCode: string | undefined;
        try {
          const qrBuffer = await generateCheckinQRBuffer(
            updated.id,
            updated.bibNumber || "",
            updated.fullName,
            updated.gender,
            updated.dob,
            updated.phone,
            updated.shirtCategory,
            updated.shirtType,
            updated.shirtSize,
          );
          qrCode = `data:image/png;base64,${qrBuffer.toString("base64")}`;
        } catch (qrErr) {
          console.warn(`⚠️ QR gen failed for ${updated.bibNumber}:`, qrErr);
        }

        // 3. Gửi email với thông tin áo đã được cập nhật
        await sendPaymentConfirmationEmailGmailFirst({
          registration: updated,
          event: updated.event,
          qrCode,
        });

        // 4. Log
        await prisma.emailLog.create({
          data: {
            registrationId: reg.id,
            emailType: "PAYMENT_CONFIRMED",
            subject: `[Cập nhật áo] ${reg.event.name} - BIB ${reg.bibNumber}`,
            status: "SENT",
            recipientEmail: reg.email,
            emailProvider: "GMAIL_FIRST",
            bibNumber: reg.bibNumber,
          },
        });

        fixed++;
        results.push({ id: reg.id, fullName: reg.fullName, status: "fixed" });
        console.log(`✅ Fixed shirt + resent email: ${reg.fullName} (${reg.email}) → ${reg.shirt.category}/${reg.shirt.size}`);

        // Rate limit
        await new Promise((r) => setTimeout(r, 800));
      } catch (err: any) {
        console.error(`❌ Failed for ${reg.email}:`, err.message);
        failed++;
        results.push({ id: reg.id, fullName: reg.fullName, status: "failed", error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      failed,
      total: registrations.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
