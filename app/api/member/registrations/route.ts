// app/api/member/registrations/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's registrations
    const registrations = await prisma.registration.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        distance: {
          select: {
            name: true,
          },
        },
        event: {
          select: {
            name: true,
            date: true,
            location: true,
          },
        },
      },
      orderBy: {
        registrationDate: "desc",
      },
    });

    return NextResponse.json({ registrations });
  } catch (error) {
    console.error("Error fetching member registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
