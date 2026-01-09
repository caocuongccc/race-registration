// app/api/admin/registrations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    // ✅ Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // ✅ Filter params
    const searchQuery = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";
    const distanceFilter = searchParams.get("distance") || "";
    const sourceFilter = searchParams.get("source") || "";

    const whereClause: any = {};
    if (eventId && eventId !== "all") {
      whereClause.eventId = eventId;
    }

    // Search filter
    if (searchQuery) {
      whereClause.OR = [
        { fullName: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
        { phone: { contains: searchQuery } },
        { bibNumber: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (statusFilter) {
      whereClause.paymentStatus = statusFilter;
    }

    // Distance filter
    if (distanceFilter) {
      whereClause.distance = {
        name: distanceFilter,
      };
    }

    // Source filter
    if (sourceFilter) {
      whereClause.registrationSource = sourceFilter;
    }

    // ✅ Get total count for pagination
    const totalCount = await prisma.registration.count({
      where: whereClause,
    });

    const registrations = await prisma.registration.findMany({
      where: whereClause,
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
      orderBy: {
        registrationDate: "desc",
      },
      skip,
      take: limit,
    });

    // ✅ Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      registrations,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
