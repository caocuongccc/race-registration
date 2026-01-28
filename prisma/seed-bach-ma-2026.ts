// scripts/seed-bach-ma-2026.ts
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌟 Starting seed for Giải Chạy Bạch Mã 2026...\n");

  // ============================================
  // 1. CREATE ADMIN USER (if not exists)
  // ============================================
  const adminEmail = "admin@bachma2026.vn";
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    console.log("👤 Creating admin user...");
    const hashedPassword = await bcrypt.hash("", 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Ban Tổ Chức Bạch Mã",
        role: "ADMIN",
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}\n`);
  } else {
    console.log(`✅ Admin user exists: ${adminEmail}\n`);
  }

  // ============================================
  // 2. CREATE EVENT ORGANIZERS (Optional assigned users)
  // ============================================
  const organizers = [
    {
      email: "thanh.nguyen@bachma.vn",
      name: "Nguyễn Đình Thanh",
      phone: "0975001011",
    },
    {
      email: "hai.ba@bachma.vn",
      name: "Bá Hải",
      phone: "0905000000",
    },
    {
      email: "khuyen@bachma.vn",
      name: "Khuyên",
      phone: "0906000000",
    },
  ];

  const organizerUsers = [];
  for (const org of organizers) {
    let user = await prisma.user.findUnique({
      where: { email: org.email },
    });

    if (!user) {
      console.log(`👤 Creating organizer: ${org.name}...`);
      const hashedPassword = await bcrypt.hash("", 10);
      user = await prisma.user.create({
        data: {
          email: org.email,
          password: hashedPassword,
          name: org.name,
          role: "ORGANIZER",
        },
      });
      console.log(`✅ Created: ${org.name}\n`);
    }
    organizerUsers.push(user);
  }

  // ============================================
  // 3. CREATE EVENT
  // ============================================
  console.log("🏃 Creating event: Chinh phục đỉnh Bạch Mã 2026...\n");

  const event = await prisma.event.create({
    data: {
      // Basic Info
      name: "Giải chạy Chinh phục đỉnh Bạch Mã 2026",
      slug: "chinh-phuc-dinh-bach-ma-2026",
      description: `Hưởng ứng Ngày Động thực vật hoang dã thế giới (03/3) và chào mừng 35 năm hình thành, phát triển Vườn quốc gia Bạch Mã.

Cuộc thi là hoạt động có ý nghĩa thiết thực, góp phần ghi dấu chặng đường 35 năm gìn giữ và phát huy các giá trị đa dạng sinh học của Vườn quốc gia; đồng thời tôn vinh những nỗ lực, cống hiến thầm lặng của lực lượng kiểm lâm, đội ngũ cán bộ, người lao động và cộng đồng trong công tác bảo vệ rừng, bảo tồn thiên nhiên và đa dạng sinh học.

MỤC ĐÍCH:
- Nâng cao nhận thức cộng đồng về bảo tồn động thực vật hoang dã
- Tôn vinh lực lượng kiểm lâm và cộng đồng bảo vệ rừng
- Thúc đẩy phong trào rèn luyện sức khỏe
- Quảng bá hình ảnh Vườn Quốc gia Bạch Mã

LỘ TRÌNH: Cổng Vườn (Km3) → Điểm sạt lở (Km12) → Tuyến băng qua điểm sạt lở → Vọng Hải Đài.`,

      date: new Date("2026-03-01T05:30:00+07:00"), // 5:30 AM ngày 01/03/2026

      // Location
      location: "Vườn Quốc Gia Bạch Mã",
      address: "Trung tâm GDMT & Dịch vụ VQG Bạch Mã, Thôn 9, xã Phú Lộc",
      city: "Thành phố Huế, Thừa Thiên Huế",

      // Status
      status: "DRAFT", // Sẽ chuyển sang REGISTRATION_OPEN sau
      isPublished: false, // Set true khi sẵn sàng
      allowRegistration: false, // Set true khi mở đăng ký (15/01/2026)

      // Race Pack Info
      racePackLocation: "Trung tâm GDMT & Dịch vụ VQG Bạch Mã",
      racePackTime: "27-28/02/2026, 08:00 - 17:00",

      // Payment Settings
      requireOnlinePayment: true, // Tự động xác nhận qua webhook
      sendBibImmediately: true, // Gửi BIB ngay sau khi thanh toán
      hasShirt: true, // Có bán áo

      // Bank Info
      bankName: "MB Bank",
      bankAccount: "0123456789", // ⚠️ REPLACE WITH REAL ACCOUNT
      bankHolder: "VUON QUOC GIA BACH MA",
      bankCode: "MB",

      // Contact Info
      hotline: "0975001011",
      emailSupport: "giaichay@bachma.vn",
      websiteUrl: "https://giaichaychinhphucdinhbachma.com.vn",
      facebookUrl: "https://facebook.com/VQGBachMa",

      // Race Day Schedule
      raceDaySchedule: `05:00 - 05:30: Đón tiếp VĐV
05:30 - 05:45: Khởi động
05:45 - 05:55: Khai mạc giải chạy
06:00: Xuất phát
11:00 - 12:00: Trao giải tại Vọng Hải Đài
12:00: Bế mạc`,

      // Created by admin
      createdById: adminUser.id,
    },
  });

  console.log(`✅ Event created: ${event.name}`);
  console.log(`   ID: ${event.id}\n`);

  // ============================================
  // 4. ASSIGN ORGANIZERS TO EVENT
  // ============================================
  console.log("👥 Assigning organizers to event...\n");

  for (const org of organizerUsers) {
    await prisma.eventUser.create({
      data: {
        eventId: event.id,
        userId: org.id,
        role: "EDITOR", // Can edit event and manage registrations
      },
    });
    console.log(`✅ Assigned ${org.name} as EDITOR`);
  }
  console.log("");

  // ============================================
  // 5. CREATE DISTANCE
  // ============================================
  console.log("🏁 Creating distance: 17km...\n");

  const distance = await prisma.distance.create({
    data: {
      eventId: event.id,
      name: "17km - Chinh phục đỉnh Bạch Mã",
      price: 300000, // 300,000 VND
      bibPrefix: "BM17",
      maxParticipants: 400, // Dự định 400 VĐV
      currentParticipants: 0,
      isAvailable: true,
      sortOrder: 0,
    },
  });

  console.log(`✅ Distance created: ${distance.name}`);
  console.log(`   Price: ${distance.price.toLocaleString("vi-VN")} VND`);
  console.log(`   Max participants: ${distance.maxParticipants}\n`);

  // ============================================
  // 6. CREATE SHIRTS
  // ============================================
  console.log("👕 Creating shirt options...\n");

  const shirtPrice = 130000; // 130,000 VND theo tài liệu
  const standalonePrice = 200000; // Giá bán lẻ (nếu mua riêng)

  const shirtCategories = ["MALE", "FEMALE", "KID"] as const;
  const shirtTypes = ["SHORT_SLEEVE"] as const;
  const shirtSizes = ["XS", "S", "M", "L", "XL", "XXL"] as const;

  let shirtCount = 0;
  for (const category of shirtCategories) {
    for (const type of shirtTypes) {
      for (const size of shirtSizes) {
        await prisma.eventShirt.create({
          data: {
            eventId: event.id,
            category,
            type,
            size,
            price: shirtPrice,
            standalonePrice: standalonePrice,
            stockQuantity: 100, // 100 áo/size
            soldQuantity: 0,
            isAvailable: true,
          },
        });
        shirtCount++;
      }
    }
  }

  console.log(`✅ Created ${shirtCount} shirt options`);
  console.log(
    `   Price: ${shirtPrice.toLocaleString("vi-VN")} VND (with registration)`,
  );
  console.log(
    `   Standalone: ${standalonePrice.toLocaleString("vi-VN")} VND\n`,
  );

  // ============================================
  // 7. CREATE EMAIL CONFIG
  // ============================================
  console.log("📧 Creating email configuration...\n");

  await prisma.emailConfig.create({
    data: {
      eventId: event.id,

      // From
      fromName: "Ban Tổ Chức Giải Chạy Bạch Mã 2026",
      fromEmail: "giaichay@bachma.vn",
      replyTo: "giaichay@bachma.vn",

      // Gmail Fallback (optional)
      useGmailFallback: true,
      gmailUser: process.env.GMAIL_USER || "",
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",

      // Email Subjects
      subjectRegistrationPending:
        "Xác nhận đăng ký - Chinh phục đỉnh Bạch Mã 2026",
      subjectPaymentConfirmed:
        "Thanh toán thành công - Số BIB {{bibNumber}} - Bạch Mã 2026",
      subjectPaymentReceivedNoBib:
        "Đã nhận thanh toán - Chinh phục đỉnh Bạch Mã 2026",
      subjectBibAnnouncement: "Thông báo số BIB - Chinh phục đỉnh Bạch Mã 2026",
      subjectRacePackInfo: "Thông tin nhận Race Pack - Bạch Mã 2026",
      subjectReminder: "Nhắc nhở quan trọng - Chinh phục đỉnh Bạch Mã 2026",

      // Email Bodies (templates)
      bodyRegistrationPending: `Cảm ơn bạn đã đăng ký tham gia Giải chạy "Chinh phục đỉnh Bạch Mã 2026".
Vui lòng hoàn tất thanh toán để xác nhận đăng ký.`,

      bodyPaymentConfirmed: `Thanh toán thành công! 
Số BIB của bạn: {{bibNumber}}
Hẹn gặp bạn tại Vườn Quốc Gia Bạch Mã!`,

      bodyPaymentReceivedNoBib: `Chúng tôi đã nhận được thanh toán của bạn.
Số BIB sẽ được công bố sau.`,

      bodyBibAnnouncement: `Số BIB của bạn là {{bibNumber}}.
Vui lòng lưu lại để check-in ngày thi đấu.`,

      bodyRacePackInfo: `Thông tin nhận Race Pack:
- Địa điểm: Trung tâm GDMT & Dịch vụ VQG Bạch Mã
- Thời gian: 27-28/02/2026, 08:00 - 17:00
Mang theo CCCD và mã QR trong email.`,

      bodyReminder: `Nhắc nhở: Giải chạy diễn ra vào 01/03/2026 lúc 5:30 AM.
Vui lòng đến đúng giờ!`,

      // Attachments
      attachQrPayment: true,
      attachQrCheckin: true,
    },
  });

  console.log("✅ Email configuration created\n");

  // ============================================
  // 8. SUMMARY
  // ============================================
  console.log("=".repeat(60));
  console.log("🎉 SEED COMPLETED SUCCESSFULLY!\n");
  console.log("📊 SUMMARY:");
  console.log("=".repeat(60));
  console.log(`✅ Event: ${event.name}`);
  console.log(`   Slug: ${event.slug}`);
  console.log(`   Date: ${event.date.toLocaleString("vi-VN")}`);
  console.log(`   Location: ${event.location}`);
  console.log("");
  console.log(`👤 Admin User: ${adminUser.email}`);
  console.log(`   Password: BachMa2026@Admin`);
  console.log("");
  console.log(`👥 Organizers assigned: ${organizerUsers.length}`);
  organizerUsers.forEach((org) => {
    console.log(`   - ${org.name} (${org.email})`);
  });
  console.log("");
  console.log(`🏁 Distance: ${distance.name}`);
  console.log(`   Price: ${distance.price.toLocaleString("vi-VN")} VND`);
  console.log(`   Max: ${distance.maxParticipants} participants`);
  console.log("");
  console.log(`👕 Shirts: ${shirtCount} options`);
  console.log(`   Price: ${shirtPrice.toLocaleString("vi-VN")} VND`);
  console.log("");
  console.log("📧 Email config: ✅ Created");
  console.log("=".repeat(60));
  console.log("\n🚀 NEXT STEPS:");
  console.log("1. Update bank account number in Event settings");
  console.log("2. Upload event images (logo, banner, cover)");
  console.log("3. Upload shirt preview images");
  console.log("4. Set event status to REGISTRATION_OPEN when ready");
  console.log("5. Test registration flow");
  console.log("");
  console.log("📱 Contact Info:");
  console.log(`   Hotline: ${event.hotline}`);
  console.log(`   Email: ${event.emailSupport}`);
  console.log(`   Website: ${event.websiteUrl}`);
  console.log("");
  console.log("✨ Done! Happy organizing! 🏃‍♂️🏃‍♀️\n");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
