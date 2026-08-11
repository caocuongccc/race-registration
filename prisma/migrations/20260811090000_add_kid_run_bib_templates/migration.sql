DROP INDEX IF EXISTS "kid_run_race_categories_campaignId_bibPrefix_key";

ALTER TABLE "kid_run_race_categories"
  ADD COLUMN "bibNumberDigits" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "bibTemplateUrl" TEXT,
  ADD COLUMN "bibTextColor" TEXT,
  ADD COLUMN "bibNumberFontSize" INTEGER NOT NULL DEFAULT 230,
  ADD COLUMN "bibNameFontSize" INTEGER NOT NULL DEFAULT 30;

CREATE INDEX "kid_run_race_categories_campaignId_bibPrefix_idx"
  ON "kid_run_race_categories"("campaignId", "bibPrefix");

UPDATE "kid_run_race_categories" category
SET "bibPrefix" = '158',
    "bibStart" = 1,
    "bibNumberDigits" = 2,
    "bibNumberFontSize" = 230,
    "bibNameFontSize" = 30,
    "bibTemplateUrl" = CASE category."name"
      WHEN '5-6 tuổi' THEN '/template/5-6.png'
      WHEN '7-8 tuổi' THEN '/template/7-8.png'
      WHEN '9-10 tuổi' THEN '/template/9-10.png'
      WHEN '11-12 tuổi' THEN '/template/11-12.png'
    END,
    "bibTextColor" = CASE category."name"
      WHEN '5-6 tuổi' THEN '#0f4e1e'
      WHEN '7-8 tuổi' THEN '#ffc600'
      WHEN '9-10 tuổi' THEN '#f85906'
      WHEN '11-12 tuổi' THEN '#86c0ed'
    END
FROM "kid_run_campaigns" campaign
WHERE category."campaignId" = campaign."id"
  AND campaign."slug" = 'ttce-kid-run-2026'
  AND category."name" IN ('5-6 tuổi', '7-8 tuổi', '9-10 tuổi', '11-12 tuổi');

WITH numbered AS (
  SELECT participant."id", participant."categoryId",
         ROW_NUMBER() OVER (PARTITION BY participant."categoryId" ORDER BY participant."createdAt", participant."id") AS number
  FROM "kid_run_participants" participant
  INNER JOIN "kid_run_race_categories" category ON category."id" = participant."categoryId"
  INNER JOIN "kid_run_campaigns" campaign ON campaign."id" = category."campaignId"
  WHERE campaign."slug" = 'ttce-kid-run-2026'
    AND category."name" IN ('5-6 tuổi', '7-8 tuổi', '9-10 tuổi', '11-12 tuổi')
    AND participant."bibNumber" IS NOT NULL
)
UPDATE "kid_run_participants" participant
SET "bibNumber" = '158' || LPAD(numbered.number::TEXT, 2, '0'),
    "updatedAt" = NOW()
FROM numbered
WHERE participant."id" = numbered."id";

UPDATE "kid_run_race_categories" category
SET "nextBibNumber" = counts.used + 1,
    "remainingBibCount" = GREATEST(0, category."bibCapacity" - counts.used)
FROM (
  SELECT category."id", COUNT(participant."id")::INTEGER AS used
  FROM "kid_run_race_categories" category
  INNER JOIN "kid_run_campaigns" campaign ON campaign."id" = category."campaignId"
  LEFT JOIN "kid_run_participants" participant
    ON participant."categoryId" = category."id" AND participant."bibNumber" IS NOT NULL
  WHERE campaign."slug" = 'ttce-kid-run-2026'
    AND category."name" IN ('5-6 tuổi', '7-8 tuổi', '9-10 tuổi', '11-12 tuổi')
  GROUP BY category."id"
) counts
WHERE category."id" = counts."id";
