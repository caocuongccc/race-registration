-- READ-ONLY verification after create-strava-challenge.sql.

SELECT
  COUNT(*)::INTEGER AS "challengeTableCount",
  ARRAY_AGG(table_name ORDER BY table_name) AS "challengeTables"
FROM information_schema.tables
WHERE table_schema = current_schema()
  AND table_name LIKE 'challenge\_%' ESCAPE '\';

SELECT
  t.typname AS "enumName",
  ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder) AS "values"
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname LIKE 'Challenge%'
GROUP BY t.typname
ORDER BY t.typname;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = current_schema()
  AND indexname IN (
    'challenge_enrollments_one_active_user_per_event_key',
    'challenge_team_memberships_one_active_enrollment_key',
    'challenge_activity_evaluations_one_current_key'
  )
ORDER BY indexname;

