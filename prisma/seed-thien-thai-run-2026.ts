// Run: npx tsx prisma/seed-thien-thai-run-2026.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVENT_SLUG = "thien-thai-run-2026";
const EVENT_NAME = "Thiên Thai Run 2026 – Cung đường xanh, hành trình bình yên";
const EVENT_DATE = new Date("2026-09-13T05:00:00+07:00");
const OWNER_EMAIL = process.env.THIEN_THAI_EVENT_OWNER_EMAIL;
const PLACEHOLDER_PRICE = 0;

const DESCRIPTION = `Thiên Thai Run 2026 là hoạt động chạy bộ cộng đồng tại khu vực Trung tâm Văn hóa Huyền Trân, thành phố Huế, với thông điệp “Cung đường xanh, hành trình bình yên”.

Sự kiện hướng đến việc khuyến khích vận động, kết nối cộng đồng và lan tỏa lối sống xanh, khỏe mạnh, cân bằng. Không gian văn hóa và cảnh quan xanh của khu vực Thiên Thai tạo nên điểm hẹn phù hợp cho một buổi chạy đầu ngày nhẹ nhàng nhưng giàu trải nghiệm.

Giải có một cự ly duy nhất 6km. Lộ trình chính thức, giá BIB, quyền lợi vận động viên, số lượng tham dự và thể lệ chi tiết sẽ được Ban Tổ chức cập nhật sau khi hoàn tất khảo sát, đo đường và phương án vận hành.`;

const RACE_DAY_SCHEDULE = `Ngày thi đấu: Chủ nhật, 13/09/2026.

Giờ tập trung, khai mạc, xuất phát cự ly 6km, thời gian giới hạn và lịch trao giải sẽ được Ban Tổ chức cập nhật sau.`;

const RACE_PACK_SCHEDULE = `Thời gian, địa điểm và thủ tục nhận race kit sẽ được Ban Tổ chức thông báo sau.

Vận động viên vui lòng theo dõi email đăng ký và kênh thông tin chính thức của sự kiện.`;

async function resolveOwner() {
  if (OWNER_EMAIL) {
    const configuredOwner = await prisma.user.findUnique({
      where: { email: OWNER_EMAIL },
      select: { id: true, email: true },
    });
    if (!configuredOwner) {
      throw new Error(
        `Không tìm thấy tài khoản ${OWNER_EMAIL}. Hãy kiểm tra THIEN_THAI_EVENT_OWNER_EMAIL.`,
      );
    }
    return configuredOwner;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!admin) {
    throw new Error(
      "Không tìm thấy tài khoản ADMIN. Hãy đặt THIEN_THAI_EVENT_OWNER_EMAIL bằng email người sở hữu sự kiện.",
    );
  }
  return admin;
}

async function main() {
  const owner = await resolveOwner();
  console.log(`Seeding ${EVENT_NAME} for ${owner.email}...`);

  const eventData = {
    name: EVENT_NAME,
    description: DESCRIPTION,
    date: EVENT_DATE,
    location: "Trung tâm Văn hóa Huyền Trân",
    address: "Khu vực đường Thiên Thai, phường An Cựu",
    city: "Thành phố Huế",
    status: "DRAFT" as const,
    isPublished: false,
    allowRegistration: false,
    hasShirt: false,
    requiresShirtPurchase: false,
    allowStandaloneShirtSale: false,
    requireOnlinePayment: true,
    sendBibImmediately: true,
    registrationServiceOnly: false,
    racePackLocation: "Ban Tổ chức cập nhật sau",
    racePackTime: "Ban Tổ chức cập nhật sau",
    racePackSchedule: RACE_PACK_SCHEDULE,
    raceDaySchedule: RACE_DAY_SCHEDULE,
    parkingInfo:
      "Phương án gửi xe và phân luồng giao thông sẽ được Ban Tổ chức cập nhật sau khi chốt cung đường.",
    checkinProcedure:
      "Thủ tục check-in và giấy tờ cần mang theo sẽ được Ban Tổ chức thông báo trước ngày thi đấu.",
    createdById: owner.id,
  };

  const event = await prisma.event.upsert({
    where: { slug: EVENT_SLUG },
    update: eventData,
    create: { slug: EVENT_SLUG, ...eventData },
  });

  await prisma.eventUser.upsert({
    where: {
      eventId_userId: { eventId: event.id, userId: owner.id },
    },
    update: { role: "ADMIN" },
    create: { eventId: event.id, userId: owner.id, role: "ADMIN" },
  });

  const distanceName = "6km – Thiên Thai Run";
  await prisma.distance.updateMany({
    where: { eventId: event.id, name: { not: distanceName } },
    data: { isAvailable: false },
  });
  await prisma.distance.upsert({
    where: {
      eventId_name: { eventId: event.id, name: distanceName },
    },
    update: {
      price: PLACEHOLDER_PRICE,
      bibPrefix: "6K",
      maxParticipants: null,
      isAvailable: true,
      sortOrder: 0,
      hasGoals: false,
      requiresFinisherShirt: false,
      cloneRaceShirtToFinisher: false,
    },
    create: {
      eventId: event.id,
      name: distanceName,
      price: PLACEHOLDER_PRICE,
      bibPrefix: "6K",
      maxParticipants: null,
      isAvailable: true,
      sortOrder: 0,
      hasGoals: false,
      requiresFinisherShirt: false,
      cloneRaceShirtToFinisher: false,
    },
  });

  await prisma.eventShirt.updateMany({
    where: { eventId: event.id },
    data: { isAvailable: false },
  });

  const fromEmail = process.env.FROM_EMAIL || owner.email || "noreply@example.com";
  await prisma.emailConfig.upsert({
    where: { eventId: event.id },
    update: {
      fromName: `Ban Tổ chức ${EVENT_NAME}`,
      fromEmail,
      replyTo: owner.email,
      subjectRegistrationPending: `Xác nhận đăng ký - ${EVENT_NAME}`,
      subjectPaymentConfirmed: `Thanh toán thành công - BIB {{bibNumber}} - ${EVENT_NAME}`,
      subjectPaymentReceivedNoBib: `Đã nhận thanh toán - ${EVENT_NAME}`,
      subjectBibAnnouncement: `Thông báo số BIB - ${EVENT_NAME}`,
      subjectRacePackInfo: `Thông tin race kit - ${EVENT_NAME}`,
      subjectReminder: `Nhắc lịch thi đấu - ${EVENT_NAME}`,
      bodyRegistrationPending:
        "Cảm ơn bạn đã đăng ký {{eventName}}. Hồ sơ đang chờ hoàn tất thanh toán và xác nhận.",
      bodyPaymentConfirmed:
        "Thanh toán thành công. Số BIB của bạn là {{bibNumber}}.",
      bodyPaymentReceivedNoBib:
        "Ban Tổ chức đã nhận thanh toán. Số BIB sẽ được thông báo sau.",
      bodyBibAnnouncement:
        "Số BIB của bạn là {{bibNumber}}. Hẹn gặp bạn ngày 13/09/2026 tại Trung tâm Văn hóa Huyền Trân.",
      bodyRacePackInfo:
        "Thông tin nhận race kit của Thiên Thai Run 2026 sẽ được Ban Tổ chức cập nhật.",
      bodyReminder:
        "Hẹn gặp bạn tại Thiên Thai Run 2026 vào Chủ nhật, ngày 13/09/2026.",
    },
    create: {
      eventId: event.id,
      fromName: `Ban Tổ chức ${EVENT_NAME}`,
      fromEmail,
      replyTo: owner.email,
      subjectRegistrationPending: `Xác nhận đăng ký - ${EVENT_NAME}`,
      subjectPaymentConfirmed: `Thanh toán thành công - BIB {{bibNumber}} - ${EVENT_NAME}`,
      subjectPaymentReceivedNoBib: `Đã nhận thanh toán - ${EVENT_NAME}`,
      subjectBibAnnouncement: `Thông báo số BIB - ${EVENT_NAME}`,
      subjectRacePackInfo: `Thông tin race kit - ${EVENT_NAME}`,
      subjectReminder: `Nhắc lịch thi đấu - ${EVENT_NAME}`,
      bodyRegistrationPending:
        "Cảm ơn bạn đã đăng ký {{eventName}}. Hồ sơ đang chờ hoàn tất thanh toán và xác nhận.",
      bodyPaymentConfirmed:
        "Thanh toán thành công. Số BIB của bạn là {{bibNumber}}.",
      bodyPaymentReceivedNoBib:
        "Ban Tổ chức đã nhận thanh toán. Số BIB sẽ được thông báo sau.",
      bodyBibAnnouncement:
        "Số BIB của bạn là {{bibNumber}}. Hẹn gặp bạn ngày 13/09/2026 tại Trung tâm Văn hóa Huyền Trân.",
      bodyRacePackInfo:
        "Thông tin nhận race kit của Thiên Thai Run 2026 sẽ được Ban Tổ chức cập nhật.",
      bodyReminder:
        "Hẹn gặp bạn tại Thiên Thai Run 2026 vào Chủ nhật, ngày 13/09/2026.",
      attachQrPayment: true,
      attachQrCheckin: true,
    },
  });

  console.log("Seed completed.");
  console.log(`Event ID: ${event.id}`);
  console.log(`Slug: ${event.slug}`);
  console.log("Status: DRAFT (not published, registration closed)");
  console.log("Distance: 6km; price placeholder: 0 VND");
  console.log("Pending: official price, capacity, course/GPX, schedule, race kit, contact, bank and banner upload.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
