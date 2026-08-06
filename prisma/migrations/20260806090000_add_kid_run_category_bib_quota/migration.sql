ALTER TABLE "kid_run_race_categories" ADD COLUMN IF NOT EXISTS "bibCapacity" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "kid_run_race_categories" ADD COLUMN IF NOT EXISTS "remainingBibCount" INTEGER NOT NULL DEFAULT 50;
