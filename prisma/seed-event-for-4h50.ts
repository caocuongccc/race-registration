// scripts/seed-breaking-450.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🏃 Starting seed for BREAKING 4:50 Event...");

  // 1. Create/Get Admin User
  const adminEmail = "admin@breaking450.com";
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const hashedPassword = await bcrypt.hash("", 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Admin Breaking 4:50",
        role: "ADMIN",
      },
    });
    console.log("✅ Created admin user:", adminEmail);
  } else {
    console.log("✅ Admin user exists");
  }

  // 2. Create Event
  const eventSlug = "breaking-450-2026";
  let event = await prisma.event.findUnique({
    where: { slug: eventSlug },
  });

  if (event) {
    console.log("⚠️ Event already exists, skipping...");
    return;
  }

  event = await prisma.event.create({
    data: {
      name: "BREAKING 10KM - TEAM HUE PACE 4:50",
      slug: eventSlug,
      description: `Giải chạy Breaking 10KM do TEAM 4:50 tổ chức với tinh thần "Run Young Strong -- Together". 

Đây là sân chơi lành mạnh, gắn kết những người yêu chạy bộ và cùng nhau chinh phục cột mốc 10km đầy thử thách.

🏃 Cự ly: 10km (6 vòng x 1.7km)
⏱️ Cut-off Time: 55 phút
📍 Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh, Huế
🎯 Quy mô: Dưới 100 VĐV

Giải được chia thành 4 PEN theo mục tiêu thời gian:
• PEN A: ≤ 40 phút
• PEN B: ≤ 45 phút  
• PEN C: ≤ 50 phút
• PEN D: ≤ 55 phút`,
      date: new Date("2026-02-08T06:00:00+07:00"), // 08/02/2026, 06:00
      location: "Ngã tư Võ Nguyên Giáp - Hoàng Lanh (khu hành chính công), Huế",
      address: "Võ Nguyên Giáp - Hoàng Lanh",
      city: "Thừa Thiên Huế",
      status: "REGISTRATION_OPEN",
      isPublished: true,
      allowRegistration: true,
      hasShirt: true,

      // Payment config
      requireOnlinePayment: true,
      sendBibImmediately: true,
      bankName: "MB Bank",
      bankAccount: "2504042024",
      bankHolder: "NGUYEN HOANG NHAT QUYEN",
      bankCode: "MB",

      // Contact info
      hotline: "0905123456", // Thay số thật
      emailSupport: "contact@breaking450.com",
      facebookUrl: "https://facebook.com/huepace450",

      // Race pack info
      racePackLocation: "Ngã tư Võ Nguyên Giáp - Hoàng Lanh",
      racePackTime: "Sáng ngày 08/02/2026, 05:30 - 06:00 (trước giờ xuất phát)",

      createdById: admin.id,
    },
  });

  console.log("✅ Created event:", event.name);

  // 3. Create Distances (4 PENs)
  const distances = [
    {
      name: "10KM - PEN A (≤40 phút)",
      price: 150000, // Bib tiêu chuẩn
      bibPrefix: "10KA",
      maxParticipants: 25,
      sortOrder: 0,
    },
    {
      name: "10KM - PEN B (≤45 phút)",
      price: 150000,
      bibPrefix: "10KB",
      maxParticipants: 25,
      sortOrder: 1,
    },
    {
      name: "10KM - PEN C (≤50 phút)",
      price: 150000,
      bibPrefix: "10KC",
      maxParticipants: 25,
      sortOrder: 2,
    },
    {
      name: "10KM - PEN D (≤55 phút)",
      price: 150000,
      bibPrefix: "10KD",
      maxParticipants: 25,
      sortOrder: 3,
    },
  ];

  for (const dist of distances) {
    await prisma.distance.create({
      data: {
        ...dist,
        eventId: event.id,
        isAvailable: true,
      },
    });
    console.log("✅ Created distance:", dist.name);
  }

  // 4. Create Shirts
  // Áo giải: 350,000 (bib + áo) - 150,000 (bib) = 200,000 cho áo
  // Hoặc mua riêng: 260,000
  const shirtPrice = 200000; // Giá khi mua kèm bib
  const categories = ["MALE", "FEMALE"];
  const sizes = ["S", "M", "L", "XL", "XXL"];

  for (const category of categories) {
    for (const size of sizes) {
      await prisma.eventShirt.create({
        data: {
          eventId: event.id,
          category: category as any,
          type: "SHORT_SLEEVE",
          size: size as any,
          price: shirtPrice,
          stockQuantity: 20, // 100 VĐV / 10 size = ~10/size, buffer thêm
          isAvailable: true,
        },
      });
    }
  }
  console.log("✅ Created shirts for all sizes");

  // 5. Create Email Config
  await prisma.emailConfig.create({
    data: {
      eventId: event.id,
      fromName: "BTC Breaking 4:50",
      fromEmail: process.env.FROM_EMAIL || "noreply@breaking450.com",
      replyTo: "contact@breaking450.com",

      subjectRegistrationPending: "Xác nhận đăng ký - BREAKING 4:50",
      subjectPaymentConfirmed:
        "Thanh toán thành công - Số BIB {{bibNumber}} - BREAKING 4:50",
      subjectBibAnnouncement: "Thông báo số BIB - BREAKING 4:50",
      subjectRacePackInfo: "Thông tin quan trọng - BREAKING 4:50",
      subjectReminder: "Nhắc nhở - BREAKING 4:50 sắp diễn ra!",

      bodyRegistrationPending: `Cảm ơn bạn đã đăng ký BREAKING 4:50!

🏃 Thông tin đăng ký của bạn đã được ghi nhận.
💳 Vui lòng hoàn tất thanh toán để xác nhận tham gia.

Chi tiết:
- Sự kiện: BREAKING 10KM
- Ngày: 08/02/2026, 06:00
- Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh, Huế

Run Young Strong -- Together! 💪`,

      bodyPaymentConfirmed: `Thanh toán thành công! 🎉

Số BIB của bạn: {{bibNumber}}

Thông tin check-in:
- Thời gian: 05:30 - 06:00, ngày 08/02/2026
- Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh
- Nhận: Bib + Áo giải (nếu có)

Lưu ý:
- Có mặt trước 20 phút để điểm danh
- Mang theo CCCD/CMND
- Cut-off time: 55 phút

Chúc bạn thi đấu thành công! 🏃‍♂️`,

      bodyBibAnnouncement: "Số BIB {{bibNumber}} của bạn đã được công bố!",
      bodyRacePackInfo: `Thông tin nhận Race Pack:

📍 Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh
⏰ Thời gian: 05:30 - 06:00, ngày 08/02/2026

Mang theo:
- CCCD/CMND
- Số BIB: {{bibNumber}}

See you at the start line! 🏃`,

      bodyReminder: `Nhắc nhở: BREAKING 4:50 sắp diễn ra!

📅 Ngày mai: 08/02/2026
⏰ Xuất phát: 06:00
🏃 Số BIB: {{bibNumber}}

Chuẩn bị:
✅ Đồng hồ GPS/thiết bị đo
✅ Giày chạy tốt
✅ Tinh thần sẵn sàng!

Run Young Strong Together! 💪`,

      attachQrPayment: true,
      attachQrCheckin: true,
    },
  });
  console.log("✅ Created email config");

  console.log("");
  console.log("🎉 Seed completed successfully!");
  console.log("");
  console.log("📊 Summary:");
  console.log("- Event: BREAKING 10KM - TEAM HUE PACE 4:50");
  console.log("- Date: 08/02/2026, 06:00");
  console.log("- Distances: 4 PENs (A/B/C/D)");
  console.log("- Shirts: 10 sizes (Male/Female)");
  console.log("- Admin: admin@breaking450.com / Breaking450@2026");
  console.log("");
  console.log("🔗 Next steps:");
  console.log("1. Upload event images (cover, logo, shirt preview)");
  console.log("2. Test registration flow");
  console.log("3. Configure payment gateway");
  console.log("4. Update contact info if needed");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
