ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "allow_standalone_shirt_sale" BOOLEAN NOT NULL DEFAULT true;
