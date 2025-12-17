// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with updated schema...");

  // ============================================
  // 1. CREATE ADMIN & ORGANIZER USERS
  // ============================================
  const hashedPassword = await hash("Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@giaichay.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@giaichay.com",
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user update:", admin.email);
  const hashedPassword1 = await hash("NguyenBaHai@123", 12);
  const organizer = await prisma.user.upsert({
    where: { email: "organizer@giaichay.com" },
    update: { password: hashedPassword1 },
    create: {
      email: "organizer@giaichay.com",
      password: hashedPassword,
      name: "Event Organizer",
      role: "ORGANIZER",
    },
  });

  console.log("✅ Organizer user update:", organizer.email);

  const hashedPassword2 = await hash("btcA@123456", 12);
  const organizer2 = await prisma.user.upsert({
    where: { email: "btc@huongthuy.gov.vn" },
    update: { password: hashedPassword2 },
    create: {
      email: "btc@huongthuy.gov.vn",
      password: hashedPassword2,
      name: "Event Organizer",
      role: "ORGANIZER",
    },
  });

  console.log("✅ Organizer user update:", organizer2.email);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
