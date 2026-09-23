-- Run once on Supabase before deploying the optional finisher donation flow.
-- Adds configuration only; does not update or delete existing registrations.
BEGIN;

ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "enable_optional_finisher_donation" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "min_finisher_donation" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "events"
DROP CONSTRAINT IF EXISTS "events_min_finisher_donation_check";

ALTER TABLE "events" ADD CONSTRAINT "events_min_finisher_donation_check" CHECK ("min_finisher_donation" >= 0);

COMMIT;

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'events'
  AND column_name IN (
    'enable_optional_finisher_donation',
    'min_finisher_donation'
  )
ORDER BY
  column_name;