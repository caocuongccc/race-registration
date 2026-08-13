-- XAC NHAN THANH TOAN AO KID RUN THU CONG
-- Campaign duoc khoa cung: cmsctqc1n0001um4g4sqqqwwm
--
-- QUAN TRONG:
-- 1. Chi them dong khi da doi soat giao dich ngan hang.
-- 2. transaction_id phai la ID giao dich that va khong trung.
-- 3. SQL chi cap nhat database, KHONG gui email xac nhan ao.

BEGIN;

CREATE TEMP TABLE manual_kid_run_payments (
  public_code TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount INTEGER NOT NULL
) ON COMMIT DROP;

-- Giao dich mau cua Nguyen Huu Son: thay MANUAL_BANK_TRANSACTION_ID
-- bang transaction ID that truoc khi chay.
INSERT INTO manual_kid_run_payments (public_code, transaction_id, amount)
VALUES
  ('KID1DA1010CE9', 'MANUAL_BANK_TRANSACTION_ID', 316000);

DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM manual_kid_run_payments input
  LEFT JOIN "kid_run_family_applications" application
    ON application."publicCode" = UPPER(input.public_code)
   AND application."campaignId" = 'cmsctqc1n0001um4g4sqqqwwm'
  WHERE application."id" IS NULL
     OR application."shirtTotalAmount" <= 0
     OR input.amount + 1000 < application."shirtTotalAmount"
     OR input.transaction_id = 'MANUAL_BANK_TRANSACTION_ID';

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      'Co % dong khong hop le. Kiem tra ma ho so, so tien va transaction ID that.',
      invalid_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM manual_kid_run_payments input
    JOIN "kid_run_payments" payment
      ON payment."transactionId" = input.transaction_id
  ) THEN
    RAISE EXCEPTION 'Transaction ID da ton tai trong kid_run_payments.';
  END IF;
END $$;

INSERT INTO "kid_run_payments" (
  "id",
  "applicationId",
  "transactionId",
  "amount",
  "status",
  "paymentMethod",
  "createdAt",
  "updatedAt"
)
SELECT
  'manual_' || md5(random()::text || clock_timestamp()::text || input.transaction_id),
  application."id",
  input.transaction_id,
  input.amount,
  'PAID'::"KidRunPaymentStatus",
  'manual_bank_reconciliation',
  NOW(),
  NOW()
FROM manual_kid_run_payments input
JOIN "kid_run_family_applications" application
  ON application."publicCode" = UPPER(input.public_code)
 AND application."campaignId" = 'cmsctqc1n0001um4g4sqqqwwm'
WHERE application."shirtPaymentStatus" <> 'PAID';

UPDATE "kid_run_family_applications" application
SET
  "shirtPaymentStatus" = 'PAID'::"KidRunPaymentStatus",
  "shirtPaymentDate" = NOW(),
  "updatedAt" = NOW()
FROM manual_kid_run_payments input
WHERE application."publicCode" = UPPER(input.public_code)
  AND application."campaignId" = 'cmsctqc1n0001um4g4sqqqwwm'
  AND application."shirtPaymentStatus" <> 'PAID';

SELECT
  application."publicCode",
  application."guardianName",
  application."email",
  application."shirtTotalAmount",
  application."shirtPaymentStatus",
  application."shirtPaymentDate",
  payment."transactionId",
  payment."amount"
FROM "kid_run_family_applications" application
LEFT JOIN "kid_run_payments" payment
  ON payment."applicationId" = application."id"
WHERE application."campaignId" = 'cmsctqc1n0001um4g4sqqqwwm'
  AND application."publicCode" IN (
    SELECT UPPER(public_code) FROM manual_kid_run_payments
  );

COMMIT;

-- De chay hang loat, chi can them cac dong vao VALUES:
-- ('KIDXXXXXXXXXX', 'TRANSACTION_ID_1', 158000),
-- ('KIDYYYYYYYYYY', 'TRANSACTION_ID_2', 316000);
