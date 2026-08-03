BEGIN;

ALTER TABLE "kid_run_campaigns"
ADD COLUMN IF NOT EXISTS "bibCapacity" INTEGER NOT NULL DEFAULT 150;

ALTER TABLE "kid_run_campaigns"
ADD COLUMN IF NOT EXISTS "remainingBibCount" INTEGER NOT NULL DEFAULT 150;

WITH registered AS (
  SELECT
    application."campaignId",
    COUNT(participant."id")::INTEGER AS participant_count
  FROM "kid_run_family_applications" application
  LEFT JOIN "kid_run_participants" participant
    ON participant."applicationId" = application."id"
  WHERE application."status" = 'CONFIRMED'
  GROUP BY application."campaignId"
)
UPDATE "kid_run_campaigns" campaign
SET
  "remainingBibCount" = GREATEST(
    0,
    campaign."bibCapacity" - COALESCE(registered.participant_count, 0)
  ),
  "allowRegistration" = CASE
    WHEN campaign."bibCapacity" - COALESCE(registered.participant_count, 0) > 0
      THEN campaign."allowRegistration"
    ELSE false
  END,
  "updatedAt" = NOW()
FROM registered
WHERE registered."campaignId" = campaign."id";

UPDATE "kid_run_campaigns" campaign
SET
  "remainingBibCount" = campaign."bibCapacity",
  "updatedAt" = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "kid_run_family_applications" application
  WHERE application."campaignId" = campaign."id"
    AND application."status" = 'CONFIRMED'
);

COMMIT;

SELECT
  "id",
  "name",
  "slug",
  "bibCapacity",
  "remainingBibCount",
  "allowRegistration"
FROM "kid_run_campaigns"
ORDER BY "createdAt" DESC;