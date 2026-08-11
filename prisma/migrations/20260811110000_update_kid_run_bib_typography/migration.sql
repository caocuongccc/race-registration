ALTER TABLE "kid_run_race_categories"
  ALTER COLUMN "bibNumberFontSize" SET DEFAULT 245,
  ALTER COLUMN "bibNameFontSize" SET DEFAULT 42;

UPDATE "kid_run_race_categories" category
SET "bibNumberFontSize" = 245,
    "bibNameFontSize" = 42
FROM "kid_run_campaigns" campaign
WHERE category."campaignId" = campaign."id"
  AND campaign."slug" = 'ttce-kid-run-2026'
  AND category."name" IN ('5-6 tuổi', '7-8 tuổi', '9-10 tuổi', '11-12 tuổi');
