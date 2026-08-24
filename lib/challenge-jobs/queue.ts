import { ChallengeJobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ClaimedChallengeJob {
  id: string;
  type: "SYNC_ACTIVITY" | "DELETE_ACTIVITY" | "RECALCULATE_EVENT" | "REBUILD_AGGREGATES";
  payloadJson: Prisma.JsonValue;
  attempts: number;
  maxAttempts: number;
}

const MAX_BATCH_SIZE = 20;

export function challengeJobRetryDelayMs(attempts: number): number {
  const safeAttempts = Math.max(1, Math.floor(attempts));
  return Math.min(30 * 60_000, 15_000 * 2 ** (safeAttempts - 1));
}

export async function recoverStaleChallengeJobs(staleAfterMs = 5 * 60_000): Promise<number> {
  const staleBefore = new Date(Date.now() - staleAfterMs);
  const result = await prisma.challengeJob.updateMany({
    where: {
      status: "RUNNING",
      lockedAt: { lt: staleBefore },
      completedAt: null,
    },
    data: {
      status: "QUEUED",
      lockedAt: null,
      runAfter: new Date(),
      lastError: "Recovered stale worker lock",
    },
  });
  return result.count;
}

export async function claimChallengeJobs(limit = 5): Promise<ClaimedChallengeJob[]> {
  const safeLimit = Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(limit)));
  return prisma.$queryRaw<ClaimedChallengeJob[]>(Prisma.sql`
    WITH candidates AS (
      SELECT "id"
      FROM "challenge_jobs"
      WHERE "status" = 'QUEUED'::"ChallengeJobStatus"
        AND "runAfter" <= NOW()
        AND "attempts" < "maxAttempts"
      ORDER BY "runAfter" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${safeLimit}
    )
    UPDATE "challenge_jobs" job
    SET
      "status" = 'RUNNING'::"ChallengeJobStatus",
      "lockedAt" = NOW(),
      "attempts" = job."attempts" + 1,
      "updatedAt" = NOW()
    FROM candidates
    WHERE job."id" = candidates."id"
    RETURNING
      job."id",
      job."type",
      job."payloadJson",
      job."attempts",
      job."maxAttempts"
  `);
}

export async function completeChallengeJob(jobId: string): Promise<void> {
  await prisma.challengeJob.updateMany({
    where: { id: jobId, status: "RUNNING" },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      lockedAt: null,
      lastError: null,
    },
  });
}

export async function failChallengeJob(jobId: string, error: unknown): Promise<ChallengeJobStatus> {
  const current = await prisma.challengeJob.findUnique({
    where: { id: jobId },
    select: { attempts: true, maxAttempts: true, status: true },
  });
  if (!current || current.status !== "RUNNING") return current?.status ?? "FAILED";

  const exhausted = current.attempts >= current.maxAttempts;
  const nextStatus: ChallengeJobStatus = exhausted ? "FAILED" : "QUEUED";
  const message = error instanceof Error ? error.message : String(error);
  await prisma.challengeJob.update({
    where: { id: jobId },
    data: {
      status: nextStatus,
      lockedAt: null,
      completedAt: exhausted ? new Date() : null,
      runAfter: exhausted
        ? new Date()
        : new Date(Date.now() + challengeJobRetryDelayMs(current.attempts)),
      lastError: message.slice(0, 4000),
    },
  });
  return nextStatus;
}

