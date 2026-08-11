-- CANH BAO: Script nay xoa vinh vien TOAN BO DU LIEU DANG KY cua:
--   Mid-Autumn Kids Runs (slug: ttce-kid-run-2026)
--
-- Script KHONG xoa cau hinh campaign, nhom tuoi/BIB, waiver, ao,
-- tai khoan ngan hang, hinh anh hay nguoi quan tri campaign.
-- Chay toan bo file mot lan trong PostgreSQL/Supabase SQL Editor.

BEGIN;

-- Khoa an toan: dung ngay neu slug khong ton tai hoac ten campaign khong khop.
DO $$
DECLARE
  matched_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO matched_count
  FROM "kid_run_campaigns"
  WHERE "slug" = 'ttce-kid-run-2026'
    AND "name" = 'Mid-Autumn Kids Runs';

  IF matched_count <> 1 THEN
    RAISE EXCEPTION
      'Khong xoa: can dung 1 campaign co slug ttce-kid-run-2026 va ten Mid-Autumn Kids Runs, tim thay %.',
      matched_count;
  END IF;
END $$;

CREATE TEMP TABLE "target_kid_run_campaign" ON COMMIT DROP AS
SELECT "id"
FROM "kid_run_campaigns"
WHERE "slug" = 'ttce-kid-run-2026'
  AND "name" = 'Mid-Autumn Kids Runs';

-- Xoa webhook truoc vi khoa ngoai cua bang nay dung ON DELETE SET NULL.
DELETE FROM "kid_run_webhook_logs" webhook
WHERE webhook."campaignId" IN (
    SELECT "id" FROM "target_kid_run_campaign"
  )
  OR webhook."applicationId" IN (
    SELECT application."id"
    FROM "kid_run_family_applications" application
    WHERE application."campaignId" IN (
      SELECT "id" FROM "target_kid_run_campaign"
    )
  );

-- Xoa ho so dang ky. Cac bang participant, participant_shirt, payment,
-- checkin_log va email_log se duoc xoa theo ON DELETE CASCADE.
DELETE FROM "kid_run_family_applications"
WHERE "campaignId" IN (
  SELECT "id" FROM "target_kid_run_campaign"
);

-- Dua bo dem BIB cua 4 nhom dang mo ve gia tri ban dau.
-- Khong thay doi prefix, template, mau, font, suc chua hay nhom __UNASSIGNED__.
UPDATE "kid_run_race_categories" category
SET
  "nextBibNumber" = category."bibStart",
  "remainingBibCount" = category."bibCapacity",
  "updatedAt" = NOW()
WHERE category."campaignId" IN (
    SELECT "id" FROM "target_kid_run_campaign"
  )
  AND category."isAvailable" = TRUE
  AND category."name" <> '__UNASSIGNED__';

-- Tinh lai tong BIB campaign tu cac nhom dang mo (hien tai du kien 200 BIB).
UPDATE "kid_run_campaigns" campaign
SET
  "bibCapacity" = totals.capacity,
  "remainingBibCount" = totals.capacity,
  "updatedAt" = NOW()
FROM (
  SELECT
    category."campaignId",
    COALESCE(SUM(category."bibCapacity"), 0)::INTEGER AS capacity
  FROM "kid_run_race_categories" category
  WHERE category."campaignId" IN (
      SELECT "id" FROM "target_kid_run_campaign"
    )
    AND category."isAvailable" = TRUE
    AND category."name" <> '__UNASSIGNED__'
  GROUP BY category."campaignId"
) totals
WHERE campaign."id" = totals."campaignId";

-- Chan COMMIT neu van con ho so hoac webhook cua campaign dich.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "kid_run_family_applications"
    WHERE "campaignId" IN (SELECT "id" FROM "target_kid_run_campaign")
  ) OR EXISTS (
    SELECT 1
    FROM "kid_run_webhook_logs"
    WHERE "campaignId" IN (SELECT "id" FROM "target_kid_run_campaign")
  ) THEN
    RAISE EXCEPTION 'Xoa chua sach; transaction da bi huy.';
  END IF;
END $$;

-- Ket qua kiem tra se hien trong SQL Editor truoc khi transaction ket thuc.
SELECT
  campaign."name",
  campaign."slug",
  campaign."bibCapacity",
  campaign."remainingBibCount",
  (
    SELECT COUNT(*)
    FROM "kid_run_family_applications" application
    WHERE application."campaignId" = campaign."id"
  ) AS "applicationsRemaining"
FROM "kid_run_campaigns" campaign
WHERE campaign."id" IN (SELECT "id" FROM "target_kid_run_campaign");

SELECT
  category."name",
  category."bibPrefix",
  category."bibStart",
  category."nextBibNumber",
  category."bibCapacity",
  category."remainingBibCount",
  category."isAvailable"
FROM "kid_run_race_categories" category
WHERE category."campaignId" IN (SELECT "id" FROM "target_kid_run_campaign")
ORDER BY category."sortOrder", category."name";

COMMIT;
