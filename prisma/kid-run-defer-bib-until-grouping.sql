BEGIN;

ALTER TABLE "kid_run_participants" ALTER COLUMN "bibNumber" DROP NOT NULL;

UPDATE "kid_run_participants" participant
SET "bibNumber" = NULL, "updatedAt" = NOW()
FROM "kid_run_race_categories" category
WHERE participant."categoryId" = category."id"
  AND category."name" = '__UNASSIGNED__';

ALTER TYPE "KidRunEmailType" ADD VALUE IF NOT EXISTS 'BIB_ANNOUNCEMENT';

COMMIT;

SELECT COUNT(*) FILTER (WHERE "bibNumber" IS NULL) AS waiting_for_bib, COUNT(*) FILTER (WHERE "bibNumber" IS NOT NULL) AS issued_bib FROM "kid_run_participants";
