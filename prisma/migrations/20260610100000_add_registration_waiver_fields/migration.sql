ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "require_waiver" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "waiver_title" TEXT;

ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "waiver_content" TEXT;

ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "waiver_version" TEXT;

ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "waiver_accepted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "waiver_accepted_at" TIMESTAMP(3);

ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "waiver_version" TEXT;
