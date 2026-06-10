ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "requires_shirt_purchase" BOOLEAN NOT NULL DEFAULT false;
