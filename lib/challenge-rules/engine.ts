import type { ChallengeRuleConfig } from "./schema";

export type ChallengeRuleFailureCode =
  | "OUTSIDE_EVENT_PERIOD"
  | "NOT_ENROLLED_AT_ACTIVITY_START"
  | "ACTIVITY_TYPE_NOT_ALLOWED"
  | "MANUAL_ACTIVITY_NOT_ALLOWED"
  | "OUTDOOR_ACTIVITY_REQUIRED"
  | "GPS_REQUIRED"
  | "GPS_STREAM_REQUIRED"
  | "HEART_RATE_REQUIRED"
  | "HEART_RATE_STREAM_REQUIRED"
  | "DISTANCE_TOO_SHORT"
  | "OUTSIDE_ALLOWED_TIME_WINDOW"
  | "PACE_AVERAGE_TOO_FAST"
  | "PACE_AVERAGE_TOO_SLOW"
  | "PACE_SPLIT_TOO_FAST"
  | "PACE_SPLIT_TOO_SLOW";

export interface ChallengeRuleFailure {
  code: ChallengeRuleFailureCode;
  details?: Record<string, string | number | boolean | null>;
}

export interface ChallengePaceSplit {
  splitNumber: number;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  isCompleteKm: boolean;
}

export interface ChallengeActivityInput {
  sportType: string;
  startDate: Date;
  endDate: Date;
  localStartWeekday: number;
  localStartMinute: number;
  localEndWeekday: number;
  localEndMinute: number;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  isManual: boolean;
  isTrainer: boolean;
  hasGps: boolean;
  hasGpsStream: boolean;
  hasHeartRate: boolean;
  averageHeartRate: number | null;
  hasHeartRateStream: boolean;
  splits: ChallengePaceSplit[];
}

export interface ChallengeTemporalEnrollment {
  activeFrom: Date;
  activeUntil: Date | null;
}

export interface ChallengeTemporalTeamMembership {
  teamId: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface ChallengeEvaluationContext {
  eventStartsAt: Date;
  eventEndsAt: Date;
  enrollment: ChallengeTemporalEnrollment | null;
  teamMembership: ChallengeTemporalTeamMembership | null;
  individualDistanceBeforeTodayMeters: number;
  teamDistanceBeforeTodayMeters: number;
  applicableMultipliers?: number[];
}

export interface ChallengeRuleResult {
  status: "ACCEPTED" | "ACCEPTED_WITH_CAP" | "REJECTED";
  failures: ChallengeRuleFailure[];
  validDistanceMeters: number;
  creditedIndividualMeters: number;
  creditedTeamMeters: number;
  individualPoints: number;
  teamPoints: number;
  teamId: string | null;
  appliedMultiplier: number;
}

function isWithin(start: Date, from: Date, until: Date | null): boolean {
  return start >= from && (until === null || start < until);
}

function isPointInsideWindow(weekday: number, minute: number, config: ChallengeRuleConfig): boolean {
  return config.timeWindows.windows.some(
    (window) => window.weekday === weekday
      && minute >= window.startMinute
      && minute < window.endMinute,
  );
}

function getPaceSecondsPerKm(distanceMeters: number, seconds: number): number {
  return seconds / (distanceMeters / 1000);
}

function resolveMultiplier(config: ChallengeRuleConfig, multipliers: number[]): number {
  if (!config.scoring.enabled || multipliers.length === 0) return 1;
  if (config.scoring.overlapPolicy === "HIGHEST_ONLY") return Math.max(...multipliers);
  return multipliers.reduce((product, multiplier) => product * multiplier, 1);
}

function applyDailyCap(distance: number, distanceBefore: number, cap: number | null): number {
  if (cap === null) return distance;
  return Math.min(distance, Math.max(0, cap - Math.max(0, distanceBefore)));
}

export function evaluateChallengeActivity(
  config: ChallengeRuleConfig,
  activity: ChallengeActivityInput,
  context: ChallengeEvaluationContext,
): ChallengeRuleResult {
  const failures: ChallengeRuleFailure[] = [];
  const activityStart = activity.startDate;
  const enrollmentActive = context.enrollment !== null
    && isWithin(activityStart, context.enrollment.activeFrom, context.enrollment.activeUntil);
  const teamActive = enrollmentActive
    && context.teamMembership !== null
    && isWithin(activityStart, context.teamMembership.joinedAt, context.teamMembership.leftAt);

  if (activityStart < context.eventStartsAt || activityStart >= context.eventEndsAt) {
    failures.push({ code: "OUTSIDE_EVENT_PERIOD" });
  }
  if (!enrollmentActive) failures.push({ code: "NOT_ENROLLED_AT_ACTIVITY_START" });
  if (!config.activity.allowedTypes.includes(activity.sportType)) {
    failures.push({ code: "ACTIVITY_TYPE_NOT_ALLOWED", details: { sportType: activity.sportType } });
  }
  if (config.activity.rejectManual && activity.isManual) {
    failures.push({ code: "MANUAL_ACTIVITY_NOT_ALLOWED" });
  }
  if (config.activity.outdoorOnly && activity.isTrainer) {
    failures.push({ code: "OUTDOOR_ACTIVITY_REQUIRED" });
  }
  if (config.gps.enabled && !activity.hasGps) failures.push({ code: "GPS_REQUIRED" });
  if (config.gps.enabled && config.gps.mode === "STRICT" && !activity.hasGpsStream) {
    failures.push({ code: "GPS_STREAM_REQUIRED" });
  }
  if (config.heartRate.enabled && (!activity.hasHeartRate || (activity.averageHeartRate ?? 0) <= 0)) {
    failures.push({ code: "HEART_RATE_REQUIRED" });
  }
  if (config.heartRate.enabled && config.heartRate.requireStream && !activity.hasHeartRateStream) {
    failures.push({ code: "HEART_RATE_STREAM_REQUIRED" });
  }
  if (activity.distanceMeters < config.distance.minimumMeters) {
    failures.push({
      code: "DISTANCE_TOO_SHORT",
      details: { actualMeters: activity.distanceMeters, minimumMeters: config.distance.minimumMeters },
    });
  }

  if (config.timeWindows.enabled) {
    const startAllowed = isPointInsideWindow(
      activity.localStartWeekday,
      activity.localStartMinute,
      config,
    );
    const endAllowed = config.timeWindows.policy === "START_TIME_ONLY"
      || isPointInsideWindow(activity.localEndWeekday, activity.localEndMinute, config);
    if (!startAllowed || !endAllowed) failures.push({ code: "OUTSIDE_ALLOWED_TIME_WINDOW" });
  }

  if (config.pace.enabled && activity.distanceMeters > 0) {
    if (config.pace.mode === "AVERAGE") {
      const duration = config.pace.timeBasis === "MOVING_TIME"
        ? activity.movingTimeSeconds
        : activity.elapsedTimeSeconds;
      const pace = getPaceSecondsPerKm(activity.distanceMeters, duration);
      if (pace < config.pace.minimumSecondsPerKm) {
        failures.push({ code: "PACE_AVERAGE_TOO_FAST", details: { actualSecondsPerKm: pace } });
      }
      if (pace > config.pace.maximumSecondsPerKm) {
        failures.push({ code: "PACE_AVERAGE_TOO_SLOW", details: { actualSecondsPerKm: pace } });
      }
    } else {
      for (const split of activity.splits) {
        const shouldValidate = split.isCompleteKm
          || (config.pace.validateFinalPartial
            && split.distanceMeters >= config.pace.minimumFinalPartialMeters);
        if (!shouldValidate || split.distanceMeters <= 0) continue;
        const duration = config.pace.timeBasis === "MOVING_TIME"
          ? split.movingTimeSeconds
          : split.elapsedTimeSeconds;
        const pace = getPaceSecondsPerKm(split.distanceMeters, duration);
        if (pace < config.pace.minimumSecondsPerKm) {
          failures.push({
            code: "PACE_SPLIT_TOO_FAST",
            details: { split: split.splitNumber, actualSecondsPerKm: pace },
          });
        }
        if (pace > config.pace.maximumSecondsPerKm) {
          failures.push({
            code: "PACE_SPLIT_TOO_SLOW",
            details: { split: split.splitNumber, actualSecondsPerKm: pace },
          });
        }
      }
    }
  }

  if (failures.length > 0) {
    return {
      status: "REJECTED",
      failures,
      validDistanceMeters: 0,
      creditedIndividualMeters: 0,
      creditedTeamMeters: 0,
      individualPoints: 0,
      teamPoints: 0,
      teamId: teamActive ? context.teamMembership!.teamId : null,
      appliedMultiplier: 1,
    };
  }

  const validDistanceMeters = activity.distanceMeters;
  const creditedIndividualMeters = applyDailyCap(
    validDistanceMeters,
    context.individualDistanceBeforeTodayMeters,
    config.caps.individualDailyMeters,
  );
  const creditedTeamMeters = teamActive
    ? applyDailyCap(
      validDistanceMeters,
      context.teamDistanceBeforeTodayMeters,
      config.caps.teamDailyMeters,
    )
    : 0;
  const multiplier = resolveMultiplier(config, context.applicableMultipliers ?? []);
  const pointsPerKm = config.scoring.enabled ? config.scoring.pointsPerKm : 1;
  const individualPoints = (creditedIndividualMeters / 1000) * pointsPerKm * multiplier;
  const teamPoints = (creditedTeamMeters / 1000) * pointsPerKm * multiplier;
  const capped = creditedIndividualMeters < validDistanceMeters
    || (teamActive && creditedTeamMeters < validDistanceMeters);

  return {
    status: capped ? "ACCEPTED_WITH_CAP" : "ACCEPTED",
    failures,
    validDistanceMeters,
    creditedIndividualMeters,
    creditedTeamMeters,
    individualPoints,
    teamPoints,
    teamId: teamActive ? context.teamMembership!.teamId : null,
    appliedMultiplier: multiplier,
  };
}

