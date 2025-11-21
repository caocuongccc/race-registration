// app/api/events/[slug]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await context.params).slug;

    // Get event
    const event = await prisma.event.findFirst({
      where: {
        slug: slug,
        isPublished: true,
      },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get images
    const images = await prisma.eventImage.findMany({
      where: { eventId: event.id },
      orderBy: [{ imageType: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        imageUrl: true,
        imageType: true,
        title: true,
        description: true,
      },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
