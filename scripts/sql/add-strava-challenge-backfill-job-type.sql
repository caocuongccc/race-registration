-- Run once on the same Supabase project where challenge_jobs exists.
-- Adds one enum value only; does not update or delete existing data.

DO $$
BEGIN
  IF to_regclass('public.challenge_jobs') IS NULL THEN
    RAISE EXCEPTION 'Missing public.challenge_jobs. Run this script in the Supabase project that contains the Strava Challenge tables.';
  END IF;

  IF to_regtype('public."ChallengeJobType"') IS NULL THEN
    RAISE EXCEPTION 'Missing enum public."ChallengeJobType". Check the actual type of public.challenge_jobs.type.';
  END IF;
END $$;

ALTER TYPE public."ChallengeJobType"
  ADD VALUE IF NOT EXISTS 'BACKFILL_ACTIVITIES';

SELECT
  n.nspname AS "schema",
  t.typname AS "enumName",
  ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder) AS "values"
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public'
  AND t.typname = 'ChallengeJobType'
GROUP BY n.nspname, t.typname;