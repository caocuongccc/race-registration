// ============================================
// PART 5: API - GET SHIRTS WITH STANDALONE PRICE
// ============================================
// app/api/events/[slug]/shirts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const slug = (await context.params).slug;

    const event = await prisma.event.findFirst({
      where: { id: slug },
      select: { id: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const shirts = await prisma.eventShirt.findMany({
      where: {
        eventId: event.id,
        isAvailable: true,
      },
      orderBy: [{ category: "asc" }, { type: "asc" }, { size: "asc" }],
      select: {
        id: true,
        category: true,
        type: true,
        size: true,
        price: true,
        standalonePrice: true, // NEW
        stockQuantity: true,
        soldQuantity: true,
        isAvailable: true,
      },
    });
    return NextResponse.json({ shirts });
  } catch (error) {
    console.error("Error fetching shirts:", error);
    return NextResponse.json(
      { error: "Failed to fetch shirts" },
      { status: 500 },
    );
  }
}
