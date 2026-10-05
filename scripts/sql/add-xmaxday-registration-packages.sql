-- Run once on Supabase before deploying the XmaxDay package/sock flow.
-- This migration only adds columns/table and preserves all existing registrations.

BEGIN;

DO $$
BEGIN
  CREATE TYPE "RegistrationPackage" AS ENUM ('BASIC', 'FINISHER_SHIRT', 'FINISHER_SHIRT_SOCKS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "finisher_shirt_price" INTEGER NOT NULL DEFAULT 200000,
  ADD COLUMN IF NOT EXISTS "finisher_shirt_sock_price" INTEGER NOT NULL DEFAULT 230000;

ALTER TABLE "registrations"
  ADD COLUMN IF NOT EXISTS "registration_package" "RegistrationPackage" NOT NULL DEFAULT 'BASIC',
  ADD COLUMN IF NOT EXISTS "package_fee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sock_option_id" TEXT;

CREATE TABLE IF NOT EXISTS "event_sock_options" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color_code" TEXT NOT NULL,
  "image_url" TEXT,
  "price" INTEGER NOT NULL DEFAULT 30000,
  "stock_quantity" INTEGER,
  "sold_quantity" INTEGER NOT NULL DEFAULT 0,
  "is_available" BOOLEAN NOT NULL DEFAULT TRUE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_sock_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_sock_options_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "event_sock_options_price_check" CHECK ("price" >= 0),
  CONSTRAINT "event_sock_options_stock_check" CHECK ("stock_quantity" IS NULL OR "stock_quantity" >= 0),
  CONSTRAINT "event_sock_options_sold_check" CHECK ("sold_quantity" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_sock_options_eventId_name_key"
  ON "event_sock_options"("eventId", "name");
CREATE INDEX IF NOT EXISTS "event_sock_options_eventId_is_available_idx"
  ON "event_sock_options"("eventId", "is_available");
CREATE INDEX IF NOT EXISTS "registrations_sock_option_id_idx"
  ON "registrations"("sock_option_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registrations_sock_option_id_fkey'
  ) THEN
    ALTER TABLE "registrations"
      ADD CONSTRAINT "registrations_sock_option_id_fkey"
      FOREIGN KEY ("sock_option_id") REFERENCES "event_sock_options"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "events"
  DROP CONSTRAINT IF EXISTS "events_finisher_package_prices_check";
ALTER TABLE "events"
  ADD CONSTRAINT "events_finisher_package_prices_check"
  CHECK (
    "finisher_shirt_price" >= 0
    AND "finisher_shirt_sock_price" >= "finisher_shirt_price"
  );

ALTER TABLE "registrations"
  DROP CONSTRAINT IF EXISTS "registrations_package_fee_check";
ALTER TABLE "registrations"
  ADD CONSTRAINT "registrations_package_fee_check" CHECK ("package_fee" >= 0);

COMMIT;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('events', 'registrations')
  AND column_name IN (
    'finisher_shirt_price',
    'finisher_shirt_sock_price',
    'registration_package',
    'package_fee',
    'sock_option_id'
  )
ORDER BY table_name, ordinal_position;