CREATE SEQUENCE IF NOT EXISTS "registrations_registration_number_seq";

ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "registration_number" INTEGER;

WITH numbered AS (
  SELECT
    "id",
    row_number() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "registrations"
  WHERE "registration_number" IS NULL
)
UPDATE "registrations" r
SET "registration_number" = numbered.rn
FROM numbered
WHERE r."id" = numbered."id";

SELECT setval(
  '"registrations_registration_number_seq"',
  GREATEST(
    COALESCE((SELECT MAX("registration_number") FROM "registrations"), 0),
    1
  ),
  COALESCE((SELECT MAX("registration_number") FROM "registrations"), 0) > 0
);

ALTER TABLE "registrations"
ALTER COLUMN "registration_number"
SET DEFAULT nextval('"registrations_registration_number_seq"');

ALTER TABLE "registrations"
ALTER COLUMN "registration_number"
SET NOT NULL;

UPDATE "registrations"
SET "short_code" = regexp_replace("phone", '\D', '', 'g') || ' ' || "registration_number"
WHERE "registration_number" IS NOT NULL;

ALTER SEQUENCE "registrations_registration_number_seq"
OWNED BY "registrations"."registration_number";

CREATE UNIQUE INDEX IF NOT EXISTS "registrations_registration_number_key"
ON "registrations" ("registration_number");
