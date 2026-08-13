-- CHAY MOT LAN TREN SUPABASE TRUOC KHI DEPLOY CODE CO NUT HUY BIB.
-- Script chi them enum, cot va index; KHONG xoa hay cap nhat BIB hien co.

BEGIN;

DO $$
BEGIN
  CREATE TYPE "KidRunBibStatus" AS ENUM ('ACTIVE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "kid_run_participants"
  ADD COLUMN IF NOT EXISTS "bibStatus" "KidRunBibStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "bibCancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bibCancelledBy" TEXT,
  ADD COLUMN IF NOT EXISTS "bibCancelReason" TEXT;

CREATE INDEX IF NOT EXISTS "kid_run_participants_categoryId_bibStatus_idx"
  ON "kid_run_participants"("categoryId", "bibStatus");

COMMIT;

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'kid_run_participants'
  AND column_name IN (
    'bibStatus',
    'bibCancelledAt',
    'bibCancelledBy',
    'bibCancelReason'
  )
ORDER BY column_name;
