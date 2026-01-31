// app/api/public/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public lookup endpoint - no authentication required
 * Masks sensitive information for privacy
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const eventId = searchParams.get("eventId");

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: "Vui lòng nhập ít nhất 3 ký tự để tìm kiếm" },
        { status: 400 },
      );
    }

    // Build where clause
    const whereClause: any = {
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    };

    // Filter by event if specified
    if (eventId && eventId !== "all") {
      whereClause.eventId = eventId;
    }

    // Only show paid or pending registrations (hide failed/cancelled)
    whereClause.paymentStatus = {
      in: ["PAID", "PENDING"],
    };

    // Find registrations
    const registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        distance: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        registrationDate: "desc",
      },
      take: 50, // Limit results
    });

    // Mask sensitive information
    const maskedResults = registrations.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      // Mask email: abc***d@gmail.com
      emailMasked: maskEmail(r.email),
      emailFull: r.email, // Still send full, client decides to show/hide
      // Mask phone: 0912***78
      phoneMasked: maskPhone(r.phone),
      phoneFull: r.phone,
      bibNumber: r.bibNumber,
      distance: r.distance.name,
      paymentStatus: r.paymentStatus,
      registrationDate: r.registrationDate,
      event: r.event.name,
      eventId: r.event.id,
    }));

    return NextResponse.json({
      success: true,
      results: maskedResults,
      count: maskedResults.length,
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json({ error: "Không thể tìm kiếm" }, { status: 500 });
  }
}

/**
 * Mask email for privacy
 * Example: nguyenvana@gmail.com → ng***a@gmail.com
 */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (name.length <= 3) {
    return `${name.charAt(0)}***@${domain}`;
  }
  const start = name.substring(0, 2);
  const end = name.slice(-1);
  return `${start}***${end}@${domain}`;
}

/**
 * Mask phone for privacy
 * Example: 0912345678 → 0912***78
 */
function maskPhone(phone: string): string {
  if (phone.length <= 6) {
    return phone.substring(0, 3) + "***";
  }
  const start = phone.substring(0, 4);
  const end = phone.slice(-2);
  return `${start}***${end}`;
}
