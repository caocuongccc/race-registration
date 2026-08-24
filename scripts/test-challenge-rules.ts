import assert from "node:assert/strict";
import { evaluateChallengeActivity, type ChallengeActivityInput } from "../lib/challenge-rules/engine";
import { parseChallengeRuleConfig } from "../lib/challenge-rules/schema";

const config = parseChallengeRuleConfig({
  schemaVersion: 1,
  activity: { allowedTypes: ["Run", "Walk"], rejectManual: true, outdoorOnly: true },
  gps: { enabled: true, mode: "STRICT" },
  heartRate: { enabled: false, requireStream: false },
  distance: { minimumMeters: 1000 },
  pace: {
    enabled: true,
    mode: "EVERY_KM",
    timeBasis: "MOVING_TIME",
    minimumSecondsPerKm: 180,
    maximumSecondsPerKm: 600,
    validateFinalPartial: false,
    minimumFinalPartialMeters: 500,
  },
  timeWindows: { enabled: false, policy: "START_TIME_ONLY", windows: [] },
  caps: { individualDailyMeters: 42000, teamDailyMeters: null },
  scoring: { enabled: false, pointsPerKm: 1, overlapPolicy: "HIGHEST_ONLY" },
});

function activity(overrides: Partial<ChallengeActivityInput> = {}): ChallengeActivityInput {
  return {
    sportType: "Run",
    startDate: new Date("2026-09-20T01:00:00.000Z"),
    endDate: new Date("2026-09-20T05:00:00.000Z"),
    localStartWeekday: 0,
    localStartMinute: 480,
    localEndWeekday: 0,
    localEndMinute: 720,
    distanceMeters: 43000,
    movingTimeSeconds: 17200,
    elapsedTimeSeconds: 18000,
    isManual: false,
    isTrainer: false,
    hasGps: true,
    hasGpsStream: true,
    hasHeartRate: true,
    averageHeartRate: 145,
    hasHeartRateStream: true,
    splits: Array.from({ length: 43 }, (_, index) => ({
      splitNumber: index + 1,
      distanceMeters: 1000,
      movingTimeSeconds: 400,
      elapsedTimeSeconds: 420,
      isCompleteKm: true,
    })),
    ...overrides,
  };
}

const event = {
  eventStartsAt: new Date("2026-09-01T00:00:00.000Z"),
  eventEndsAt: new Date("2026-10-01T00:00:00.000Z"),
  enrollment: {
    activeFrom: new Date("2026-09-01T00:00:00.000Z"),
    activeUntil: null,
  },
  teamMembership: {
    teamId: "team-a",
    joinedAt: new Date("2026-09-01T00:00:00.000Z"),
    leftAt: null,
  },
  individualDistanceBeforeTodayMeters: 0,
  teamDistanceBeforeTodayMeters: 0,
};

const capped = evaluateChallengeActivity(config, activity(), event);
assert.equal(capped.status, "ACCEPTED_WITH_CAP");
assert.equal(capped.creditedIndividualMeters, 42000);
assert.equal(capped.creditedTeamMeters, 43000);
assert.equal(capped.individualPoints, 42);
assert.equal(capped.teamPoints, 43);

const removedAt = new Date("2026-09-20T03:00:00.000Z");
const historical = evaluateChallengeActivity(config, activity(), {
  ...event,
  enrollment: { ...event.enrollment, activeUntil: removedAt },
  teamMembership: { ...event.teamMembership, leftAt: removedAt },
});
assert.equal(historical.creditedTeamMeters, 43000);

const afterRemoval = evaluateChallengeActivity(
  config,
  activity({ startDate: new Date("2026-09-20T04:00:00.000Z") }),
  {
    ...event,
    enrollment: { ...event.enrollment, activeUntil: removedAt },
    teamMembership: { ...event.teamMembership, leftAt: removedAt },
  },
);
assert.equal(afterRemoval.status, "REJECTED");
assert(afterRemoval.failures.some((failure) => failure.code === "NOT_ENROLLED_AT_ACTIVITY_START"));

const heartRateConfig = parseChallengeRuleConfig({
  ...config,
  heartRate: { enabled: true, requireStream: true },
});
const missingHeartRate = evaluateChallengeActivity(
  heartRateConfig,
  activity({ hasHeartRate: false, averageHeartRate: null, hasHeartRateStream: false }),
  event,
);
assert(missingHeartRate.failures.some((failure) => failure.code === "HEART_RATE_REQUIRED"));
assert(missingHeartRate.failures.some((failure) => failure.code === "HEART_RATE_STREAM_REQUIRED"));

const badPace = evaluateChallengeActivity(
  config,
  activity({
    distanceMeters: 1000,
    splits: [{
      splitNumber: 1,
      distanceMeters: 1000,
      movingTimeSeconds: 601,
      elapsedTimeSeconds: 620,
      isCompleteKm: true,
    }],
  }),
  event,
);
assert(badPace.failures.some((failure) => failure.code === "PACE_SPLIT_TOO_SLOW"));

console.log("Challenge rule engine: all tests passed");

