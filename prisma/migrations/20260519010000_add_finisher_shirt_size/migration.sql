ALTER TABLE "distances"
ADD COLUMN IF NOT EXISTS "requires_finisher_shirt" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "finisher_shirt_size" "ShirtSize";

ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "finisher_shirt_category" "ShirtCategory";

ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "finisher_shirt_type" "ShirtType";

CREATE INDEX IF NOT EXISTS "registrations_finisher_shirt_size_idx"
ON "registrations"("finisher_shirt_size");
