CREATE TYPE "KidRunCampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');
CREATE TYPE "KidRunRegistrationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TYPE "KidRunPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "KidRunGender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "KidRunEmailType" AS ENUM ('REGISTRATION_CONFIRMED', 'BIB_ANNOUNCEMENT', 'SHIRT_PAYMENT_CONFIRMED');
CREATE TYPE "KidRunEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "kid_run_campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "location" TEXT NOT NULL,
  "status" "KidRunCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "allowRegistration" BOOLEAN NOT NULL DEFAULT false,
  "requireOnlinePayment" BOOLEAN NOT NULL DEFAULT true,
  "bankName" TEXT,
  "bankAccount" TEXT,
  "bankHolder" TEXT,
  "bankCode" TEXT,
  "heroImageUrl" TEXT,
  "heroCloudinaryPublicId" TEXT,
  "bibPickupNote" TEXT,
  "shirtBuyerNote" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "maxChildrenPerApplication" INTEGER NOT NULL DEFAULT 5,
  "bibCapacity" INTEGER NOT NULL DEFAULT 150,
  "remainingBibCount" INTEGER NOT NULL DEFAULT 150,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_campaign_images" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "cloudinaryPublicId" TEXT,
  "caption" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kid_run_campaign_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_race_categories" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minBirthYear" INTEGER NOT NULL,
  "maxBirthYear" INTEGER NOT NULL,
  "distanceLabel" TEXT NOT NULL,
  "bibPrefix" TEXT NOT NULL,
  "bibStart" INTEGER NOT NULL DEFAULT 1,
  "nextBibNumber" INTEGER NOT NULL DEFAULT 1,
  "bibCapacity" INTEGER NOT NULL DEFAULT 50,
  "remainingBibCount" INTEGER NOT NULL DEFAULT 50,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_race_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_waivers" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_waivers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_family_applications" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "publicCode" TEXT NOT NULL,
  "secretCodeHash" TEXT NOT NULL,
  "guardianName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "notes" TEXT,
  "status" "KidRunRegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "bibQrToken" TEXT NOT NULL,
  "waiverId" TEXT NOT NULL,
  "waiverVersion" TEXT NOT NULL,
  "waiverAcceptedAt" TIMESTAMP(3) NOT NULL,
  "waiverAcceptedIp" TEXT,
  "waiverUserAgent" TEXT,
  "mediaConsent" BOOLEAN NOT NULL DEFAULT false,
  "shirtTotalAmount" INTEGER NOT NULL DEFAULT 0,
  "shirtPaymentStatus" "KidRunPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "shirtPaymentDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_family_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_participants" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "dateOfBirth" DATE NOT NULL,
  "birthYear" INTEGER NOT NULL,
  "gender" "KidRunGender" NOT NULL,
  "schoolClub" TEXT,
  "bibNumber" TEXT,
  "bibCollectedAt" TIMESTAMP(3),
  "bibCollectedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_shirt_styles" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "ShirtCategory" NOT NULL,
  "type" "ShirtType" NOT NULL,
  "price" INTEGER NOT NULL,
  "frontImageUrl" TEXT,
  "frontCloudinaryPublicId" TEXT,
  "backImageUrl" TEXT,
  "backCloudinaryPublicId" TEXT,
  "sizeGuideImageUrl" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_shirt_styles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_shirt_variants" (
  "id" TEXT NOT NULL,
  "styleId" TEXT NOT NULL,
  "size" "ShirtSize" NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_shirt_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_participant_shirts" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "styleId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "styleName" TEXT NOT NULL,
  "category" "ShirtCategory" NOT NULL,
  "type" "ShirtType" NOT NULL,
  "size" "ShirtSize" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL,
  "totalPrice" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kid_run_participant_shirts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_payments" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "transactionId" TEXT,
  "amount" INTEGER NOT NULL,
  "status" "KidRunPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT,
  "webhookData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_checkin_logs" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "participantId" TEXT,
  "action" TEXT NOT NULL,
  "performedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kid_run_checkin_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_email_logs" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "KidRunEmailType" NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT,
  "status" "KidRunEmailStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kid_run_email_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_webhook_logs" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT,
  "applicationId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'sepay',
  "event" TEXT NOT NULL,
  "transactionId" TEXT,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kid_run_webhook_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kid_run_campaign_users" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kid_run_campaign_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kid_run_campaigns_slug_key" ON "kid_run_campaigns"("slug");
CREATE INDEX "kid_run_campaigns_status_isPublished_idx" ON "kid_run_campaigns"("status", "isPublished");
CREATE INDEX "kid_run_campaign_images_campaignId_idx" ON "kid_run_campaign_images"("campaignId", "sortOrder");
CREATE UNIQUE INDEX "kid_run_race_categories_campaignId_name_key" ON "kid_run_race_categories"("campaignId", "name");
CREATE UNIQUE INDEX "kid_run_race_categories_campaignId_bibPrefix_key" ON "kid_run_race_categories"("campaignId", "bibPrefix");
CREATE INDEX "kid_run_race_categories_campaignId_isAvailable_idx" ON "kid_run_race_categories"("campaignId", "isAvailable");
CREATE UNIQUE INDEX "kid_run_waivers_campaignId_version_key" ON "kid_run_waivers"("campaignId", "version");
CREATE INDEX "kid_run_waivers_campaignId_isActive_idx" ON "kid_run_waivers"("campaignId", "isActive");
CREATE UNIQUE INDEX "kid_run_family_applications_publicCode_key" ON "kid_run_family_applications"("publicCode");
CREATE UNIQUE INDEX "kid_run_family_applications_bibQrToken_key" ON "kid_run_family_applications"("bibQrToken");
CREATE INDEX "kid_run_family_applications_campaignId_createdAt_idx" ON "kid_run_family_applications"("campaignId", "createdAt");
CREATE INDEX "kid_run_family_applications_campaignId_shirtPaymentStatus_idx" ON "kid_run_family_applications"("campaignId", "shirtPaymentStatus");
CREATE INDEX "kid_run_family_applications_email_idx" ON "kid_run_family_applications"("email");
CREATE INDEX "kid_run_family_applications_phone_idx" ON "kid_run_family_applications"("phone");
CREATE UNIQUE INDEX "kid_run_participants_categoryId_bibNumber_key" ON "kid_run_participants"("categoryId", "bibNumber");
CREATE INDEX "kid_run_participants_applicationId_idx" ON "kid_run_participants"("applicationId");
CREATE INDEX "kid_run_participants_categoryId_idx" ON "kid_run_participants"("categoryId");
CREATE UNIQUE INDEX "kid_run_shirt_styles_campaignId_name_category_type_key" ON "kid_run_shirt_styles"("campaignId", "name", "category", "type");
CREATE INDEX "kid_run_shirt_styles_campaignId_isAvailable_idx" ON "kid_run_shirt_styles"("campaignId", "isAvailable");
CREATE UNIQUE INDEX "kid_run_shirt_variants_styleId_size_key" ON "kid_run_shirt_variants"("styleId", "size");
CREATE INDEX "kid_run_participant_shirts_applicationId_idx" ON "kid_run_participant_shirts"("applicationId");
CREATE INDEX "kid_run_participant_shirts_participantId_idx" ON "kid_run_participant_shirts"("participantId");
CREATE UNIQUE INDEX "kid_run_payments_transactionId_key" ON "kid_run_payments"("transactionId");
CREATE INDEX "kid_run_payments_applicationId_status_idx" ON "kid_run_payments"("applicationId", "status");
CREATE INDEX "kid_run_checkin_logs_applicationId_createdAt_idx" ON "kid_run_checkin_logs"("applicationId", "createdAt");
CREATE INDEX "kid_run_email_logs_applicationId_type_idx" ON "kid_run_email_logs"("applicationId", "type");
CREATE INDEX "kid_run_webhook_logs_status_nextRetryAt_idx" ON "kid_run_webhook_logs"("status", "nextRetryAt");
CREATE UNIQUE INDEX "kid_run_campaign_users_campaignId_userId_key" ON "kid_run_campaign_users"("campaignId", "userId");
CREATE INDEX "kid_run_campaign_users_userId_idx" ON "kid_run_campaign_users"("userId");

ALTER TABLE "kid_run_campaigns" ADD CONSTRAINT "kid_run_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kid_run_campaign_images" ADD CONSTRAINT "kid_run_campaign_images_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "kid_run_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_race_categories" ADD CONSTRAINT "kid_run_race_categories_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "kid_run_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_waivers" ADD CONSTRAINT "kid_run_waivers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "kid_run_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_family_applications" ADD CONSTRAINT "kid_run_family_applications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "kid_run_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kid_run_family_applications" ADD CONSTRAINT "kid_run_family_applications_waiverId_fkey" FOREIGN KEY ("waiverId") REFERENCES "kid_run_waivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kid_run_participants" ADD CONSTRAINT "kid_run_participants_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "kid_run_family_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_participants" ADD CONSTRAINT "kid_run_participants_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "kid_run_race_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kid_run_shirt_styles" ADD CONSTRAINT "kid_run_shirt_styles_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "kid_run_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_shirt_variants" ADD CONSTRAINT "kid_run_shirt_variants_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "kid_run_shirt_styles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_participant_shirts" ADD CONSTRAINT "kid_run_participant_shirts_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "kid_run_family_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_participant_shirts" ADD CONSTRAINT "kid_run_participant_shirts_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "kid_run_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_participant_shirts" ADD CONSTRAINT "kid_run_participant_shirts_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "kid_run_shirt_styles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kid_run_participant_shirts" ADD CONSTRAINT "kid_run_participant_shirts_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "kid_run_shirt_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kid_run_payments" ADD CONSTRAINT "kid_run_payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "kid_run_family_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_checkin_logs" ADD CONSTRAINT "kid_run_checkin_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "kid_run_family_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_checkin_logs" ADD CONSTRAINT "kid_run_checkin_logs_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "kid_run_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kid_run_email_logs" ADD CONSTRAINT "kid_run_email_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "kid_run_family_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_webhook_logs" ADD CONSTRAINT "kid_run_webhook_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "kid_run_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kid_run_webhook_logs" ADD CONSTRAINT "kid_run_webhook_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "kid_run_family_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kid_run_campaign_users" ADD CONSTRAINT "kid_run_campaign_users_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "kid_run_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kid_run_campaign_users" ADD CONSTRAINT "kid_run_campaign_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;