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
• PEN D: ≤ 55 phút

🏆 GIẢI THƯỞNG:
• Top 1 Nam/Nữ toàn giải: 2,000,000đ + Cúp
• Top 2 Nam/Nữ toàn giải: 1,500,000đ + Cúp
• Top 3 Nam/Nữ toàn giải: 1,000,000đ + Cúp
• Top 1 mỗi PEN (A/B/C/D): 500,000đ + Huy chương
• Hoàn thành đúng cut-off time: Huy chương Finisher`,
      date: new Date("2026-02-08T06:00:00+07:00"),
      location: "Ngã tư Võ Nguyên Giáp - Hoàng Lanh (khu hành chính công), Huế",
      address: "Võ Nguyên Giáp - Hoàng Lanh",
      city: "Thừa Thiên Huế",
      status: "REGISTRATION_OPEN",
      isPublished: true,
      allowRegistration: true,
      hasShirt: true,

      // Payment config
      requireOnlinePayment: true,
      sendBibImmediately: false, // Công bố BIB sau
      bankName: "MB Bank",
      bankAccount: "2504042024",
      bankHolder: "NGUYEN HOANG NHAT QUYEN",
      bankCode: "MB",

      // Contact info
      hotline: "0905123456",
      emailSupport: "contact@breaking450.com",
      facebookUrl: "https://facebook.com/huepace450",
      websiteUrl: "https://zalo.me/g/breaking450",

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
      price: 150000,
      bibPrefix: "A",
      maxParticipants: null,
      sortOrder: 0,
    },
    {
      name: "10KM - PEN B (≤45 phút)",
      price: 150000,
      bibPrefix: "B",
      maxParticipants: null,
      sortOrder: 1,
    },
    {
      name: "10KM - PEN C (≤50 phút)",
      price: 150000,
      bibPrefix: "C",
      maxParticipants: null,
      sortOrder: 2,
    },
    {
      name: "10KM - PEN D (≤55 phút)",
      price: 150000,
      bibPrefix: "D",
      maxParticipants: null,
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
          stockQuantity: 1000,
          isAvailable: true,
          standalonePrice: 260000,
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

      subjectPaymentReceivedNoBib: "Đã nhận thanh toán - BREAKING 4:50",
      bodyPaymentReceivedNoBib: `Cảm ơn bạn đã hoàn tất thanh toán! ✅

Chúng tôi đã nhận được thanh toán của bạn cho sự kiện BREAKING 10KM - TEAM HUE PACE 4:50.

📋 THÔNG BÁO VỀ SỐ BIB:
Số BIB (số áo) của bạn sẽ được công bố trong thời gian tới. Ban tổ chức sẽ gửi email riêng thông báo số BIB khi đã hoàn tất việc phân chia theo PEN và sắp xếp.

📅 THÔNG TIN SỰ KIỆN:
- Ngày thi đấu: 08/02/2026, 06:00
- Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh, Huế
- Cut-off time: 55 phút

📦 NHẬN RACE PACK:
- Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh
- Thời gian: 05:30 - 06:00, ngày 08/02/2026
- Mang theo: CCCD/CMND (bản chính)

🏆 GIẢI THƯỞNG:
• Top 1 Nam/Nữ: 2,000,000đ + Cúp
• Top 2 Nam/Nữ: 1,500,000đ + Cúp  
• Top 3 Nam/Nữ: 1,000,000đ + Cúp
• Top 1 mỗi PEN: 500,000đ + Huy chương
• Finisher: Huy chương hoàn thành

💬 Tham gia nhóm Zalo: https://zalo.me/g/breaking450
📞 Hotline: 0905123456

Run Young Strong Together! 💪`,

      subjectPaymentConfirmed:
        "Thanh toán thành công - Số BIB {{bibNumber}} - BREAKING 4:50",
      bodyPaymentConfirmed: `Thanh toán thành công! 🎉

Số BIB của bạn: {{bibNumber}}

📋 THÔNG TIN CHECK-IN:
- Thời gian: 05:30 - 06:00, ngày 08/02/2026
- Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh
- Nhận: BIB + Áo giải (nếu có) + Túi race pack

⚠️ LƯU Ý:
- Có mặt trước 20 phút để điểm danh
- Mang theo CCCD/CMND (bản chính)
- Mang theo mã QR check-in (đính kèm email)
- Cut-off time: 55 phút

🏆 GIẢI THƯỞNG:
• Top 1 Nam/Nữ toàn giải: 2,000,000đ + Cúp
• Top 2 Nam/Nữ toàn giải: 1,500,000đ + Cúp
• Top 3 Nam/Nữ toàn giải: 1,000,000đ + Cúp
• Top 1 mỗi PEN (A/B/C/D): 500,000đ + Huy chương
• Hoàn thành đúng cut-off: Huy chương Finisher

📱 Tham gia nhóm Zalo để cập nhật thông tin: https://zalo.me/g/breaking450

Chúc bạn thi đấu thành công! 🏃‍♂️
Run Young Strong Together! 💪`,

      subjectBibAnnouncement: "🏃 Công bố số BIB - BREAKING 4:50",
      bodyBibAnnouncement: `Xin chào {{fullName}}! 🎉

Số BIB của bạn cho BREAKING 10KM đã được công bố:

🏃 SỐ BIB: {{bibNumber}}

📦 THÔNG TIN NHẬN RACE PACK:
- Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh, Huế
- Thời gian: 05:30 - 06:00, sáng ngày 08/02/2026
- Mang theo: 
  + CCCD/CMND (bản chính)
  + Mã QR check-in (đính kèm email này)

📋 THÔNG TIN CỦA BẠN:
- Họ tên: {{fullName}}
- Số BIB: {{bibNumber}}
- Cự ly: {{distanceName}}
- Áo: {{shirtInfo}}

🏁 LỊCH TRÌNH NGÀY THI ĐẤU (08/02/2026):
05:00 - 05:30: Check-in, nhận BIB
05:30 - 06:00: Tập trung, khởi động
06:00: Xuất phát chính thức
07:00: Cut-off time (55 phút)
07:30: Trao giải

🏆 CẤU TRÚC GIẢI THƯỞNG:
• Top 1 Nam/Nữ toàn giải: 2,000,000đ + Cúp vàng
• Top 2 Nam/Nữ toàn giải: 1,500,000đ + Cúp bạc
• Top 3 Nam/Nữ toàn giải: 1,000,000đ + Cúp đồng
• Top 1 mỗi PEN (A/B/C/D): 500,000đ + Huy chương vàng
• Hoàn thành đúng cut-off time: Huy chương Finisher

💡 CHUẨN BỊ:
✅ Giày chạy đã quen
✅ Trang phục thoải mái
✅ Đồng hồ GPS (nếu có)
✅ Nước uống
✅ Tinh thần tốt nhất!

📱 Tham gia nhóm Zalo sự kiện: https://zalo.me/g/breaking450
📞 Hotline hỗ trợ: 0905123456

Hẹn gặp bạn tại vạch xuất phát! 🏁
Run Young Strong Together! 💪`,

      subjectRacePackInfo: "Thông tin quan trọng - BREAKING 4:50",
      bodyRacePackInfo: `Thông tin nhận Race Pack:

📍 Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh
⏰ Thời gian: 05:30 - 06:00, ngày 08/02/2026

Mang theo:
- CCCD/CMND
- Số BIB: {{bibNumber}}
- Mã QR check-in

🏆 Giải thưởng:
• Top 1-3 toàn giải: Tiền mặt + Cúp
• Top 1 mỗi PEN: 500,000đ
• Finisher: Huy chương

See you at the start line! 🏃`,

      subjectReminder: "Nhắc nhở - BREAKING 4:50 sắp diễn ra!",
      bodyReminder: `Nhắc nhở: BREAKING 4:50 sắp diễn ra!

📅 Ngày mai: 08/02/2026
⏰ Xuất phát: 06:00
🏃 Số BIB: {{bibNumber}}

Chuẩn bị:
✅ Đồng hồ GPS/thiết bị đo
✅ Giày chạy tốt
✅ Tinh thần sẵn sàng!
✅ Huy chương đang chờ bạn!

Run Young Strong Together! 💪`,

      bodyRegistrationPending: `Cảm ơn bạn đã đăng ký BREAKING 4:50!

🏃 Thông tin đăng ký của bạn đã được ghi nhận.
💳 Vui lòng hoàn tất thanh toán để xác nhận tham gia.

📋 CHI TIẾT SỰ KIỆN:
- Tên: BREAKING 10KM - TEAM HUE PACE 4:50
- Ngày: 08/02/2026, 06:00
- Địa điểm: Ngã tư Võ Nguyên Giáp - Hoàng Lanh, Huế
- Cut-off time: 55 phút

🏆 GIẢI THƯỞNG:
• Top 1 Nam/Nữ: 2,000,000đ + Cúp
• Top 2 Nam/Nữ: 1,500,000đ + Cúp
• Top 3 Nam/Nữ: 1,000,000đ + Cúp
• Top 1 mỗi PEN: 500,000đ + Huy chương
• Finisher: Huy chương hoàn thành

💬 Tham gia nhóm Zalo: https://zalo.me/g/breaking450

Run Young Strong -- Together! 💪`,

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
