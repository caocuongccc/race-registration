import { z } from "zod";
import { challengeRuleConfigSchema } from "@/lib/challenge-rules/schema";

const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const dateSchema = z.coerce.date();

export const createChallengeEventSchema = z.object({
  name: z.string().trim().min(3).max(160),
  slug: slugSchema,
  description: z.string().trim().max(5000).nullish(),
  timezone: z.string().trim().min(1).default("Asia/Ho_Chi_Minh"),
  startsAt: dateSchema,
  endsAt: dateSchema,
  participationMode: z.enum(["INDIVIDUAL_ONLY", "TEAM_ONLY", "INDIVIDUAL_AND_TEAM"])
    .default("INDIVIDUAL_AND_TEAM"),
  defaultTeamSize: z.number().int().positive().nullable().default(null),
  enablePoints: z.boolean().default(false),
  pointsPerKm: z.number().positive().default(1),
  rankingMetric: z.enum(["DISTANCE", "POINTS"]).default("DISTANCE"),
  topCount: z.number().int().positive().max(100).default(3),
}).refine((value) => value.endsAt > value.startsAt, {
  message: "Thời gian kết thúc phải sau thời gian bắt đầu",
  path: ["endsAt"],
}).refine((value) => value.enablePoints || value.rankingMetric === "DISTANCE", {
  message: "Chỉ được xếp hạng bằng điểm khi đã bật chế độ điểm",
  path: ["rankingMetric"],
});

export const updateChallengeEventSchema = createChallengeEventSchema
  .omit({ slug: true })
  .partial()
  .extend({ status: z.enum(["DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional() });

export const createChallengeRulesetSchema = z.object({
  effectiveFrom: dateSchema,
  applicationScope: z.enum(["FROM_NOW", "FROM_SELECTED_DATETIME", "RECALCULATE_WHOLE_EVENT"])
    .default("FROM_NOW"),
  changeReason: z.string().trim().max(1000).nullish(),
  config: challengeRuleConfigSchema,
  specialDays: z.array(z.object({
    localDate: dateSchema,
    name: z.string().trim().min(1).max(160),
    multiplier: z.number().positive(),
  })).default([]),
});

export const createChallengeTeamSchema = z.object({
  name: z.string().trim().min(2).max(160),
  maxMembers: z.number().int().positive().max(10000),
});

export const addChallengeTeamMemberSchema = z.object({
  userId: z.string().min(1),
  activeFrom: dateSchema.default(() => new Date()),
});

export const removeChallengeTeamMemberSchema = z.object({
  reason: z.string().trim().min(2).max(1000),
  leftAt: dateSchema.default(() => new Date()),
});

export function defaultChallengeRuleConfig() {
  return challengeRuleConfigSchema.parse({
    schemaVersion: 1,
    activity: { allowedTypes: ["Run", "Walk"], rejectManual: true, outdoorOnly: true },
    gps: { enabled: true, mode: "BASIC" },
    heartRate: { enabled: false, requireStream: false },
    distance: { minimumMeters: 1000 },
    pace: {
      enabled: false,
      mode: "EVERY_KM",
      timeBasis: "MOVING_TIME",
      minimumSecondsPerKm: 180,
      maximumSecondsPerKm: 900,
      validateFinalPartial: false,
      minimumFinalPartialMeters: 500,
    },
    timeWindows: { enabled: false, policy: "START_TIME_ONLY", windows: [] },
    caps: { individualDailyMeters: null, teamDailyMeters: null },
    scoring: {
      enabled: false,
      pointsPerKm: 1,
      weekendMultiplier: null,
      overlapPolicy: "HIGHEST_ONLY",
    },
  });
}

