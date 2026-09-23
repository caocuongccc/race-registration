// Preview safely first: npx tsx prisma/seed-xmaxday-2026.ts --dry-run
// Create/update draft: npx tsx prisma/seed-xmaxday-2026.ts

import { PrismaClient, ShirtCategory, ShirtSize, ShirtType } from "@prisma/client";
import { encryptBankAccount } from "../lib/encryption";

const prisma = new PrismaClient();

const EVENT_SLUG = "xmaxday-2026";
const EVENT_NAME = "XmaxDay – Chạy 10 vòng nhị cầu Sông Hương";
const EVENT_DATE = new Date("2026-12-20T05:00:00+07:00");
const OWNER_EMAIL = process.env.XMAXDAY_EVENT_OWNER_EMAIL;
const SUPPORT_AMOUNT = 200_000;
const DRY_RUN = process.argv.includes("--dry-run");

const DESCRIPTION = `Trên tinh thần hưởng ứng Noel 2026, HTC tạo thử thách XmaxDay dành cho các chân chạy muốn chinh phục 10 vòng hồ, góp phần thúc đẩy phong trào thể thao mùa đông.

Ngày chạy: 20/12/2026.
Cung đường: 10 vòng nhị cầu Sông Hương, thành phố Huế.

Vận động viên có thể chọn một trong hai hình thức:
1. Đăng ký tham gia và không nhận áo finisher: không thu phí.
2. Đăng ký tham gia và nhận áo finisher: ủng hộ Quỹ tối thiểu 200.000đ. Hệ thống ghi nhận mức tối thiểu 200.000đ; vận động viên muốn ủng hộ thêm vui lòng liên hệ Ban Tổ chức.

Thông tin cần cung cấp gồm họ tên, tên in BIB, ngày sinh, căn cước và các thông tin liên hệ bắt buộc trên hệ thống.`;

const DISTANCES = [
  { name: "10 vòng hồ", price: 0, bibPrefix: "XMD", requiresFinisherShirt: false, sortOrder: 0 },
] as const;

const SHIRT_SIZES: ShirtSize[] = [
  ShirtSize.XS,
  ShirtSize.S,
  ShirtSize.M,
  ShirtSize.L,
  ShirtSize.XL,
  ShirtSize.XXL,
  ShirtSize.XXXL,
];

async function resolveOwner() {
  if (OWNER_EMAIL) {
    const owner = await prisma.user.findUnique({
      where: { email: OWNER_EMAIL },
      select: { id: true, email: true },
    });
    if (!owner) throw new Error(`Không tìm thấy tài khoản ${OWNER_EMAIL}.`);
    return owner;
  }

  const owner = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!owner) {
    throw new Error("Không tìm thấy ADMIN. Hãy đặt XMAXDAY_EVENT_OWNER_EMAIL trước khi chạy.");
  }
  return owner;
}

async function main() {
  const owner = await resolveOwner();
  const existing = await prisma.event.findUnique({
    where: { slug: EVENT_SLUG },
    select: { id: true, _count: { select: { registrations: true } } },
  });

  if (existing && existing._count.registrations > 0) {
    throw new Error(
      `Sự kiện đã có ${existing._count.registrations} đăng ký. Script dừng để không thay đổi cấu hình đang bán.`,
    );
  }

  console.log(`Owner: ${owner.email}`);
  console.log(`Event: ${EVENT_NAME} (${EVENT_SLUG})`);
  console.table(DISTANCES);
  if (DRY_RUN) {
    console.log("DRY RUN: chưa ghi dữ liệu vào database.");
    return;
  }

  const bank = encryptBankAccount({
    bankName: "Sacombank",
    bankCode: "STB",
    accountNumber: "044708101981",
    accountName: "LE THI MINH TRANG",
  });

  const eventData = {
    name: EVENT_NAME,
    description: DESCRIPTION,
    date: EVENT_DATE,
    location: "Nhị cầu Sông Hương",
    address: "Cung đường nhị cầu Sông Hương",
    city: "Thành phố Huế",
    status: "DRAFT" as const,
    isPublished: false,
    allowRegistration: false,
    // Keep race-kit sales hidden. EventShirt rows below are option sources for
    // finisher shirts only, which avoids forcing a shirt on free registrations.
    hasShirt: false,
    requiresShirtPurchase: false,
    allowStandaloneShirtSale: false,
    requireOnlinePayment: true,
    sendBibImmediately: true,
    registrationServiceOnly: false,
    enableOptionalFinisherDonation: true,
    minFinisherDonation: SUPPORT_AMOUNT,
    bankName: bank.bankNameEncrypted,
    bankAccount: bank.accountNumberEncrypted,
    bankHolder: bank.accountNameEncrypted,
    bankCode: bank.bankCodeEncrypted,
    showIdCard: true,
    showAddress: false,
    showCity: false,
    showBloodType: false,
    showEmergencyContact: false,
    showHealthDeclaration: false,
    showBibName: true,
    requireWaiver: true,
    waiverTitle: "Cam kết tham gia thử thách XmaxDay 2026",
    waiverVersion: "XMAXDAY-2026-v1",
    waiverContent:
      "Tôi xác nhận đủ sức khỏe tham gia, tự chịu trách nhiệm về tình trạng sức khỏe cá nhân và tuân thủ hướng dẫn an toàn của Ban Tổ chức.",
    raceDaySchedule: "Ngày chạy: Chủ nhật, 20/12/2026. Thời gian tập trung và xuất phát sẽ được Ban Tổ chức cập nhật.",
    racePackLocation: "Ban Tổ chức cập nhật sau",
    racePackTime: "Ban Tổ chức cập nhật sau",
    racePackSchedule: "Lịch nhận BIB và áo finisher sẽ được thông báo qua email đăng ký.",
    createdById: owner.id,
  };

  const event = await prisma.event.upsert({
    where: { slug: EVENT_SLUG },
    update: eventData,
    create: { slug: EVENT_SLUG, ...eventData },
  });

  await prisma.eventUser.upsert({
    where: { eventId_userId: { eventId: event.id, userId: owner.id } },
    update: { role: "ADMIN" },
    create: { eventId: event.id, userId: owner.id, role: "ADMIN" },
  });

  await prisma.distance.updateMany({
    where: { eventId: event.id, name: { notIn: DISTANCES.map((item) => item.name) } },
    data: { isAvailable: false },
  });
  for (const distance of DISTANCES) {
    await prisma.distance.upsert({
      where: { eventId_name: { eventId: event.id, name: distance.name } },
      update: { ...distance, maxParticipants: null, isAvailable: true, hasGoals: false, cloneRaceShirtToFinisher: false },
      create: { eventId: event.id, ...distance, maxParticipants: null, isAvailable: true, hasGoals: false, cloneRaceShirtToFinisher: false },
    });
  }

  await prisma.eventShirt.updateMany({
    where: { eventId: event.id },
    data: { isAvailable: false },
  });
  for (const category of [ShirtCategory.MALE, ShirtCategory.FEMALE]) {
    for (const size of SHIRT_SIZES) {
      await prisma.eventShirt.upsert({
        where: { eventId_category_type_size: { eventId: event.id, category, type: ShirtType.SHORT_SLEEVE, size } },
        update: { price: 0, stockQuantity: 1000, isAvailable: true },
        create: { eventId: event.id, category, type: ShirtType.SHORT_SLEEVE, size, price: 0, stockQuantity: 1000, isAvailable: true },
      });
    }
  }

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
      subjectRacePackInfo: `Thông tin nhận BIB và áo - ${EVENT_NAME}`,
      subjectReminder: `Nhắc lịch chạy 20/12/2026 - ${EVENT_NAME}`,
      bodyRegistrationPending: "Cảm ơn bạn đã đăng ký {{eventName}}.",
      bodyPaymentConfirmed: "Thanh toán đã được xác nhận. Số BIB của bạn là {{bibNumber}}.",
      bodyPaymentReceivedNoBib: "Ban Tổ chức đã nhận khoản ủng hộ và ghi nhận đăng ký của bạn.",
      bodyBibAnnouncement: "Số BIB của bạn là {{bibNumber}}.",
      bodyRacePackInfo: "Thông tin nhận BIB và áo finisher sẽ được Ban Tổ chức cập nhật.",
      bodyReminder: "Hẹn gặp bạn tại thử thách XmaxDay vào ngày 20/12/2026.",
      attachQrPayment: true,
      attachQrCheckin: true,
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
      subjectRacePackInfo: `Thông tin nhận BIB và áo - ${EVENT_NAME}`,
      subjectReminder: `Nhắc lịch chạy 20/12/2026 - ${EVENT_NAME}`,
      bodyRegistrationPending: "Cảm ơn bạn đã đăng ký {{eventName}}.",
      bodyPaymentConfirmed: "Thanh toán đã được xác nhận. Số BIB của bạn là {{bibNumber}}.",
      bodyPaymentReceivedNoBib: "Ban Tổ chức đã nhận khoản ủng hộ và ghi nhận đăng ký của bạn.",
      bodyBibAnnouncement: "Số BIB của bạn là {{bibNumber}}.",
      bodyRacePackInfo: "Thông tin nhận BIB và áo finisher sẽ được Ban Tổ chức cập nhật.",
      bodyReminder: "Hẹn gặp bạn tại thử thách XmaxDay vào ngày 20/12/2026.",
      attachQrPayment: true,
      attachQrCheckin: true,
    },
  });

  console.log(`Đã tạo/cập nhật sự kiện nháp: ${event.id}`);
  console.log(`/events/${EVENT_SLUG}`);
  console.log("Đăng ký đang TẮT; hãy kiểm tra giao diện trước khi mở bán.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
