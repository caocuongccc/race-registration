// app/api/mobile/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/mobile/search?q=...
 * Search registrations by BIB number, name, email, or phone
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 },
      );
    }

    const searchTerm = query.trim();

    // Search logic
    const results = await prisma.registration.findMany({
      where: {
        OR: [
          // Search by BIB number (exact or partial)
          {
            bibNumber: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          // Search by full name
          {
            fullName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          // Search by email
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          // Search by phone
          {
            phone: {
              contains: searchTerm,
            },
          },
        ],
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
          },
        },
      },
      orderBy: [
        // Prioritize paid registrations
        { paymentStatus: "desc" },
        // Then by BIB number
        { bibNumber: "asc" },
      ],
      take: 20, // Limit results
    });

    return NextResponse.json({
      results,
      count: results.length,
      query: searchTerm,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search registrations" },
      { status: 500 },
    );
  }
}
