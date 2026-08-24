import { z } from "zod";

const nullablePositiveMeters = z.number().int().positive().nullable();
const nullablePositiveNumber = z.number().positive().nullable();

export const challengeRuleConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  activity: z.object({
    allowedTypes: z.array(z.string().min(1)).min(1).default(["Run", "Walk"]),
    rejectManual: z.boolean().default(true),
    outdoorOnly: z.boolean().default(true),
  }),
  gps: z.object({
    enabled: z.boolean().default(true),
    mode: z.enum(["BASIC", "STRICT"]).default("BASIC"),
  }),
  heartRate: z.object({
    enabled: z.boolean().default(false),
    requireStream: z.boolean().default(false),
  }),
  distance: z.object({
    minimumMeters: z.number().int().nonnegative().default(0),
  }),
  pace: z.object({
    enabled: z.boolean().default(false),
    mode: z.enum(["AVERAGE", "EVERY_KM"]).default("EVERY_KM"),
    timeBasis: z.enum(["MOVING_TIME", "ELAPSED_TIME"]).default("MOVING_TIME"),
    minimumSecondsPerKm: z.number().positive(),
    maximumSecondsPerKm: z.number().positive(),
    validateFinalPartial: z.boolean().default(false),
    minimumFinalPartialMeters: z.number().int().positive().default(500),
  }).refine(
    (pace) => pace.minimumSecondsPerKm <= pace.maximumSecondsPerKm,
    { message: "minimumSecondsPerKm must not exceed maximumSecondsPerKm" },
  ),
  timeWindows: z.object({
    enabled: z.boolean().default(false),
    policy: z.enum(["START_TIME_ONLY", "FULL_ACTIVITY_WINDOW"]).default("START_TIME_ONLY"),
    windows: z.array(z.object({
      weekday: z.number().int().min(0).max(6),
      startMinute: z.number().int().min(0).max(1439),
      endMinute: z.number().int().min(1).max(1440),
    }).refine(
      (window) => window.startMinute < window.endMinute,
      { message: "startMinute must be before endMinute" },
    )).default([]),
  }),
  caps: z.object({
    individualDailyMeters: nullablePositiveMeters.default(null),
    teamDailyMeters: nullablePositiveMeters.default(null),
  }),
  scoring: z.object({
    enabled: z.boolean().default(false),
    pointsPerKm: z.number().positive().default(1),
    weekendMultiplier: nullablePositiveNumber.default(null),
    overlapPolicy: z.enum(["HIGHEST_ONLY", "STACK_MULTIPLIERS"]).default("HIGHEST_ONLY"),
  }),
});

export type ChallengeRuleConfig = z.infer<typeof challengeRuleConfigSchema>;

export function parseChallengeRuleConfig(value: unknown): ChallengeRuleConfig {
  return challengeRuleConfigSchema.parse(value);
}

