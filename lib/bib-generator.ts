// lib/bib-generator.ts
import { prisma } from "@/lib/prisma";

const MAX_PER_PREFIX = 999;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getBibSuffixNumber(bibNumber: string, prefix: string): number | null {
  const match = bibNumber.match(new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`));
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

async function findNextBibForPrefix(
  bibPrefix: string,
  filters: {
    eventId: string;
    excludeRegistrationId?: string;
  },
): Promise<string> {
  let currentPrefix = bibPrefix;
  let minimumNextNumber = 1;

  while (true) {
    const existingBibs = await prisma.registration.findMany({
      where: {
        eventId: filters.eventId,
        ...(filters.excludeRegistrationId
          ? { id: { not: filters.excludeRegistrationId } }
          : {}),
        bibNumber: {
          not: null,
          startsWith: currentPrefix,
        },
      },
      select: { bibNumber: true },
    });

    const usedNumbers = existingBibs
      .map((item) =>
        item.bibNumber ? getBibSuffixNumber(item.bibNumber, currentPrefix) : null,
      )
      .filter((value): value is number => value !== null);
    const nextNumber =
      usedNumbers.length > 0
        ? Math.max(Math.max(...usedNumbers) + 1, minimumNextNumber)
        : minimumNextNumber;

    if (nextNumber > MAX_PER_PREFIX) {
      if (!/^\d+$/.test(currentPrefix)) {
        throw new Error(
          `Da het BIB cho prefix ${currentPrefix}. Toi da ${MAX_PER_PREFIX} VDV.`,
        );
      }

      currentPrefix = String(Number.parseInt(currentPrefix, 10) + 1);
      minimumNextNumber = 1;
      continue;
    }

    const bibNumber = `${currentPrefix}${String(nextNumber).padStart(3, "0")}`;
    const existing = await prisma.registration.findFirst({
      where: {
        eventId: filters.eventId,
        bibNumber,
      },
    });

    if (!existing || existing.id === filters.excludeRegistrationId) {
      return bibNumber;
    }

    // Collision inside the same event. Keep moving inside this prefix until
    // we find a genuinely unused BIB.
    minimumNextNumber = nextNumber + 1;
    if (minimumNextNumber > MAX_PER_PREFIX) {
      if (!/^\d+$/.test(currentPrefix)) {
        throw new Error(
          `Da het BIB cho prefix ${currentPrefix}. Toi da ${MAX_PER_PREFIX} VDV.`,
        );
      }

      currentPrefix = String(Number.parseInt(currentPrefix, 10) + 1);
      minimumNextNumber = 1;
      continue;
    }
  }
}

/**
 * Generate unique BIB number for imports.
 * Format: PREFIX001, PREFIX002...
 */
export async function generateBibNumber(
  eventId: string,
  bibPrefix: string,
  distanceGoalId?: string | null,
): Promise<string> {
  return findNextBibForPrefix(bibPrefix, {
    eventId,
  });
}

/**
 * Regenerate BIB numbers for all registrations in an event.
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
 * Get BIB statistics for an event.
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

export async function generateBibNumberHybrid(
  registrationId: string,
  distanceId: string,
  distanceGoalId?: string | null,
): Promise<string> {
  const distance = await prisma.distance.findUnique({
    where: { id: distanceId },
    include: {
      distanceGoals: distanceGoalId
        ? {
            where: { id: distanceGoalId },
          }
        : false,
    },
  });

  if (!distance) {
    throw new Error("Distance not found");
  }

  const basePrefix =
    distanceGoalId && distance.distanceGoals && distance.distanceGoals.length > 0
      ? distance.distanceGoals[0].bibPrefix || distance.bibPrefix
      : distance.bibPrefix;

  const bibNumber = await findNextBibForPrefix(basePrefix, {
    eventId: distance.eventId,
    excludeRegistrationId: registrationId,
  });

  console.log(`BIB generated: ${bibNumber}`);

  return bibNumber;
}
