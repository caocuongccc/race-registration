// app/api/events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// app/api/events/route.ts
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        isPublished: true,
        status: {
          in: [
            "PUBLISHED",
            "REGISTRATION_OPEN",
            "REGISTRATION_CLOSED",
            "COMPLETED",
          ],
        },
      },
      include: {
        distances: {
          where: { isAvailable: true },
          select: {
            name: true,
            price: true,
            currentParticipants: true,
            maxParticipants: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { date: "asc" },
    });
    //const events = [];
    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        date: event.date,
        location: event.location,
        logoUrl: event.logoUrl,
        bannerUrl: event.bannerUrl,
        coverImageUrl: event.coverImageUrl, // NEW
        hasShirt: event.hasShirt,
        distances: event.distances,
        allowRegistration: event.allowRegistration, // NEW: Send to frontend
      })),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
