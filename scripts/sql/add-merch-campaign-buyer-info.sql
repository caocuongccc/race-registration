ALTER TABLE "merch_campaigns"
ADD COLUMN IF NOT EXISTS "buyerNote" TEXT;

ALTER TABLE "merch_campaigns"
ADD COLUMN IF NOT EXISTS "sizeGuideImageUrl" TEXT;

ALTER TABLE "merch_campaigns"
ADD COLUMN IF NOT EXISTS "sizeGuideCloudinaryPublicId" TEXT;

UPDATE "merch_campaigns"
SET "buyerNote" = U&'To\00E0n b\1ED9 ti\1EC1n b\00E1n \00E1o sau khi tr\1EEB chi ph\00ED s\1EA3n xu\1EA5t s\1EBD \0111\01B0\1EE3c n\1ED9p v\00E0o Qu\1EF9 TTCE HKR.'
WHERE "slug" = 'trung-thu-cho-em-2026'
  AND ("buyerNote" IS NULL OR BTRIM("buyerNote") = '');

SELECT
  "id",
  "name",
  "buyerNote",
  "sizeGuideImageUrl"
FROM "merch_campaigns"
WHERE "slug" = 'trung-thu-cho-em-2026';