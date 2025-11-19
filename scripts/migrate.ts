// scripts/migrate.ts
// Run this script to migrate existing data to new schema
// Usage: npx ts-node scripts/migrate.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Starting migration...");

  try {
    // 1. Update all existing events to have requireOnlinePayment = true
    const eventsUpdated = await prisma.event.updateMany({
      where: {
        requireOnlinePayment: null as any, // Find events without this field
      },
      data: {
        requireOnlinePayment: true,
      },
    });

    console.log(
      `✅ Updated ${eventsUpdated.count} events with requireOnlinePayment`
    );

    // 2. Update existing email configs with new fields
    const emailConfigs = await prisma.emailConfig.findMany();

    for (const config of emailConfigs) {
      // Check if new fields exist, if not, set defaults
      await prisma.emailConfig.update({
        where: { id: config.id },
        data: {
          subjectRegistrationPending:
            config.subjectRegistrationPending ||
            "Xác nhận đăng ký - {{eventName}}",
          subjectPaymentConfirmed:
            config.subjectPaymentConfirmed ||
            "Thanh toán thành công - Số BIB {{bibNumber}}",
          subjectRacePackInfo:
            config.subjectRacePackInfo ||
            "Thông tin quan trọng - {{eventName}}",
          subjectReminder: config.subjectReminder || "Nhắc nhở - {{eventName}}",

          bodyRegistrationPending:
            config.bodyRegistrationPending || "Default registration email body",
          bodyPaymentConfirmed:
            config.bodyPaymentConfirmed || "Default payment confirmed body",
          bodyRacePackInfo:
            config.bodyRacePackInfo || "Default race pack info body",
          bodyReminder: config.bodyReminder || "Default reminder body",

          attachQrPayment: config.attachQrPayment ?? true,
          attachQrCheckin: config.attachQrCheckin ?? true,
        },
      });
    }

    console.log(`✅ Updated ${emailConfigs.length} email configs`);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
