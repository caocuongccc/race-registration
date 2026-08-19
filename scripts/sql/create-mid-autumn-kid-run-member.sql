-- TAO TAI KHOAN MEMBER CHO 2 MENU:
--   1. Cong ban ao (toan bo campaign ao do he thong chua phan quyen theo campaign)
--   2. Kid Run (chi campaign duoc gan ben duoi)
--
-- Cach dung:
--   - Sua member_email, member_password, member_name neu can.
--   - Chay TOAN BO file mot lan trong Supabase SQL Editor.
--   - Script KHONG xoa du lieu dang ky, don hang, BIB hay campaign.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  member_email CONSTANT TEXT := 'trmyduyen007@gmail.com';
  member_password CONSTANT TEXT := '';
  member_name CONSTANT TEXT := 'Nhan vien Ao Trung Thu va Kid Run';
  kid_run_campaign_id CONSTANT TEXT := 'cmsctqc1n0001um4g4sqqqwwm';
  target_user_id TEXT;
  existing_role TEXT;
BEGIN
  IF member_email = 'member@example.com' THEN
    RAISE EXCEPTION 'Hay thay member_email truoc khi chay script.';
  END IF;

  IF length(member_password) < 10 THEN
    RAISE EXCEPTION 'Mat khau phai co it nhat 10 ky tu.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "kid_run_campaigns"
    WHERE "id" = kid_run_campaign_id
  ) THEN
    RAISE EXCEPTION 'Khong tim thay Kid Run campaign id %.', kid_run_campaign_id;
  END IF;

  SELECT "id", "role"::TEXT
  INTO target_user_id, existing_role
  FROM "users"
  WHERE lower("email") = lower(member_email)
  FOR UPDATE;

  IF target_user_id IS NOT NULL AND existing_role <> 'MEMBER' THEN
    RAISE EXCEPTION
      'Email % da ton tai voi role %. Script khong tu dong ha quyen tai khoan.',
      member_email,
      existing_role;
  END IF;

  IF target_user_id IS NULL THEN
    target_user_id := gen_random_uuid()::TEXT;

    INSERT INTO "users" (
      "id",
      "email",
      "password",
      "name",
      "role",
      "createdAt",
      "updatedAt"
    ) VALUES (
      target_user_id,
      lower(member_email),
      extensions.crypt(member_password, extensions.gen_salt('bf', 10)),
      member_name,
      'MEMBER'::"UserRole",
      NOW(),
      NOW()
    );
  ELSE
    UPDATE "users"
    SET
      "name" = member_name,
      "password" = extensions.crypt(
        member_password,
        extensions.gen_salt('bf', 10)
      ),
      "updatedAt" = NOW()
    WHERE "id" = target_user_id;
  END IF;

  INSERT INTO "kid_run_campaign_users" (
    "id",
    "campaignId",
    "userId",
    "createdAt"
  ) VALUES (
    gen_random_uuid()::TEXT,
    kid_run_campaign_id,
    target_user_id,
    NOW()
  )
  ON CONFLICT ("campaignId", "userId") DO NOTHING;
END $$;

COMMIT;

-- Ket qua kiem tra quyen sau khi tao.
SELECT
  user_account."id",
  user_account."name",
  user_account."email",
  user_account."role",
  campaign."id" AS "kidRunCampaignId",
  campaign."name" AS "kidRunCampaignName",
  campaign."slug" AS "kidRunCampaignSlug"
FROM "users" user_account
LEFT JOIN "kid_run_campaign_users" access
  ON access."userId" = user_account."id"
LEFT JOIN "kid_run_campaigns" campaign
  ON campaign."id" = access."campaignId"
WHERE campaign."id" = 'cmsctqc1n0001um4g4sqqqwwm'
  AND user_account."role" = 'MEMBER'::"UserRole"
ORDER BY user_account."updatedAt" DESC;

