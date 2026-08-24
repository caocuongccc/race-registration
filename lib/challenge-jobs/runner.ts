import type { Prisma } from "@prisma/client";
import { deleteStravaActivity, syncStravaActivity } from "./activity-processor";
import {
  claimChallengeJobs,
  completeChallengeJob,
  failChallengeJob,
  recoverStaleChallengeJobs,
} from "./queue";
import { processRecalculationPage } from "./recalculation";

export interface ChallengeBatchResult {
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
}

async function processPayload(type: string, payload: Prisma.JsonValue): Promise<void> {
  if (type === "SYNC_ACTIVITY") return syncStravaActivity(payload);
  if (type === "DELETE_ACTIVITY") return deleteStravaActivity(payload);
  if (type === "RECALCULATE_EVENT") {
    await processRecalculationPage(payload);
    return;
  }
  throw new Error(`Challenge job type ${type} chưa được hỗ trợ`);
}

export async function runChallengeJobBatch(limit = 5): Promise<ChallengeBatchResult> {
  await recoverStaleChallengeJobs();
  const jobs = await claimChallengeJobs(limit);
  const result: ChallengeBatchResult = { claimed: jobs.length, completed: 0, retried: 0, failed: 0 };
  // Sequential processing intentionally limits Strava API bursts and cap races.
  for (const job of jobs) {
    try {
      await processPayload(job.type, job.payloadJson);
      await completeChallengeJob(job.id);
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

