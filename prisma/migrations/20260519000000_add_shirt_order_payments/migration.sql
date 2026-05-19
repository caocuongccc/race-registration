DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'PaymentPurpose'
  ) THEN
    CREATE TYPE "PaymentPurpose" AS ENUM ('REGISTRATION', 'SHIRT_ORDER');
  END IF;
END $$;

ALTER TABLE "shirt_orders"
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "fullName" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "payments"
ALTER COLUMN "registrationId" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "shirtOrderId" TEXT,
ADD COLUMN IF NOT EXISTS "purpose" "PaymentPurpose" NOT NULL DEFAULT 'REGISTRATION';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_shirtOrderId_fkey'
  ) THEN
    ALTER TABLE "payments"
    ADD CONSTRAINT "payments_shirtOrderId_fkey"
    FOREIGN KEY ("shirtOrderId") REFERENCES "shirt_orders"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shirt_orders_email_idx" ON "shirt_orders"("email");
CREATE INDEX IF NOT EXISTS "shirt_orders_phone_idx" ON "shirt_orders"("phone");
CREATE INDEX IF NOT EXISTS "shirt_orders_fullName_idx" ON "shirt_orders"("fullName");
CREATE INDEX IF NOT EXISTS "payments_shirtOrderId_idx" ON "payments"("shirtOrderId");
CREATE INDEX IF NOT EXISTS "payments_purpose_idx" ON "payments"("purpose");
