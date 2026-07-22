BEGIN;

ALTER TABLE "merch_shirt_styles"
ADD COLUMN IF NOT EXISTS "backImageUrl" TEXT;

ALTER TABLE "merch_shirt_styles"
ADD COLUMN IF NOT EXISTS "backCloudinaryPublicId" TEXT;

COMMIT;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'merch_shirt_styles'
  AND column_name IN ('backImageUrl', 'backCloudinaryPublicId')
ORDER BY column_name;