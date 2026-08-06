BEGIN;

ALTER TABLE "kid_run_race_categories"
  ADD COLUMN IF NOT EXISTS "bibCapacity" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "remainingBibCount" INTEGER NOT NULL DEFAULT 50;

WITH target AS (
  SELECT id FROM "kid_run_campaigns" WHERE slug = 'ttce-kid-run-2026'
)
UPDATE "kid_run_race_categories"
SET "isAvailable" = false
WHERE "campaignId" = (SELECT id FROM target)
  AND name <> '__UNASSIGNED__';

WITH target AS (SELECT id FROM "kid_run_campaigns" WHERE slug = 'ttce-kid-run-2026'),
groups(name, min_year, max_year, label, prefix, sort_order) AS (
  VALUES
    ('3-5 tuổi', 2021, 2023, 'Nhóm 3-5 tuổi', 'K035-', 0),
    ('6-8 tuổi', 2018, 2020, 'Nhóm 6-8 tuổi', 'K068-', 1),
    ('9-10 tuổi', 2016, 2017, 'Nhóm 9-10 tuổi', 'K910-', 2),
    ('11-12 tuổi', 2014, 2015, 'Nhóm 11-12 tuổi', 'K112-', 3)
)
INSERT INTO "kid_run_race_categories" (
  id, "campaignId", name, "minBirthYear", "maxBirthYear", "distanceLabel",
  "bibPrefix", "bibStart", "nextBibNumber", "bibCapacity", "remainingBibCount",
  "isAvailable", "sortOrder", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, target.id, groups.name, min_year, max_year, label,
  prefix, 1, 1, 50, 50, true, sort_order, NOW(), NOW()
FROM target CROSS JOIN groups
ON CONFLICT ("campaignId", name) DO UPDATE SET
  "minBirthYear" = EXCLUDED."minBirthYear",
  "maxBirthYear" = EXCLUDED."maxBirthYear",
  "distanceLabel" = EXCLUDED."distanceLabel",
  "bibPrefix" = EXCLUDED."bibPrefix",
  "bibCapacity" = 50,
  "remainingBibCount" = GREATEST(0, 50 - (
    SELECT COUNT(*)::INTEGER FROM "kid_run_participants" p
    WHERE p."categoryId" = "kid_run_race_categories".id
  )),
  "isAvailable" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

UPDATE "kid_run_race_categories"
SET "bibCapacity" = 0, "remainingBibCount" = 0, "isAvailable" = false
WHERE "campaignId" = (SELECT id FROM "kid_run_campaigns" WHERE slug = 'ttce-kid-run-2026')
  AND name = '__UNASSIGNED__';

UPDATE "kid_run_campaigns" c
SET "bibCapacity" = totals.capacity,
    "remainingBibCount" = totals.remaining,
    "allowRegistration" = CASE WHEN totals.remaining > 0 THEN c."allowRegistration" ELSE false END,
    "updatedAt" = NOW()
FROM (
  SELECT "campaignId", SUM("bibCapacity")::INTEGER capacity, SUM("remainingBibCount")::INTEGER remaining
  FROM "kid_run_race_categories"
  WHERE "isAvailable" = true AND name <> '__UNASSIGNED__'
  GROUP BY "campaignId"
) totals
WHERE c.id = totals."campaignId" AND c.slug = 'ttce-kid-run-2026';

COMMIT;
