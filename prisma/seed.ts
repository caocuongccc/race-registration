// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@giaichay.com" },
    update: {},
    create: {
      email: "admin@giaichay.com",
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Create sample event
  const event = await prisma.event.upsert({
    where: { slug: "giai-chay-phuong-test" },
    update: {},
    create: {
      name: "Giải Chạy Phường Test 2025",
      slug: "giai-chay-phuong-test",
      description: "Giải chạy thử nghiệm để test hệ thống",
      date: new Date("2025-12-31"),
      location: "Công viên Thống Nhất",
      address: "Đường Lê Duẩn, Phường X",
      city: "Đà Nẵng",
      status: "PUBLISHED", // Changed from PUBLISHED
      isPublished: true,
      hasShirt: true,
      requireOnlinePayment: false, // Enable webhook auto-confirm by default

      // Race pack info
      racePackLocation: "Nhà văn hóa Phường X",
      racePackTime: "29-30/12/2025, 14:00 - 20:00",

      // Contact
      hotline: "0123456789",
      emailSupport: "support@giaichay.com",
      facebookUrl: "https://facebook.com/giaichay",

      // Payment
      bankName: "MB Bank",
      bankAccount: "0123456789",
      bankHolder: "NGUYEN VAN A",
      bankCode: "MB",

      createdById: admin.id,
    },
  });

  console.log("✅ Sample event created:", event.name);

  // Create distances
  const distances = await Promise.all([
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event.id,
          name: "5km",
        },
      },
      update: {},
      create: {
        eventId: event.id,
        name: "5km",
        price: 150000,
        bibPrefix: "5K",
        maxParticipants: 500,
        sortOrder: 1,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event.id,
          name: "10km",
        },
      },
      update: {},
      create: {
        eventId: event.id,
        name: "10km",
        price: 200000,
        bibPrefix: "10K",
        maxParticipants: 300,
        sortOrder: 2,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event.id,
          name: "21km",
        },
      },
      update: {},
      create: {
        eventId: event.id,
        name: "21km (Half Marathon)",
        price: 300000,
        bibPrefix: "HM",
        maxParticipants: 200,
        sortOrder: 3,
      },
    }),
  ]);

  console.log("✅ Distances created:", distances.length);

  // Create shirt configurations
  const shirtPrice = 100000;
  const shirtCategories = ["MALE", "FEMALE", "KID"] as const;
  const shirtTypes = ["SHORT_SLEEVE", "TANK_TOP"] as const;
  const shirtSizes = ["S", "M", "L", "XL", "XXL"] as const;

  let shirtCount = 0;
  for (const category of shirtCategories) {
    for (const type of shirtTypes) {
      for (const size of shirtSizes) {
        await prisma.eventShirt.upsert({
          where: {
            eventId_category_type_size: {
              eventId: event.id,
              category,
              type,
              size,
            },
          },
          update: {},
          create: {
            eventId: event.id,
            category,
            type,
            size,
            price: shirtPrice,
            stockQuantity: 50,
            isAvailable: true,
          },
        });
        shirtCount++;
      }
    }
  }

  console.log("✅ Shirt configurations created:", shirtCount);

  // Create email config
  await prisma.emailConfig.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      fromName: "Ban Tổ Chức Giải Chạy Test",
      fromEmail: "noreply@giaichaytest.com",
      replyTo: "support@giaichaytest.com",

      // Subject lines with placeholders
      subjectRegistrationPending: "Xác nhận đăng ký - {{eventName}}",
      subjectPaymentConfirmed: "Thanh toán thành công - Số BIB {{bibNumber}}",
      subjectRacePackInfo: "Thông tin quan trọng - {{eventName}}",
      subjectReminder: "Nhắc nhở - {{eventName}}",

      // Email bodies (simple text with placeholders)
      bodyRegistrationPending: `Xin chào {{fullName}},

Cảm ơn bạn đã đăng ký tham gia {{eventName}}.

Thông tin đăng ký:
- Cự ly: {{distance}}
- Tổng tiền: {{amount}}

{{paymentInstructions}}

Trân trọng,
Ban tổ chức`,

      bodyPaymentConfirmed: `Xin chào {{fullName}},

Thanh toán thành công!
Số BIB của bạn: {{bibNumber}}

Vui lòng lưu lại số BIB để nhận race pack.

Trân trọng,
Ban tổ chức`,

      bodyRacePackInfo: `Xin chào {{fullName}},

Thông tin nhận race pack:
- Địa điểm: {{racePackLocation}}
- Thời gian: {{racePackTime}}
- Số BIB: {{bibNumber}}

Trân trọng,
Ban tổ chức`,

      bodyReminder: `Xin chào {{fullName}},

Nhắc nhở về giải {{eventName}} diễn ra vào {{eventDate}}.

Số BIB của bạn: {{bibNumber}}

Trân trọng,
Ban tổ chức`,

      attachQrPayment: true,
      attachQrCheckin: true,
    },
  });

  console.log("✅ Email config created");
  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📝 Admin credentials:");
  console.log("   Email: admin@giaichay.com");
  console.log("   Password: admin123");
  console.log("\n🌐 Sample event slug: giai-chay-phuong-test");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
