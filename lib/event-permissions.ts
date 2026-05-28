// ============================================
// PART 2: Permission Helper Functions
// ============================================
// lib/event-permissions.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EventPermission = "view" | "edit" | "admin" | "none";

/**
 * Get current user session
 */
export async function getUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  // Returns: { id, email, name, role }
  return session.user as { id: string; email?: string | null; name?: string | null; role: string };
}

/**
 * Check if user has access to event
 */
export async function checkEventAccess(
  eventId: string,
  userId: string,
  userRole?: string,
): Promise<EventPermission> {
  // ✅ ADMIN has full access to ALL events
  if (userRole === "ADMIN") {
    return "admin";
  }

  // Check if user is creator
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      createdById: userId,
    },
  });

  if (event) {
    return "admin"; // Creator has full admin rights
  }

  // Check if user is assigned to event
  const assignment = await prisma.eventUser.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
  });

  if (!assignment) {
    return "none";
  }

  // Map role to permission
  switch (assignment.role) {
    case "ADMIN":
      return "admin";
    case "EDITOR":
      return "edit";
    case "VIEWER":
      return "view";
    default:
      return "none";
  }
}

/**
 * Require specific permission level
 */
export async function requireEventPermission(
  eventId: string,
  userId: string,
  requiredPermission: "view" | "edit" | "admin",
  userRole?: string,
): Promise<void> {
  const permission = await checkEventAccess(eventId, userId, userRole);

  const permissionLevels = {
    none: 0,
    view: 1,
    edit: 2,
    admin: 3,
  };

  const userLevel = permissionLevels[permission];
  const requiredLevel = permissionLevels[requiredPermission];

  if (userLevel < requiredLevel) {
    throw new Error(
      `Access denied. Required: ${requiredPermission}, Have: ${permission}`,
    );
  }
}

/**
 * Get all events user has access to
 */
export async function getUserAccessibleEvents(
  userId: string,
  userRole?: string,
) {
  const eventSelect = {
    id: true,
    name: true,
    date: true,
    status: true,
    _count: {
      select: {
        registrations: true,
        distances: true,
      },
    },
  };

  // ✅ ADMIN sees ALL events regardless of creator
  if (userRole === "ADMIN") {
    const allEvents = await prisma.event.findMany({
      select: eventSelect,
      orderBy: { date: "desc" },
    });
    return allEvents.map((e) => ({
      ...e,
      role: "ADMIN" as const,
      isCreator: true,
    }));
  }

  // Non-admin: Get events user created
  const createdEvents = await prisma.event.findMany({
    where: { createdById: userId },
    select: eventSelect,
  });

  // Non-admin: Get events user is assigned to
  const assignedEvents = await prisma.eventUser.findMany({
    where: { userId },
    include: {
      event: {
        select: eventSelect,
      },
    },
  });

  // Combine and deduplicate
  const allEvents = [
    ...createdEvents.map((e) => ({
      ...e,
      role: "ADMIN" as const,
      isCreator: true,
    })),
    ...assignedEvents.map((a) => ({
      ...a.event,
      role: a.role,
      isCreator: false,
    })),
  ];

  // Remove duplicates (user might be both creator and assigned)
  const uniqueEvents = allEvents.filter(
    (event, index, self) => index === self.findIndex((e) => e.id === event.id),
  );

  return uniqueEvents;
}

/**
 * Get all registrations for events user has access to
 */
export async function getUserAccessibleRegistrations(
  userId: string,
  filters: {
    eventId?: string;
    search?: string;
    status?: string;
    distance?: string;
    source?: string;
    page?: number;
    limit?: number;
    userRole?: string; // ✅ Pass through for ADMIN access
  },
) {
  const {
    eventId,
    search,
    status,
    distance,
    source,
    page = 1,
    limit = 50,
  } = filters;

  // Get accessible event IDs
  const accessibleEvents = await getUserAccessibleEvents(userId, filters.userRole);
  const eventIds = accessibleEvents.map((e) => e.id);

  if (eventIds.length === 0) {
    return {
      registrations: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  // Build where clause
  const whereClause: any = {
    eventId: {
      in: eventIds, // ✅ Only events user has access to
    },
  };

  // If specific event requested, check permission
  if (eventId && eventId !== "all") {
    if (!eventIds.includes(eventId)) {
      throw new Error("Access denied to this event");
    }
    whereClause.eventId = eventId;
  }

  // Other filters
  if (search) {
    const searchEventIds =
      eventId && eventId !== "all" ? [eventId] : eventIds;
    const registrationNumberMatches = /^\d+$/.test(search)
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "registrations"
          WHERE "eventId" IN (${Prisma.join(searchEventIds)})
            AND (
              "registration_number"::text = ${search}
              OR "short_code" ILIKE ${`%${search}%`}
            )
        `
      : [];
    whereClause.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { bibNumber: { contains: search, mode: "insensitive" } },
      ...registrationNumberMatches.map((match) => ({ id: match.id })),
    ];
  }

  if (status) {
    whereClause.paymentStatus = status;
  }

  if (distance) {
    whereClause.distance = { name: distance };
  }

  if (source) {
    whereClause.registrationSource = source;
  }

  // Get data
  const skip = (page - 1) * limit;
  const totalCount = await prisma.registration.count({ where: whereClause });
  const registrations = await prisma.registration.findMany({
    where: whereClause,
    include: {
      distance: { select: { name: true } },
      event: { select: { name: true } },
    },
    orderBy: { registrationDate: "desc" },
    skip,
    take: limit,
  });
  const registrationNumbers =
    registrations.length > 0
      ? await prisma.$queryRaw<
          { id: string; registration_number: number }[]
        >`
          SELECT "id", "registration_number"
          FROM "registrations"
          WHERE "id" IN (${Prisma.join(registrations.map((r) => r.id))})
        `
      : [];
  const registrationNumberById = new Map(
    registrationNumbers.map((r) => [r.id, r.registration_number]),
  );
  const registrationsWithNumber = registrations.map((registration) => ({
    ...registration,
    registrationNumber:
      registrationNumberById.get(registration.id) ?? null,
  }));
  const totalPages = Math.ceil(totalCount / limit);

  return {
    registrations: registrationsWithNumber,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
