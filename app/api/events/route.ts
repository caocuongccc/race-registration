// app/api/events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        isPublished: true,
        // Accept both PUBLISHED and REGISTRATION_OPEN status
        status: {
          in: ["PUBLISHED", "REGISTRATION_OPEN"],
        },
      },
      include: {
        distances: {
          where: {
            isAvailable: true,
          },
          select: {
            name: true,
            price: true,
            currentParticipants: true,
            maxParticipants: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

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
        hasShirt: event.hasShirt,
        distances: event.distances,
      })),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
