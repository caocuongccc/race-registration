// ============================================
// PART 2: Permission Helper Functions
// ============================================
// lib/event-permissions.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  return session.user;
}

/**
 * Check if user has access to event
 */
export async function checkEventAccess(
  eventId: string,
  userId: string,
): Promise<EventPermission> {
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
): Promise<void> {
  const permission = await checkEventAccess(eventId, userId);

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
export async function getUserAccessibleEvents(userId: string) {
  // Get events user created
  const createdEvents = await prisma.event.findMany({
    where: { createdById: userId },
    select: {
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
    },
  });

  // Get events user is assigned to
  const assignedEvents = await prisma.eventUser.findMany({
    where: { userId },
    include: {
      event: {
        select: {
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
        },
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
  const accessibleEvents = await getUserAccessibleEvents(userId);
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
    whereClause.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { bibNumber: { contains: search, mode: "insensitive" } },
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
  console.log("Total accessible registrations:", totalCount);
  console.log("Where clause:", whereClause);
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
  console.log("Fetched registrations:", registrations);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    registrations,
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
