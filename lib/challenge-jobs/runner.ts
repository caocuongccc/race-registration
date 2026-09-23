import type { Prisma } from "@prisma/client";
import { deleteStravaActivity, syncStravaActivity } from "./activity-processor";
import {
  claimChallengeJobs,
  completeChallengeJob,
  failChallengeJob,
  recoverStaleChallengeJobs,
} from "./queue";
import { processRecalculationPage } from "./recalculation";
import { processBackfillPage } from "./backfill";
import { processAggregateRebuildPage } from "./aggregate-rebuild";

export interface ChallengeBatchResult {
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
}

async function processPayload(type: string, payload: Prisma.JsonValue): Promise<unknown> {
  if (type === "SYNC_ACTIVITY") { await syncStravaActivity(payload); return; }
  if (type === "DELETE_ACTIVITY") { await deleteStravaActivity(payload); return; }
  if (type === "BACKFILL_ACTIVITIES") return processBackfillPage(payload);
  if (type === "RECALCULATE_EVENT") return processRecalculationPage(payload);
  if (type === "REBUILD_AGGREGATES") return processAggregateRebuildPage(payload);
  throw new Error(`Challenge job type ${type} is not supported`);
}
export async function runChallengeJobBatch(limit = 5): Promise<ChallengeBatchResult> {
  await recoverStaleChallengeJobs();
  const jobs = await claimChallengeJobs(limit);
  const result: ChallengeBatchResult = { claimed: jobs.length, completed: 0, retried: 0, failed: 0 };
  // Sequential processing intentionally limits Strava API bursts and cap races.
  for (const job of jobs) {
    try {
      const progress = await processPayload(job.type, job.payloadJson);
      const serializedProgress = progress === undefined ? undefined : JSON.parse(JSON.stringify(progress)) as Prisma.InputJsonValue;
      await completeChallengeJob(job.id, serializedProgress);
      result.completed += 1;
    } catch (error) {
      console.error(`Challenge job ${job.id} failed`, error);
      const status = await failChallengeJob(job.id, error);
      if (status === "FAILED") result.failed += 1;
      else result.retried += 1;
    }
  }
  return result;
}
