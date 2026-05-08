ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "short_code" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "registrations_short_code_key"
ON "registrations" ("short_code");
