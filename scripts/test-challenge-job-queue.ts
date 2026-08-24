import assert from "node:assert/strict";
import { challengeJobRetryDelayMs } from "../lib/challenge-jobs/queue";

assert.equal(challengeJobRetryDelayMs(1), 15_000);
assert.equal(challengeJobRetryDelayMs(2), 30_000);
assert.equal(challengeJobRetryDelayMs(3), 60_000);
assert.equal(challengeJobRetryDelayMs(20), 30 * 60_000);
assert.equal(challengeJobRetryDelayMs(-10), 15_000);

console.log("Challenge job queue: all tests passed");

