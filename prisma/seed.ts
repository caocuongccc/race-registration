// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with updated schema...");

  // ============================================
  // 1. CREATE ADMIN & ORGANIZER USERS
  // ============================================
  const hashedPassword = await hash("", 12);

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

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@giaichay.com" },
    update: {},
    create: {
      email: "organizer@giaichay.com",
      password: hashedPassword,
      name: "Event Organizer",
      role: "ORGANIZER",
    },
  });

  console.log("✅ Organizer user created:", organizer.email);

  // ============================================
  // 2. CREATE SAMPLE EVENTS
  // ============================================

  // EVENT 1: Đang mở đăng ký, gửi BIB ngay
  const event1 = await prisma.event.upsert({
    where: { slug: "giai-chay-phuong-hoa-khanh-2025" },
    update: {},
    create: {
      name: "Giải Chạy Phường Hòa Khánh 2025",
      slug: "giai-chay-phuong-hoa-khanh-2025",
      description: `Giải chạy thể thao nhằm nâng cao sức khỏe cộng đồng và phong trào thể dục thể thao phường Hòa Khánh.

Giải đấu bao gồm các cự ly: 5km, 10km và 21km (Half Marathon).

Phí đăng ký đã bao gồm:
- Số BIB
- Áo đấu kỷ niệm (nếu chọn)
- Nước uống tại các trạm
- Huy chương hoàn thành
- Bảo hiểm tai nạn

Chúng tôi mong đợi sự tham gia của các bạn!`,
      date: new Date("2025-12-31T06:00:00"),
      location: "Công viên Biển Đông",
      address: "Đường Võ Nguyên Giáp",
      city: "Đà Nẵng",
      status: "REGISTRATION_OPEN",
      isPublished: true,
      allowRegistration: true, // NEW: Cho phép đăng ký
      hasShirt: true,
      requireOnlinePayment: true,
      sendBibImmediately: true, // NEW: Gửi BIB ngay

      // Race pack info
      racePackLocation: "Nhà văn hóa Phường Hòa Khánh",
      racePackTime: "29-30/12/2025, 14:00 - 20:00",
      racePackSchedule: `📦 Lịch nhận race pack:
- Thứ 7 (29/12): 14:00 - 20:00
- Chủ nhật (30/12): 08:00 - 20:00

Mang theo:
- CCCD/CMND (bản chính)
- Mã QR check-in (trong email)`,

      // Race day info
      raceDaySchedule: `🏁 Lịch trình ngày thi đấu (31/12/2025):
- 05:00 - 06:00: Check-in tại Công viên Biển Đông
- 06:00 - 06:15: Khởi động tập thể
- 06:30: Xuất phát 21km (Half Marathon)
- 07:00: Xuất phát 10km
- 07:15: Xuất phát 5km
- 09:00 - 10:00: Trao giải & Kết thúc`,

      parkingInfo: `🅿️ Thông tin đỗ xe:
- Bãi xe miễn phí tại Công viên Biển Đông
- Sức chứa: 200 xe máy, 50 ô tô
- Đề xuất: Đến sớm trước 05:30 để có chỗ đỗ`,

      // Contact
      hotline: "0905123456",
      emailSupport: "hoakhanh2025@giaichay.com",
      facebookUrl: "https://facebook.com/giaichayhoakhanh",

      // Payment
      bankName: "MB Bank",
      bankAccount: "0123456789",
      bankHolder: "NGUYEN VAN A",
      bankCode: "MB",

      createdById: admin.id,
    },
  });

  console.log("✅ Event 1 created:", event1.name);

  // EVENT 2: Published nhưng chưa mở đăng ký
  const event2 = await prisma.event.upsert({
    where: { slug: "marathon-da-nang-2026" },
    update: {},
    create: {
      name: "Đà Nẵng Marathon 2026",
      slug: "marathon-da-nang-2026",
      description: `Giải Marathon quốc tế Đà Nẵng 2026 - Sự kiện chạy bộ lớn nhất miền Trung.

Dự kiến mở đăng ký: Tháng 3/2026

Các cự ly:
- 5km: Phù hợp mọi lứa tuổi
- 10km: Thử thách trung bình
- 21km: Half Marathon
- 42km: Full Marathon

Theo dõi fanpage để cập nhật thông tin mở đăng ký!`,
      date: new Date("2026-06-15T05:00:00"),
      location: "Trung tâm Hành chính Đà Nẵng",
      address: "Đường Trần Phú",
      city: "Đà Nẵng",
      status: "PUBLISHED",
      isPublished: true,
      allowRegistration: false, // NEW: Chưa cho đăng ký
      hasShirt: true,
      requireOnlinePayment: true,
      sendBibImmediately: true,

      // Contact
      hotline: "0905888999",
      emailSupport: "info@danangormarathon.vn",
      facebookUrl: "https://facebook.com/danangmarathon",

      // Payment (chưa cần vội config)
      bankName: "Vietcombank",
      bankAccount: "9876543210",
      bankHolder: "BAN TO CHUC MARATHON DA NANG",
      bankCode: "VCB",

      createdById: organizer.id,
    },
  });

  console.log("✅ Event 2 created:", event2.name);

  // EVENT 3: Đang mở đăng ký, gửi BIB thủ công
  const event3 = await prisma.event.upsert({
    where: { slug: "charity-run-2025" },
    update: {},
    create: {
      name: "Charity Run 2025 - Chạy Vì Trẻ Em Nghèo",
      slug: "charity-run-2025",
      description: `Giải chạy từ thiện ủng hộ trẻ em có hoàn cảnh khó khăn.

100% số tiền đăng ký sẽ được dùng để:
- Mua sách vở cho trẻ em vùng cao
- Hỗ trợ học phí cho học sinh nghèo
- Xây dựng thư viện mini tại các trường học

Đăng ký ngay để góp phần làm điều tốt đẹp!`,
      date: new Date("2025-08-20T06:00:00"),
      location: "Công viên 29/3",
      address: "Đường 2/9",
      city: "Đà Nẵng",
      status: "REGISTRATION_OPEN",
      isPublished: true,
      allowRegistration: true,
      hasShirt: true,
      requireOnlinePayment: false, // Xác nhận thủ công
      sendBibImmediately: false, // NEW: Gửi BIB sau (admin công bố)

      // Race pack
      racePackLocation: "Trung tâm Văn hóa Đà Nẵng",
      racePackTime: "18-19/08/2025, 09:00 - 17:00",

      // Contact
      hotline: "0905777888",
      emailSupport: "charityrun2025@gmail.com",
      facebookUrl: "https://facebook.com/charityrun2025",

      // Payment
      bankName: "Techcombank",
      bankAccount: "1122334455",
      bankHolder: "CHARITY RUN 2025",
      bankCode: "TCB",

      createdById: organizer.id,
    },
  });

  console.log("✅ Event 3 created:", event3.name);

  // ============================================
  // 3. CREATE DISTANCES FOR EACH EVENT
  // ============================================

  // Event 1 distances
  const event1Distances = await Promise.all([
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event1.id,
          name: "5km",
        },
      },
      update: {},
      create: {
        eventId: event1.id,
        name: "5km",
        price: 150000,
        bibPrefix: "5K",
        maxParticipants: 500,
        currentParticipants: 0,
        sortOrder: 1,
        isAvailable: true,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event1.id,
          name: "10km",
        },
      },
      update: {},
      create: {
        eventId: event1.id,
        name: "10km",
        price: 200000,
        bibPrefix: "10K",
        maxParticipants: 300,
        currentParticipants: 0,
        sortOrder: 2,
        isAvailable: true,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event1.id,
          name: "21km (Half Marathon)",
        },
      },
      update: {},
      create: {
        eventId: event1.id,
        name: "21km (Half Marathon)",
        price: 300000,
        bibPrefix: "HM",
        maxParticipants: 200,
        currentParticipants: 0,
        sortOrder: 3,
        isAvailable: true,
      },
    }),
  ]);

  console.log("✅ Event 1 distances created:", event1Distances.length);

  // Event 2 distances
  const event2Distances = await Promise.all([
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event2.id,
          name: "5km",
        },
      },
      update: {},
      create: {
        eventId: event2.id,
        name: "5km",
        price: 200000,
        bibPrefix: "5K",
        maxParticipants: 1000,
        sortOrder: 1,
        isAvailable: true,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event2.id,
          name: "10km",
        },
      },
      update: {},
      create: {
        eventId: event2.id,
        name: "10km",
        price: 300000,
        bibPrefix: "10K",
        maxParticipants: 800,
        sortOrder: 2,
        isAvailable: true,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event2.id,
          name: "21km (Half Marathon)",
        },
      },
      update: {},
      create: {
        eventId: event2.id,
        name: "21km (Half Marathon)",
        price: 500000,
        bibPrefix: "HM",
        maxParticipants: 500,
        sortOrder: 3,
        isAvailable: true,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event2.id,
          name: "42km (Full Marathon)",
        },
      },
      update: {},
      create: {
        eventId: event2.id,
        name: "42km (Full Marathon)",
        price: 800000,
        bibPrefix: "FM",
        maxParticipants: 300,
        sortOrder: 4,
        isAvailable: true,
      },
    }),
  ]);

  console.log("✅ Event 2 distances created:", event2Distances.length);

  // Event 3 distances
  const event3Distances = await Promise.all([
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event3.id,
          name: "3km (Fun Run)",
        },
      },
      update: {},
      create: {
        eventId: event3.id,
        name: "3km (Fun Run)",
        price: 100000,
        bibPrefix: "FR",
        maxParticipants: null, // Unlimited
        sortOrder: 1,
        isAvailable: true,
      },
    }),
    prisma.distance.upsert({
      where: {
        eventId_name: {
          eventId: event3.id,
          name: "5km",
        },
      },
      update: {},
      create: {
        eventId: event3.id,
        name: "5km",
        price: 150000,
        bibPrefix: "5K",
        maxParticipants: null,
        sortOrder: 2,
        isAvailable: true,
      },
    }),
  ]);

  console.log("✅ Event 3 distances created:", event3Distances.length);

  // ============================================
  // 4. CREATE SHIRT CONFIGURATIONS
  // ============================================

  const shirtCategories = ["MALE", "FEMALE", "KID"] as const;
  const shirtTypes = ["SHORT_SLEEVE", "TANK_TOP"] as const;
  const shirtSizes = ["S", "M", "L", "XL", "XXL"] as const;
  const shirtPrice = 100000;

  let totalShirts = 0;

  for (const event of [event1, event2, event3]) {
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
              soldQuantity: 0,
              isAvailable: true,
            },
          });
          totalShirts++;
        }
      }
    }
  }

  console.log("✅ Shirt configurations created:", totalShirts);

  // ============================================
  // 5. CREATE EMAIL CONFIGS
  // ============================================

  // Email config for Event 1
  await prisma.emailConfig.upsert({
    where: { eventId: event1.id },
    update: {},
    create: {
      eventId: event1.id,
      fromName: "Ban Tổ Chức Giải Chạy Hòa Khánh",
      fromEmail: "noreply@hoakhanh2025.com",
      replyTo: "hoakhanh2025@giaichay.com",

      // NEW: Gmail fallback config (optional)
      useGmailFallback: false,
      gmailUser: null,
      gmailAppPassword: null,

      // Subject lines with placeholders
      subjectRegistrationPending: "Xác nhận đăng ký - {{eventName}}",
      subjectPaymentConfirmed: "Thanh toán thành công - Số BIB {{bibNumber}}",
      subjectPaymentReceivedNoBib: "Đã nhận thanh toán - {{eventName}}", // NEW
      subjectBibAnnouncement: "Thông báo số BIB - {{eventName}}", // NEW
      subjectRacePackInfo: "Thông tin quan trọng - {{eventName}}",
      subjectReminder: "Nhắc nhở - {{eventName}}",

      // Email bodies
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

      bodyPaymentReceivedNoBib: `Xin chào {{fullName}},

Chúng tôi đã nhận được thanh toán của bạn.
Số BIB sẽ được công bố trong thời gian tới.

Trân trọng,
Ban tổ chức`, // NEW

      bodyBibAnnouncement: `Xin chào {{fullName}},

Số BIB của bạn đã được công bố: {{bibNumber}}

Vui lòng tải mã QR check-in trong email này.

Trân trọng,
Ban tổ chức`, // NEW

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

  // Email config for Event 2
  await prisma.emailConfig.upsert({
    where: { eventId: event2.id },
    update: {},
    create: {
      eventId: event2.id,
      fromName: "Ban Tổ Chức Đà Nẵng Marathon",
      fromEmail: "noreply@danangmarathon.vn",
      replyTo: "info@danangmarathon.vn",

      useGmailFallback: false,

      subjectRegistrationPending: "Xác nhận đăng ký - Đà Nẵng Marathon 2026",
      subjectPaymentConfirmed: "Thanh toán thành công - BIB {{bibNumber}}",
      subjectPaymentReceivedNoBib: "Đã nhận thanh toán - Đà Nẵng Marathon 2026",
      subjectBibAnnouncement: "Công bố số BIB - Đà Nẵng Marathon 2026",
      subjectRacePackInfo: "Thông tin quan trọng - Đà Nẵng Marathon 2026",
      subjectReminder: "Nhắc nhở - Đà Nẵng Marathon 2026",

      bodyRegistrationPending: "Default template",
      bodyPaymentConfirmed: "Default template",
      bodyPaymentReceivedNoBib: "Default template",
      bodyBibAnnouncement: "Default template",
      bodyRacePackInfo: "Default template",
      bodyReminder: "Default template",

      attachQrPayment: true,
      attachQrCheckin: true,
    },
  });

  // Email config for Event 3
  await prisma.emailConfig.upsert({
    where: { eventId: event3.id },
    update: {},
    create: {
      eventId: event3.id,
      fromName: "Charity Run 2025",
      fromEmail: "noreply@charityrun2025.vn",
      replyTo: "charityrun2025@gmail.com",

      useGmailFallback: false,

      subjectRegistrationPending: "Xác nhận đăng ký - Charity Run 2025",
      subjectPaymentConfirmed: "Thanh toán thành công - BIB {{bibNumber}}",
      subjectPaymentReceivedNoBib: "Đã nhận thanh toán - Charity Run 2025",
      subjectBibAnnouncement: "Công bố số BIB - Charity Run 2025",
      subjectRacePackInfo: "Thông tin quan trọng - Charity Run 2025",
      subjectReminder: "Nhắc nhở - Charity Run 2025",

      bodyRegistrationPending: "Default template",
      bodyPaymentConfirmed: "Default template",
      bodyPaymentReceivedNoBib: "Default template",
      bodyBibAnnouncement: "Default template",
      bodyRacePackInfo: "Default template",
      bodyReminder: "Default template",

      attachQrPayment: true,
      attachQrCheckin: true,
    },
  });

  console.log("✅ Email configs created for 3 events");

  // ============================================
  // 6. SUMMARY
  // ============================================
  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n========================================");
  console.log("📝 SUMMARY");
  console.log("========================================");
  console.log(`👤 Users: 2 (1 Admin, 1 Organizer)`);
  console.log(`🎯 Events: 3`);
  console.log(`  - Event 1: ${event1.name}`);
  console.log(`    Status: ${event1.status}`);
  console.log(
    `    Allow Registration: ${event1.allowRegistration ? "✅" : "❌"}`
  );
  console.log(
    `    Send BIB Immediately: ${event1.sendBibImmediately ? "✅" : "❌"}`
  );
  console.log(`  - Event 2: ${event2.name}`);
  console.log(`    Status: ${event2.status}`);
  console.log(
    `    Allow Registration: ${event2.allowRegistration ? "✅" : "❌"}`
  );
  console.log(
    `    Send BIB Immediately: ${event2.sendBibImmediately ? "✅" : "❌"}`
  );
  console.log(`  - Event 3: ${event3.name}`);
  console.log(`    Status: ${event3.status}`);
  console.log(
    `    Allow Registration: ${event3.allowRegistration ? "✅" : "❌"}`
  );
  console.log(
    `    Send BIB Immediately: ${event3.sendBibImmediately ? "✅" : "❌"}`
  );
  console.log(
    `🏃 Total Distances: ${event1Distances.length + event2Distances.length + event3Distances.length}`
  );
  console.log(`👕 Total Shirt Configs: ${totalShirts}`);
  console.log(`📧 Email Configs: 3`);
  console.log("========================================");
  console.log("\n🔑 LOGIN CREDENTIALS:");
  console.log("========================================");
  console.log("Admin Account:");
  console.log("  Email: admin@giaichay.com");
  console.log("  Password: admin123");
  console.log("");
  console.log("Organizer Account:");
  console.log("  Email: organizer@giaichay.com");
  console.log("  Password: admin123");
  console.log("========================================");
  console.log("\n🌐 TEST SCENARIOS:");
  console.log("========================================");
  console.log("1. Event 1 (Hòa Khánh):");
  console.log("   - ✅ Đang mở đăng ký");
  console.log("   - ✅ Gửi BIB ngay khi thanh toán");
  console.log("   - Slug: giai-chay-phuong-hoa-khanh-2025");
  console.log("");
  console.log("2. Event 2 (Đà Nẵng Marathon):");
  console.log("   - 📋 Published nhưng chưa mở đăng ký");
  console.log("   - Slug: marathon-da-nang-2026");
  console.log("");
  console.log("3. Event 3 (Charity Run):");
  console.log("   - ✅ Đang mở đăng ký");
  console.log("   - 📋 Xác nhận thanh toán thủ công");
  console.log("   - 📋 Gửi BIB sau (admin công bố)");
  console.log("   - Slug: charity-run-2025");
  console.log("========================================");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
