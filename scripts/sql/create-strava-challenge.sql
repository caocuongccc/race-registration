-- ONE-TIME MIGRATION: creates only isolated challenge_* tables and Challenge* enums.
-- It does not update or delete Event, Kid Run, Merch or Registration data.

BEGIN;

-- CreateEnum
CREATE TYPE "ChallengeGender" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "ChallengeUserStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ChallengeEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChallengeParticipationMode" AS ENUM ('INDIVIDUAL_ONLY', 'TEAM_ONLY', 'INDIVIDUAL_AND_TEAM');

-- CreateEnum
CREATE TYPE "ChallengeRankingMetric" AS ENUM ('DISTANCE', 'POINTS');

-- CreateEnum
CREATE TYPE "ChallengeEnrollmentStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ChallengeTeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChallengeTeamMembershipStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ChallengeRuleApplicationScope" AS ENUM ('FROM_NOW', 'FROM_SELECTED_DATETIME', 'RECALCULATE_WHOLE_EVENT');

-- CreateEnum
CREATE TYPE "ChallengeActivityStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'ACCEPTED_WITH_CAP', 'REJECTED', 'NEEDS_REVIEW', 'SYNC_FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "ChallengeActivityChangeType" AS ENUM ('CREATED', 'UPDATED', 'CROPPED', 'DELETED', 'RESYNCED');

-- CreateEnum
CREATE TYPE "ChallengeEvaluationStatus" AS ENUM ('ACCEPTED', 'ACCEPTED_WITH_CAP', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ChallengeLedgerSubject" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateEnum
CREATE TYPE "ChallengeLedgerEntryType" AS ENUM ('CREDIT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ChallengeWebhookStatus" AS ENUM ('RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ChallengeJobType" AS ENUM ('SYNC_ACTIVITY', 'DELETE_ACTIVITY', 'RECALCULATE_EVENT', 'BACKFILL_ACTIVITIES', 'REBUILD_AGGREGATES');

-- CreateEnum
CREATE TYPE "ChallengeJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "challenge_users" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "gender" "ChallengeGender" NOT NULL DEFAULT 'UNSPECIFIED',
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "status" "ChallengeUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_strava_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaAthleteId" BIGINT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_strava_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "ChallengeEventStatus" NOT NULL DEFAULT 'DRAFT',
    "participationMode" "ChallengeParticipationMode" NOT NULL DEFAULT 'INDIVIDUAL_AND_TEAM',
    "defaultTeamSize" INTEGER,
    "enablePoints" BOOLEAN NOT NULL DEFAULT false,
    "pointsPerKm" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "rankingMetric" "ChallengeRankingMetric" NOT NULL DEFAULT 'DISTANCE',
    "topCount" INTEGER NOT NULL DEFAULT 3,
    "currentRulesetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_enrollments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ChallengeEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeUntil" TIMESTAMP(3),
    "removedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_teams" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL,
    "status" "ChallengeTeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_team_memberships" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "ChallengeTeamMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3),
    "removedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_rulesets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "applicationScope" "ChallengeRuleApplicationScope" NOT NULL DEFAULT 'FROM_NOW',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "configJson" JSONB NOT NULL,
    "changeReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_rulesets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_time_windows" (
    "id" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "challenge_time_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_special_days" (
    "id" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "multiplier" DECIMAL(12,4) NOT NULL DEFAULT 1,

    CONSTRAINT "challenge_special_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaActivityId" BIGINT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "sportType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "startDateLocal" TIMESTAMP(3) NOT NULL,
    "activityTimezone" TEXT,
    "distanceMeters" INTEGER NOT NULL,
    "movingTimeSeconds" INTEGER NOT NULL,
    "elapsedTimeSeconds" INTEGER NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "isTrainer" BOOLEAN NOT NULL DEFAULT false,
    "hasGps" BOOLEAN NOT NULL DEFAULT false,
    "mapPolyline" TEXT,
    "hasHeartRate" BOOLEAN NOT NULL DEFAULT false,
    "averageHeartRate" DECIMAL(8,2),
    "maxHeartRate" DECIMAL(8,2),
    "normalizedJson" JSONB NOT NULL,
    "processingStatus" "ChallengeActivityStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_activity_revisions" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "changeType" "ChallengeActivityChangeType" NOT NULL,
    "stravaUpdatedAt" TIMESTAMP(3),
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_activity_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_activity_evaluations" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "teamId" TEXT,
    "activityRevision" INTEGER NOT NULL,
    "status" "ChallengeEvaluationStatus" NOT NULL,
    "failureReasons" JSONB NOT NULL,
    "validDistanceMeters" INTEGER NOT NULL DEFAULT 0,
    "creditedIndividualMeters" INTEGER NOT NULL DEFAULT 0,
    "creditedTeamMeters" INTEGER NOT NULL DEFAULT 0,
    "individualPoints" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "teamPoints" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_activity_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_point_ledger" (
    "id" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "localDate" DATE NOT NULL,
    "subjectType" "ChallengeLedgerSubject" NOT NULL,
    "entryType" "ChallengeLedgerEntryType" NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "points" DECIMAL(18,6) NOT NULL,
    "reversesEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_point_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_athlete_daily_totals" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "distanceMeters" INTEGER NOT NULL DEFAULT 0,
    "points" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_athlete_daily_totals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_team_daily_totals" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "distanceMeters" INTEGER NOT NULL DEFAULT 0,
    "points" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_team_daily_totals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_athlete_event_totals" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "distanceMeters" INTEGER NOT NULL DEFAULT 0,
    "points" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_athlete_event_totals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_team_event_totals" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "distanceMeters" INTEGER NOT NULL DEFAULT 0,
    "points" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_team_event_totals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "providerEventKey" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" BIGINT NOT NULL,
    "aspectType" TEXT NOT NULL,
    "ownerStravaId" BIGINT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "ChallengeWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_jobs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "type" "ChallengeJobType" NOT NULL,
    "status" "ChallengeJobStatus" NOT NULL DEFAULT 'QUEUED',
    "dedupeKey" TEXT,
    "payloadJson" JSONB NOT NULL,
    "progressJson" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_audit_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenge_users_status_idx" ON "challenge_users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_strava_accounts_userId_key" ON "challenge_strava_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_strava_accounts_stravaAthleteId_key" ON "challenge_strava_accounts"("stravaAthleteId");

-- CreateIndex
CREATE INDEX "challenge_strava_accounts_tokenExpiresAt_idx" ON "challenge_strava_accounts"("tokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_events_slug_key" ON "challenge_events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_events_currentRulesetId_key" ON "challenge_events"("currentRulesetId");

-- CreateIndex
CREATE INDEX "challenge_events_status_startsAt_endsAt_idx" ON "challenge_events"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "challenge_enrollments_eventId_status_activeFrom_activeUntil_idx" ON "challenge_enrollments"("eventId", "status", "activeFrom", "activeUntil");

-- CreateIndex
CREATE INDEX "challenge_enrollments_userId_status_idx" ON "challenge_enrollments"("userId", "status");

-- CreateIndex
CREATE INDEX "challenge_teams_eventId_status_idx" ON "challenge_teams"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_teams_eventId_name_key" ON "challenge_teams"("eventId", "name");

-- CreateIndex
CREATE INDEX "challenge_team_memberships_teamId_status_joinedAt_leftAt_idx" ON "challenge_team_memberships"("teamId", "status", "joinedAt", "leftAt");

-- CreateIndex
CREATE INDEX "challenge_team_memberships_enrollmentId_status_idx" ON "challenge_team_memberships"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "challenge_rulesets_eventId_effectiveFrom_idx" ON "challenge_rulesets"("eventId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_rulesets_eventId_version_key" ON "challenge_rulesets"("eventId", "version");

-- CreateIndex
CREATE INDEX "challenge_time_windows_rulesetId_weekday_sortOrder_idx" ON "challenge_time_windows"("rulesetId", "weekday", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_special_days_rulesetId_localDate_key" ON "challenge_special_days"("rulesetId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_activities_stravaActivityId_key" ON "challenge_activities"("stravaActivityId");

-- CreateIndex
CREATE INDEX "challenge_activities_userId_startDate_idx" ON "challenge_activities"("userId", "startDate");

-- CreateIndex
CREATE INDEX "challenge_activities_processingStatus_updatedAt_idx" ON "challenge_activities"("processingStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_activity_revisions_activityId_revision_key" ON "challenge_activity_revisions"("activityId", "revision");

-- CreateIndex
CREATE INDEX "challenge_activity_evaluations_eventId_status_evaluatedAt_idx" ON "challenge_activity_evaluations"("eventId", "status", "evaluatedAt");

-- CreateIndex
CREATE INDEX "challenge_activity_evaluations_activityId_eventId_isCurrent_idx" ON "challenge_activity_evaluations"("activityId", "eventId", "isCurrent");

-- CreateIndex
CREATE INDEX "challenge_activity_evaluations_rulesetId_idx" ON "challenge_activity_evaluations"("rulesetId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_point_ledger_operationKey_key" ON "challenge_point_ledger"("operationKey");

-- CreateIndex
CREATE INDEX "challenge_point_ledger_eventId_userId_localDate_idx" ON "challenge_point_ledger"("eventId", "userId", "localDate");

-- CreateIndex
CREATE INDEX "challenge_point_ledger_eventId_teamId_localDate_idx" ON "challenge_point_ledger"("eventId", "teamId", "localDate");

-- CreateIndex
CREATE INDEX "challenge_point_ledger_evaluationId_idx" ON "challenge_point_ledger"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_athlete_daily_totals_eventId_userId_localDate_key" ON "challenge_athlete_daily_totals"("eventId", "userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_team_daily_totals_eventId_teamId_localDate_key" ON "challenge_team_daily_totals"("eventId", "teamId", "localDate");

-- CreateIndex
CREATE INDEX "challenge_athlete_event_totals_eventId_distanceMeters_idx" ON "challenge_athlete_event_totals"("eventId", "distanceMeters");

-- CreateIndex
CREATE INDEX "challenge_athlete_event_totals_eventId_points_idx" ON "challenge_athlete_event_totals"("eventId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_athlete_event_totals_eventId_userId_key" ON "challenge_athlete_event_totals"("eventId", "userId");

-- CreateIndex
CREATE INDEX "challenge_team_event_totals_eventId_distanceMeters_idx" ON "challenge_team_event_totals"("eventId", "distanceMeters");

-- CreateIndex
CREATE INDEX "challenge_team_event_totals_eventId_points_idx" ON "challenge_team_event_totals"("eventId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_team_event_totals_eventId_teamId_key" ON "challenge_team_event_totals"("eventId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_webhook_events_providerEventKey_key" ON "challenge_webhook_events"("providerEventKey");

-- CreateIndex
CREATE INDEX "challenge_webhook_events_status_createdAt_idx" ON "challenge_webhook_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "challenge_webhook_events_ownerStravaId_objectId_idx" ON "challenge_webhook_events"("ownerStravaId", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_jobs_dedupeKey_key" ON "challenge_jobs"("dedupeKey");

-- CreateIndex
CREATE INDEX "challenge_jobs_status_runAfter_idx" ON "challenge_jobs"("status", "runAfter");

-- CreateIndex
CREATE INDEX "challenge_audit_logs_eventId_createdAt_idx" ON "challenge_audit_logs"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "challenge_audit_logs_entityType_entityId_idx" ON "challenge_audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "challenge_strava_accounts" ADD CONSTRAINT "challenge_strava_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "challenge_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_events" ADD CONSTRAINT "challenge_events_currentRulesetId_fkey" FOREIGN KEY ("currentRulesetId") REFERENCES "challenge_rulesets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_enrollments" ADD CONSTRAINT "challenge_enrollments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_enrollments" ADD CONSTRAINT "challenge_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "challenge_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_teams" ADD CONSTRAINT "challenge_teams_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_team_memberships" ADD CONSTRAINT "challenge_team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_team_memberships" ADD CONSTRAINT "challenge_team_memberships_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "challenge_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_rulesets" ADD CONSTRAINT "challenge_rulesets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_time_windows" ADD CONSTRAINT "challenge_time_windows_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "challenge_rulesets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_special_days" ADD CONSTRAINT "challenge_special_days_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "challenge_rulesets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activities" ADD CONSTRAINT "challenge_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "challenge_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_revisions" ADD CONSTRAINT "challenge_activity_revisions_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "challenge_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_evaluations" ADD CONSTRAINT "challenge_activity_evaluations_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "challenge_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_evaluations" ADD CONSTRAINT "challenge_activity_evaluations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_evaluations" ADD CONSTRAINT "challenge_activity_evaluations_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "challenge_rulesets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_evaluations" ADD CONSTRAINT "challenge_activity_evaluations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_point_ledger" ADD CONSTRAINT "challenge_point_ledger_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_point_ledger" ADD CONSTRAINT "challenge_point_ledger_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "challenge_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_point_ledger" ADD CONSTRAINT "challenge_point_ledger_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "challenge_activity_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_point_ledger" ADD CONSTRAINT "challenge_point_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "challenge_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_point_ledger" ADD CONSTRAINT "challenge_point_ledger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_point_ledger" ADD CONSTRAINT "challenge_point_ledger_reversesEntryId_fkey" FOREIGN KEY ("reversesEntryId") REFERENCES "challenge_point_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_athlete_daily_totals" ADD CONSTRAINT "challenge_athlete_daily_totals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_athlete_daily_totals" ADD CONSTRAINT "challenge_athlete_daily_totals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "challenge_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_team_daily_totals" ADD CONSTRAINT "challenge_team_daily_totals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_team_daily_totals" ADD CONSTRAINT "challenge_team_daily_totals_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_athlete_event_totals" ADD CONSTRAINT "challenge_athlete_event_totals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_athlete_event_totals" ADD CONSTRAINT "challenge_athlete_event_totals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "challenge_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_team_event_totals" ADD CONSTRAINT "challenge_team_event_totals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_team_event_totals" ADD CONSTRAINT "challenge_team_event_totals_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_webhook_events" ADD CONSTRAINT "challenge_webhook_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_jobs" ADD CONSTRAINT "challenge_jobs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_audit_logs" ADD CONSTRAINT "challenge_audit_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "challenge_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Run once, immediately after create-strava-challenge-schema.sql.
-- Adds PostgreSQL invariants that Prisma cannot represent.
-- No existing Event, Kid Run, Merch or Registration data is changed.


ALTER TABLE "challenge_events"
  ADD CONSTRAINT "challenge_events_valid_period_check" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "challenge_events_default_team_size_check" CHECK ("defaultTeamSize" IS NULL OR "defaultTeamSize" > 0),
  ADD CONSTRAINT "challenge_events_top_count_check" CHECK ("topCount" > 0),
  ADD CONSTRAINT "challenge_events_points_per_km_check" CHECK ("pointsPerKm" > 0);

ALTER TABLE "challenge_enrollments"
  ADD CONSTRAINT "challenge_enrollments_valid_period_check" CHECK ("activeUntil" IS NULL OR "activeUntil" > "activeFrom");

ALTER TABLE "challenge_teams"
  ADD CONSTRAINT "challenge_teams_max_members_check" CHECK ("maxMembers" > 0);

ALTER TABLE "challenge_team_memberships"
  ADD CONSTRAINT "challenge_team_memberships_valid_period_check" CHECK ("leftAt" IS NULL OR "leftAt" > "joinedAt");

ALTER TABLE "challenge_time_windows"
  ADD CONSTRAINT "challenge_time_windows_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
  ADD CONSTRAINT "challenge_time_windows_minutes_check" CHECK (
    "startMinute" BETWEEN 0 AND 1439
    AND "endMinute" BETWEEN 1 AND 1440
    AND "endMinute" > "startMinute"
  );

ALTER TABLE "challenge_special_days"
  ADD CONSTRAINT "challenge_special_days_multiplier_check" CHECK ("multiplier" > 0);

ALTER TABLE "challenge_activities"
  ADD CONSTRAINT "challenge_activities_revision_check" CHECK ("revision" > 0),
  ADD CONSTRAINT "challenge_activities_distance_check" CHECK ("distanceMeters" >= 0),
  ADD CONSTRAINT "challenge_activities_duration_check" CHECK ("movingTimeSeconds" >= 0 AND "elapsedTimeSeconds" >= 0),
  ADD CONSTRAINT "challenge_activities_heart_rate_check" CHECK (
    ("averageHeartRate" IS NULL OR "averageHeartRate" > 0)
    AND ("maxHeartRate" IS NULL OR "maxHeartRate" > 0)
  );

ALTER TABLE "challenge_activity_revisions"
  ADD CONSTRAINT "challenge_activity_revisions_revision_check" CHECK ("revision" > 0);

ALTER TABLE "challenge_activity_evaluations"
  ADD CONSTRAINT "challenge_activity_evaluations_revision_check" CHECK ("activityRevision" > 0),
  ADD CONSTRAINT "challenge_activity_evaluations_distance_check" CHECK (
    "validDistanceMeters" >= 0
    AND "creditedIndividualMeters" >= 0
    AND "creditedTeamMeters" >= 0
    AND "creditedIndividualMeters" <= "validDistanceMeters"
    AND "creditedTeamMeters" <= "validDistanceMeters"
  ),
  ADD CONSTRAINT "challenge_activity_evaluations_points_check" CHECK ("individualPoints" >= 0 AND "teamPoints" >= 0);

ALTER TABLE "challenge_point_ledger"
  ADD CONSTRAINT "challenge_point_ledger_subject_check" CHECK (
    ("subjectType" = 'INDIVIDUAL' AND "teamId" IS NULL)
    OR ("subjectType" = 'TEAM' AND "teamId" IS NOT NULL)
  ),
  ADD CONSTRAINT "challenge_point_ledger_sign_check" CHECK (
    ("entryType" = 'CREDIT' AND "distanceMeters" >= 0 AND "points" >= 0 AND "reversesEntryId" IS NULL)
    OR ("entryType" = 'REVERSAL' AND "distanceMeters" <= 0 AND "points" <= 0 AND "reversesEntryId" IS NOT NULL)
  );

ALTER TABLE "challenge_athlete_daily_totals"
  ADD CONSTRAINT "challenge_athlete_daily_totals_nonnegative_check" CHECK ("distanceMeters" >= 0 AND "points" >= 0);

ALTER TABLE "challenge_team_daily_totals"
  ADD CONSTRAINT "challenge_team_daily_totals_nonnegative_check" CHECK ("distanceMeters" >= 0 AND "points" >= 0);

ALTER TABLE "challenge_athlete_event_totals"
  ADD CONSTRAINT "challenge_athlete_event_totals_nonnegative_check" CHECK ("distanceMeters" >= 0 AND "points" >= 0 AND "acceptedCount" >= 0);

ALTER TABLE "challenge_team_event_totals"
  ADD CONSTRAINT "challenge_team_event_totals_nonnegative_check" CHECK ("distanceMeters" >= 0 AND "points" >= 0 AND "acceptedCount" >= 0);

ALTER TABLE "challenge_webhook_events"
  ADD CONSTRAINT "challenge_webhook_events_attempts_check" CHECK ("attempts" >= 0);

ALTER TABLE "challenge_jobs"
  ADD CONSTRAINT "challenge_jobs_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" > 0);

-- History is retained, but there can be only one current row in each scope.
CREATE UNIQUE INDEX "challenge_enrollments_one_active_user_per_event_key"
  ON "challenge_enrollments"("eventId", "userId")
  WHERE "status" = 'ACTIVE' AND "activeUntil" IS NULL;

CREATE UNIQUE INDEX "challenge_team_memberships_one_active_enrollment_key"
  ON "challenge_team_memberships"("enrollmentId")
  WHERE "status" = 'ACTIVE' AND "leftAt" IS NULL;

CREATE UNIQUE INDEX "challenge_activity_evaluations_one_current_key"
  ON "challenge_activity_evaluations"("activityId", "eventId")
  WHERE "isCurrent" = TRUE;

COMMIT;
