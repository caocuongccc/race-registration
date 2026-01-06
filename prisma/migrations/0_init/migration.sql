-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ORGANIZER', 'MEMBER');

-- CreateEnum
CREATE TYPE "EventImageType" AS ENUM ('BANNER', 'COVER', 'GALLERY', 'SHIRT_MALE', 'SHIRT_FEMALE', 'SHIRT_KID', 'VENUE', 'COURSE_MAP');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShirtCategory" AS ENUM ('MALE', 'FEMALE', 'KID');

-- CreateEnum
CREATE TYPE "ShirtType" AS ENUM ('SHORT_SLEEVE', 'TANK_TOP');

-- CreateEnum
CREATE TYPE "ShirtSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('ONLINE', 'EXCEL', 'MANUAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('REGISTRATION_PENDING', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED_NO_BIB', 'BIB_ANNOUNCEMENT', 'RACE_PACK_INFO', 'REMINDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT false,
    "racePackLocation" TEXT,
    "racePackTime" TEXT,
    "racePackSchedule" TEXT,
    "raceDaySchedule" TEXT,
    "parkingInfo" TEXT,
    "checkinProcedure" TEXT,
    "hotline" TEXT,
    "emailSupport" TEXT,
    "facebookUrl" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "coverImageUrl" TEXT,
    "hasShirt" BOOLEAN NOT NULL DEFAULT false,
    "requireOnlinePayment" BOOLEAN NOT NULL DEFAULT true,
    "sendBibImmediately" BOOLEAN NOT NULL DEFAULT true,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankHolder" TEXT,
    "bankCode" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_images" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "imageType" "EventImageType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distances" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "bibPrefix" TEXT NOT NULL,
    "maxParticipants" INTEGER,
    "currentParticipants" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_shirts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "ShirtCategory" NOT NULL,
    "type" "ShirtType" NOT NULL,
    "size" "ShirtSize" NOT NULL,
    "price" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "previewImageUrl" TEXT,
    "cloudinaryPublicId" TEXT,

    CONSTRAINT "event_shirts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "distanceId" TEXT NOT NULL,
    "shirtId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "idCard" TEXT,
    "address" TEXT,
    "city" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "healthDeclaration" BOOLEAN NOT NULL DEFAULT false,
    "bloodType" TEXT,
    "shirtCategory" "ShirtCategory",
    "shirtType" "ShirtType",
    "shirtSize" "ShirtSize",
    "raceFee" INTEGER NOT NULL,
    "shirtFee" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "bibNumber" TEXT,
    "qrPaymentUrl" TEXT,
    "qrCheckinUrl" TEXT,
    "confirmationToken" TEXT,
    "utmSource" TEXT,
    "notes" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "registrationSource" "RegistrationSource" NOT NULL DEFAULT 'ONLINE',
    "importBatchId" TEXT,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "webhookData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_configs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "replyTo" TEXT,
    "useGmailFallback" BOOLEAN NOT NULL DEFAULT false,
    "gmailUser" TEXT,
    "gmailAppPassword" TEXT,
    "subjectRegistrationPending" TEXT NOT NULL DEFAULT 'Xác nhận đăng ký - {{eventName}}',
    "subjectPaymentConfirmed" TEXT NOT NULL DEFAULT 'Thanh toán thành công - Số BIB {{bibNumber}}',
    "subjectPaymentReceivedNoBib" TEXT NOT NULL DEFAULT 'Đã nhận thanh toán - {{eventName}}',
    "subjectBibAnnouncement" TEXT NOT NULL DEFAULT 'Thông báo số BIB - {{eventName}}',
    "subjectRacePackInfo" TEXT NOT NULL DEFAULT 'Thông tin quan trọng - {{eventName}}',
    "subjectReminder" TEXT NOT NULL DEFAULT 'Nhắc nhở - {{eventName}}',
    "bodyRegistrationPending" TEXT NOT NULL,
    "bodyPaymentConfirmed" TEXT NOT NULL,
    "bodyPaymentReceivedNoBib" TEXT NOT NULL,
    "bodyBibAnnouncement" TEXT NOT NULL,
    "bodyRacePackInfo" TEXT NOT NULL,
    "bodyReminder" TEXT NOT NULL,
    "attachQrPayment" BOOLEAN NOT NULL DEFAULT true,
    "attachQrCheckin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "bibNumber" TEXT,
    "emailProvider" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "emailType" "EmailType" NOT NULL,
    "subject" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,
    "resendCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "event_images_eventId_imageType_idx" ON "event_images"("eventId", "imageType");

-- CreateIndex
CREATE UNIQUE INDEX "distances_eventId_name_key" ON "distances"("eventId", "name");

-- CreateIndex
CREATE INDEX "event_shirts_eventId_isAvailable_idx" ON "event_shirts"("eventId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "event_shirts_eventId_category_type_size_key" ON "event_shirts"("eventId", "category", "type", "size");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_bibNumber_key" ON "registrations"("bibNumber");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_confirmationToken_key" ON "registrations"("confirmationToken");

-- CreateIndex
CREATE INDEX "registrations_importBatchId_idx" ON "registrations"("importBatchId");

-- CreateIndex
CREATE INDEX "registrations_eventId_paymentStatus_idx" ON "registrations"("eventId", "paymentStatus");

-- CreateIndex
CREATE INDEX "registrations_distanceId_idx" ON "registrations"("distanceId");

-- CreateIndex
CREATE INDEX "registrations_email_idx" ON "registrations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");

-- CreateIndex
CREATE INDEX "payments_registrationId_idx" ON "payments"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "email_configs_eventId_key" ON "email_configs"("eventId");

-- CreateIndex
CREATE INDEX "email_logs_registrationId_emailType_idx" ON "email_logs"("registrationId", "emailType");

-- CreateIndex
CREATE INDEX "email_logs_bibNumber_idx" ON "email_logs"("bibNumber");

-- CreateIndex
CREATE INDEX "email_logs_recipientEmail_idx" ON "email_logs"("recipientEmail");

-- CreateIndex
CREATE INDEX "email_logs_emailProvider_status_idx" ON "email_logs"("emailProvider", "status");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_images" ADD CONSTRAINT "event_images_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distances" ADD CONSTRAINT "distances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_shirts" ADD CONSTRAINT "event_shirts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "distances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_shirtId_fkey" FOREIGN KEY ("shirtId") REFERENCES "event_shirts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_configs" ADD CONSTRAINT "email_configs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

