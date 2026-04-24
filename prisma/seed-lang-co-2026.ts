// prisma/seed-lang-co-2026.ts
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌊 Starting seed for Jogging - Lăng Cô huyền thoại biển 2026...\n");

  // ============================================
  // 1. CREATE ADMIN USER (if not exists)
  // ============================================
  const adminEmail = "admin@langco2026.vn";
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    console.log("👤 Creating admin user...");
    const hashedPassword = await bcrypt.hash("LangCo2026@Admin", 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Ban Tổ Chức Jogging Lăng Cô 2026",
        role: "ADMIN",
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}\n`);
  } else {
    console.log(`✅ Admin user exists: ${adminEmail}\n`);
  }

  // ============================================
  // 2. CREATE EVENT ORGANIZERS
  // ============================================
  const organizers = [
    {
      email: "vanhoa@chanmay-langco.vn",
      name: "Phòng Văn Hoá Xã Hội Chân Mây - Lăng Cô",
      phone: "0234000000",
    },
  ];

  const organizerUsers = [];
  for (const org of organizers) {
    let user = await prisma.user.findUnique({
      where: { email: org.email },
    });

    if (!user) {
      console.log(`👤 Creating organizer: ${org.name}...`);
      const hashedPassword = await bcrypt.hash("LangCo2026", 10);
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
  console.log("🏃 Creating event: Jogging - Lăng Cô huyền thoại biển 2026...\n");

  const event = await prisma.event.create({
    data: {
      // Basic Info
      name: "Jogging - Lăng Cô huyền thoại biển 2026",
      slug: "jogging-lang-co-huyen-thoai-bien-2026",
      description: `Lăng Cô – vùng đất hội tụ đủ 4 yếu tố sơn – thủy – hải – hồ hiếm có trên thế giới, nơi những cung đường chạy bộ quanh đầm Lập An sẽ mang lại cho bạn trải nghiệm không thể quên: một bên là vịnh biển xanh thẳm, một bên là đầm nước lợ thơ mộng phản chiếu bóng dãy Bạch Mã hùng vĩ.

Đầm Lập An (hay còn gọi là đầm Lăng Cô) là một trong những đầm nước lợ lớn nhất xứ Huế với diện tích mặt nước hơn 800 ha, được bao bọc bởi núi rừng Bạch Mã và giáp với vịnh biển Lăng Cô – một trong những vịnh biển đẹp nhất hành tinh được công nhận bởi Club of Most Beautiful Bays in the World.

MỤC ĐÍCH:
- Quảng bá hình ảnh du lịch và thiên nhiên đặc sắc của vùng đất Lăng Cô – Cảnh Dương
- Thúc đẩy phong trào rèn luyện sức khỏe và văn hóa chạy bộ tại địa phương
- Kết nối cộng đồng yêu thể thao và khám phá vẻ đẹp hoang sơ của đầm Lập An
- Hỗ trợ phát triển kinh tế – xã hội xã Chân Mây – Lăng Cô, huyện Phú Lộc

LỘ TRÌNH:
- 5km: Xuất phát từ trung tâm thị trấn Lăng Cô → Ven đầm Lập An → Về đích
- 10km: Xuất phát → Vòng quanh đầm Lập An → Ngắm bình minh trên mặt đầm → Về đích

ĐIỂM ĐẶC BIỆT:
Đường chạy quanh đầm Lập An – nơi từng được ví như "Tuyệt tình cốc" của xứ Huế – với con đường cát ẩn hiện giữa mặt đầm khi thủy triều rút, khung cảnh hàu nuôi trên cọc tre phản chiếu mặt nước lặng yên, và bóng núi Bạch Mã in bóng vào buổi sớm mai.`,

      date: new Date("2026-05-23T05:30:00+07:00"), // 5:30 AM, mùa hè lý tưởng nhất

      // Location
      location: "Đầm Lập An, Lăng Cô",
      address: "Thị trấn Lăng Cô, huyện Phú Lộc",
      city: "Thành phố Huế, Thừa Thiên Huế",

      // Status
      status: "DRAFT",
      isPublished: false,
      allowRegistration: false,

      // Race Pack Info
      racePackLocation: "UBND xã Chân Mây – Lăng Cô, huyện Phú Lộc",
      racePackTime: "20/06/2026, 08:00 - 17:00",

      // Payment Settings
      requireOnlinePayment: true,
      sendBibImmediately: true,
      hasShirt: true,

      // Bank Info – Phòng Văn Hoá Xã Hội xã Chân Mây – Lăng Cô
      bankName: "Ngân hàng Nông nghiệp và PTNT Việt Nam - CN Phú Lộc",
      bankAccount: "4005201009169",
      bankHolder: "PHONG VAN HOA XA HOI XA CHAN MAY LANG CO",
      bankCode: "AGRIBANK",

      // Contact Info
      hotline: "0234000000",
      emailSupport: "jogging@langco2026.vn",
      websiteUrl: "",
      facebookUrl: "",

      // Race Day Schedule
      raceDaySchedule: `04:30 - 05:00: Đón tiếp VĐV, check-in nhận BIB
05:00 - 05:20: Khởi động cùng toàn thể VĐV
05:20 - 05:30: Khai mạc giải chạy
05:30: Xuất phát cự ly 10km
05:45: Xuất phát cự ly 5km
07:30: Hoàn thành cự ly 5km (dự kiến)
08:30: Hoàn thành cự ly 10km (dự kiến)
09:00 - 10:00: Tổng kết & Trao giải
10:00: Bế mạc`,

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
        role: "EDITOR",
      },
    });
    console.log(`✅ Assigned ${org.name} as EDITOR`);
  }
  console.log("");

  // ============================================
  // 5. CREATE DISTANCES
  // ============================================
  console.log("🏁 Creating distances: 5km & 10km...\n");

  const distance5km = await prisma.distance.create({
    data: {
      eventId: event.id,
      name: "5km - Lăng Cô huyền thoại biển",
      price: 50000, // 50,000 VND
      bibPrefix: "50",
      maxParticipants: 500,
      currentParticipants: 0,
      isAvailable: true,
      sortOrder: 0,
    },
  });

  console.log(`✅ Distance created: ${distance5km.name}`);
  console.log(`   Price: ${distance5km.price.toLocaleString("vi-VN")} VND`);
  console.log(`   BIB Prefix: ${distance5km.bibPrefix}`);
  console.log(`   Max participants: ${distance5km.maxParticipants}\n`);

  const distance10km = await prisma.distance.create({
    data: {
      eventId: event.id,
      name: "10km - Vòng quanh đầm Lập An",
      price: 100000, // 100,000 VND
      bibPrefix: "10",
      maxParticipants: 500,
      currentParticipants: 0,
      isAvailable: true,
      sortOrder: 1,
    },
  });

  console.log(`✅ Distance created: ${distance10km.name}`);
  console.log(`   Price: ${distance10km.price.toLocaleString("vi-VN")} VND`);
  console.log(`   BIB Prefix: ${distance10km.bibPrefix}`);
  console.log(`   Max participants: ${distance10km.maxParticipants}\n`);

  // ============================================
  // 6. CREATE SHIRTS
  // ============================================
  console.log("👕 Creating shirt options...\n");

  const shirtPrice = 130000; // 130,000 VND – mua riêng
  const standalonePrice = 130000; // Giá như nhau vì mua riêng

  const shirtCategories = ["MALE", "FEMALE"] as const;
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
            stockQuantity: 100,
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
    `   Price: ${shirtPrice.toLocaleString("vi-VN")} VND (mua riêng)\n`
  );

  // ============================================
  // 7. CREATE EMAIL CONFIG
  // ============================================
  console.log("📧 Creating email configuration...\n");

  await prisma.emailConfig.create({
    data: {
      eventId: event.id,

      // From
      fromName: "Ban Tổ Chức Jogging Lăng Cô Huyền Thoại Biển 2026",
      fromEmail: "jogging@langco2026.vn",
      replyTo: "jogging@langco2026.vn",

      // Gmail Fallback
      useGmailFallback: true,
      gmailUser: process.env.GMAIL_USER || "",
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",

      // Email Subjects
      subjectRegistrationPending:
        "Xác nhận đăng ký - Jogging Lăng Cô Huyền Thoại Biển 2026",
      subjectPaymentConfirmed:
        "Thanh toán thành công - Số BIB {{bibNumber}} - Lăng Cô 2026",
      subjectPaymentReceivedNoBib:
        "Đã nhận thanh toán - Jogging Lăng Cô Huyền Thoại Biển 2026",
      subjectBibAnnouncement:
        "Thông báo số BIB - Jogging Lăng Cô Huyền Thoại Biển 2026",
      subjectRacePackInfo:
        "Thông tin nhận Race Pack - Lăng Cô Huyền Thoại Biển 2026",
      subjectReminder:
        "Nhắc nhở quan trọng - Jogging Lăng Cô Huyền Thoại Biển 2026",

      // Email Bodies
      bodyRegistrationPending: `Cảm ơn bạn đã đăng ký tham gia giải chạy "Jogging - Lăng Cô Huyền Thoại Biển 2026".

Vui lòng hoàn tất thanh toán để xác nhận đăng ký của bạn.

Thông tin chuyển khoản:
- Ngân hàng: Agribank - CN Phú Lộc
- Số tài khoản: 4005201009169
- Chủ tài khoản: PHONG VAN HOA XA HOI XA CHAN MAY LANG CO
- Nội dung: [Họ tên] - [Số điện thoại] - [Cự ly]

Hẹn gặp bạn tại đầm Lập An, Lăng Cô! 🌊`,

      bodyPaymentConfirmed: `Thanh toán thành công! 🎉

Số BIB của bạn: {{bibNumber}}

Hẹn gặp bạn lúc 5:30 sáng ngày thi đấu tại đầm Lập An, thị trấn Lăng Cô.
Hãy chuẩn bị sẵn sàng cho những cung đường đẹp nhất ven biển miền Trung!`,

      bodyPaymentReceivedNoBib: `Chúng tôi đã nhận được thanh toán của bạn. ✅

Số BIB sẽ được công bố trong thời gian sớm nhất.
Vui lòng theo dõi email và fanpage để cập nhật thông tin.`,

      bodyBibAnnouncement: `Số BIB của bạn là {{bibNumber}}. 🏃

Vui lòng lưu lại để check-in đúng ngày thi đấu.
Ngày nhận Race Pack: 20/06/2026 từ 08:00 - 17:00
Địa điểm: UBND xã Chân Mây – Lăng Cô, huyện Phú Lộc`,

      bodyRacePackInfo: `Thông tin nhận Race Pack:
- Địa điểm: UBND xã Chân Mây – Lăng Cô, huyện Phú Lộc
- Thời gian: 20/06/2026, 08:00 - 17:00
- Mang theo CCCD và mã QR trong email này

Lịch xuất phát ngày 21/06/2026:
- 05:30: Cự ly 10km
- 05:45: Cự ly 5km`,

      bodyReminder: `Nhắc nhở: Giải chạy "Jogging - Lăng Cô Huyền Thoại Biển 2026" diễn ra vào sáng ngày 21/06/2026.

Lịch xuất phát:
- 05:30: Cự ly 10km
- 05:45: Cự ly 5km

Địa điểm: Đầm Lập An, thị trấn Lăng Cô, huyện Phú Lộc, Thừa Thiên Huế.
Vui lòng đến trước 30 phút để check-in. Chúc bạn thi đấu tốt! 🌊🏃`,

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
  console.log(`   Location: ${event.location}, ${event.city}`);
  console.log("");
  console.log(`👤 Admin User: ${adminUser.email}`);
  console.log(`   Password: LangCo2026@Admin`);
  console.log("");
  console.log(`👥 Organizers assigned: ${organizerUsers.length}`);
  organizerUsers.forEach((org) => {
    console.log(`   - ${org.name} (${org.email})`);
  });
  console.log("");
  console.log("🏁 Distances:");
  console.log(`   ├── ${distance5km.name}`);
  console.log(`   │   Price: ${distance5km.price.toLocaleString("vi-VN")} VND | BIB: ${distance5km.bibPrefix}xxx | Max: ${distance5km.maxParticipants}`);
  console.log(`   └── ${distance10km.name}`);
  console.log(`       Price: ${distance10km.price.toLocaleString("vi-VN")} VND | BIB: ${distance10km.bibPrefix}xxx | Max: ${distance10km.maxParticipants}`);
  console.log("");
  console.log(`👕 Shirts: ${shirtCount} options`);
  console.log(
    `   Price: ${shirtPrice.toLocaleString("vi-VN")} VND (mua riêng – không bao gồm trong giá BIB)`
  );
  console.log("");
  console.log("🏦 Thông tin thanh toán:");
  console.log(`   Ngân hàng: Agribank - CN Phú Lộc`);
  console.log(`   STK: 4005201009169`);
  console.log(`   Chủ TK: Phòng Văn Hoá Xã Hội Xã Chân Mây - Lăng Cô`);
  console.log("");
  console.log("📧 Email config: ✅ Created");
  console.log("=".repeat(60));
  console.log("\n🚀 NEXT STEPS:");
  console.log("1. Kiểm tra lại ngày tổ chức và cập nhật nếu cần");
  console.log("2. Upload ảnh banner/cover giải chạy (cảnh đầm Lập An)");
  console.log("3. Upload ảnh preview áo đấu");
  console.log("4. Cập nhật hotline và email liên hệ thực tế");
  console.log("5. Set event status → REGISTRATION_OPEN khi sẵn sàng mở đăng ký");
  console.log("6. Kiểm tra webhook SePay với STK Agribank 4005201009169");
  console.log("");
  console.log("✨ Done! Hẹn gặp nhau tại đầm Lập An, Lăng Cô! 🌊🏃‍♂️🏃‍♀️\n");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
