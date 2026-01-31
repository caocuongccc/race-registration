// lib/bib-generator.ts - UPDATED WITH GOALS SUPPORT
import { prisma } from "@/lib/prisma";

/**
 * Generate unique BIB number for registration
 * Format:
 * - Without goals: PREFIX-001, PREFIX-002...
 * - With goals: GOAL_PREFIX-001, GOAL_PREFIX-002...
 *
 * Example:
 * - No goals: 5K-001, 10K-001, 21K-001
 * - With goals: 5K45-001, 5K60-001, 5K75-001
 */
export async function generateBibNumber(
  eventId: string,
  bibPrefix: string,
  distanceGoalId?: string | null
): Promise<string> {
  // Build where clause based on whether we have a goal
  const whereClause: any = {
    eventId,
    bibNumber: { startsWith: bibPrefix },
  };

  if (distanceGoalId) {
    // For goal-based registration, only count BIBs from same goal
    whereClause.distanceGoalId = distanceGoalId;
  } else {
    // For non-goal registration, only count BIBs without goals
    whereClause.distanceGoalId = null;
  }

  // Find highest BIB number with this prefix
  const existingBibs = await prisma.registration.findMany({
    where: whereClause,
    select: { bibNumber: true },
    orderBy: { bibNumber: "desc" },
    take: 1,
  });

  let nextNumber = 1;

  if (existingBibs.length > 0 && existingBibs[0].bibNumber) {
    const lastBib = existingBibs[0].bibNumber;
    const match = lastBib.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  // Format with leading zeros (3 digits)
  const bibNumber = `${bibPrefix}${nextNumber.toString().padStart(3, "0")}`;

  // Verify uniqueness (double check)
  const existing = await prisma.registration.findUnique({
    where: { bibNumber },
  });

  if (existing) {
    // Collision detected, try next number
    return generateBibNumber(eventId, bibPrefix, distanceGoalId);
  }

  return bibNumber;
}

/**
 * Regenerate BIB numbers for all registrations in an event
 * Useful after changing distance prefixes or goals
 */
export async function regenerateAllBibs(eventId: string): Promise<number> {
  const registrations = await prisma.registration.findMany({
    where: { eventId },
    include: {
      distance: true,
      distanceGoal: true,
    },
    orderBy: [
      { distanceId: "asc" },
      { distanceGoalId: "asc" },
      { createdAt: "asc" },
    ],
  });

  let updatedCount = 0;
  const bibCounters: Record<string, number> = {};

  for (const reg of registrations) {
    const prefix = reg.distanceGoal?.bibPrefix || reg.distance.bibPrefix;
    const key = `${prefix}-${reg.distanceGoalId || "default"}`;

    if (!bibCounters[key]) {
      bibCounters[key] = 1;
    }

    const newBibNumber = `${prefix}${bibCounters[key].toString().padStart(3, "0")}`;
    bibCounters[key]++;

    if (reg.bibNumber !== newBibNumber) {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { bibNumber: newBibNumber },
      });
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Get BIB statistics for an event
 */
export async function getBibStats(eventId: string) {
  const registrations = await prisma.registration.findMany({
    where: { eventId },
    include: {
      distance: true,
      distanceGoal: true,
    },
  });

  const stats: Record<
    string,
    {
      prefix: string;
      distanceName: string;
      goalName?: string;
      count: number;
      lastBib: string;
    }
  > = {};

  for (const reg of registrations) {
    const prefix = reg.distanceGoal?.bibPrefix || reg.distance.bibPrefix;
    const goalName = reg.distanceGoal?.name;
    const key = `${prefix}-${reg.distanceGoalId || "default"}`;

    if (!stats[key]) {
      stats[key] = {
        prefix,
        distanceName: reg.distance.name,
        goalName,
        count: 0,
        lastBib: "",
      };
    }

    stats[key].count++;
    if (
      reg.bibNumber &&
      (!stats[key].lastBib || reg.bibNumber > stats[key].lastBib)
    ) {
      stats[key].lastBib = reg.bibNumber;
    }
  }

  return Object.values(stats).sort((a, b) => a.prefix.localeCompare(b.prefix));
}
