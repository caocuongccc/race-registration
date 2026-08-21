import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

function safeSheetName(value: string, fallback: string) {
  return (value.replace(/[\\/?*\[\]:]/g, "-").trim() || fallback).slice(0, 31);
}
function formatDateTime(value: unknown) {
  if (!value) return "";
  const text = String(value).trim();
  const bankDate = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (bankDate) {
    const [, year, month, day, hour, minute, second] = bankDate;
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  }

  const date = value instanceof Date ? value : new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getTransactionDate(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, any>;
  return formatDateTime(
    data.transactionDate || data.webhookData?.transactionDate,
  );
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUserSession();
  if (user.role !== "ADMIN" && user.role !== "MEMBER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (user.role === "MEMBER") {
    const access = await prisma.kidRunCampaignUser.findUnique({
      where: { campaignId_userId: { campaignId: id, userId: user.id } },
    });
    if (!access)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [campaign, payments, webhookLogs] = await Promise.all([
    prisma.kidRunCampaign.findUniqueOrThrow({
      where: { id },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        applications: {
          orderBy: { createdAt: "asc" },
          include: {
            shirts: {
              include: {
                participant: {
                  select: {
                    fullName: true,
                    bibNumber: true,
                    category: { select: { name: true } },
                  },
                },
              },
            },
            participants: {
              where: { bibStatus: "ACTIVE" },
              include: { category: true, shirts: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
    prisma.kidRunPayment.findMany({
      where: { application: { campaignId: id } },
      include: { application: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.kidRunWebhookLog.findMany({
      where: { campaignId: id },
      include: { application: { select: { publicCode: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const participantRows = campaign.applications.flatMap((application) =>
    application.participants.map((participant, participantIndex) => ({
      "Mã hồ sơ": application.publicCode,
      "Phụ huynh": application.guardianName,
      Email: application.email,
      "Số điện thoại": application.phone,
      "Tên bé": participant.fullName,
      "Ngày sinh": participant.dateOfBirth.toISOString().slice(0, 10),
      "Năm sinh": participant.birthYear,
      "Giới tính": participant.gender === "MALE" ? "Nam" : "Nữ",
      "Trường/CLB": participant.schoolClub || "",
      "Nhóm tuổi": participant.category.name,
      "Cự ly": participant.category.distanceLabel,
      BIB: participant.bibNumber || "",
      Note: application.notes || "",
      "Trạng thái BIB": participant.bibStatus === "CANCELLED" ? "Đã hủy" : "Hoạt động",
      "Lý do hủy BIB": participant.bibCancelReason || "",
      "Đã nhận BIB": participant.bibCollectedAt ? "Có" : "Chưa",
      "Áo trẻ em": participant.shirts
        .filter((shirt) => shirt.category === "KID")
        .map(
          (shirt) =>
            `${shirt.styleName} - ${shirt.type} - ${shirt.size} x${shirt.quantity}`,
        )
        .join("; "),
      "Áo người lớn mua thêm":
        participantIndex === 0
          ? application.shirts
              .filter((shirt) => shirt.category !== "KID")
              .map(
                (shirt) =>
                  `${shirt.styleName} - ${shirt.category} - ${shirt.type} - ${shirt.size} x${shirt.quantity}`,
              )
              .join("; ")
          : "",
      "Tổng tiền áo hồ sơ":
        participantIndex === 0 ? application.shirtTotalAmount : "",
      "Thanh toán áo": application.shirtPaymentStatus,
      "Ngày thanh toán áo": application.shirtPaymentDate?.toISOString() || "",
    })),
  );

  const paidShirts = campaign.applications
    .filter((application) => application.shirtPaymentStatus === "PAID")
    .flatMap((application) => application.shirts);
  const grouped = new Map<string, any>();
  for (const shirt of paidShirts) {
    const key = [shirt.styleName, shirt.category, shirt.type, shirt.size].join(
      "|",
    );
    const row = grouped.get(key) || {
      "Mẫu áo": shirt.styleName,
      Loại: shirt.category,
      Kiểu: shirt.type,
      Size: shirt.size,
      "Số lượng": 0,
      "Thành tiền": 0,
    };
    row["Số lượng"] += shirt.quantity;
    row["Thành tiền"] += shirt.totalPrice;
    grouped.set(key, row);
  }

  const paymentRows = payments.map((payment) => ({
    "Mã hồ sơ": payment.application.publicCode,
    Email: payment.application.email,
    "Transaction ID": payment.transactionId || "",
    "Số tiền nhận": payment.amount,
    "Trạng thái": payment.status,
    "Phương thức": payment.paymentMethod || "",
    "Thời gian chuyển khoản": getTransactionDate(payment.webhookData),
    "Thời gian ghi nhận hệ thống": formatDateTime(payment.createdAt),
  }));
  const webhookRows = webhookLogs.map((log) => ({
    "Thời gian chuyển khoản": getTransactionDate(log.payload),
    "Thời gian ghi nhận hệ thống": formatDateTime(log.createdAt),
    "Mã hồ sơ": log.application?.publicCode || "",
    Email: log.application?.email || "",
    Event: log.event,
    "Transaction ID": log.transactionId || "",
    "Trạng thái": log.status,
    Lỗi: log.errorMessage || "",
    Payload: JSON.stringify(log.payload),
  }));

  const workbook = XLSX.utils.book_new();
  const exportMode = new URL(req.url).searchParams.get("mode");
  if (exportMode === "paid-shirts-detailed") {
    let order = 0;
    const detailedPaidShirtRows = campaign.applications
      .filter((application) => application.shirtPaymentStatus === "PAID")
      .flatMap((application) =>
        application.shirts.flatMap((shirt) =>
          Array.from({ length: shirt.quantity }, (_, unitIndex) => ({
            STT: ++order,
            "Mã hồ sơ": application.publicCode,
            "Phụ huynh": application.guardianName,
            "Số điện thoại": application.phone,
            Email: application.email,
            "Người nhận áo":
              shirt.category === "KID"
                ? shirt.participant.fullName
                : application.guardianName,
            BIB: shirt.category === "KID" ? shirt.participant.bibNumber || "" : "",
            "Nhóm tuổi":
              shirt.category === "KID" ? shirt.participant.category.name : "",
            "Mẫu áo": shirt.styleName,
            "Đối tượng":
              shirt.category === "KID"
                ? "Trẻ em"
                : shirt.category === "MALE"
                  ? "Nam"
                  : "Nữ",
            Kiểu: shirt.type,
            Size: shirt.size,
            "Áo thứ": unitIndex + 1,
            "Đơn giá": shirt.unitPrice,
            "Trạng thái thanh toán": application.shirtPaymentStatus,
            "Ngày thanh toán": formatDateTime(application.shirtPaymentDate),
            Note: application.notes || "",
          })),
        ),
      );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detailedPaidShirtRows),
      "Ao da thanh toan",
    );
    const paidShirtBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    return new NextResponse(paidShirtBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kid-run-paid-shirts-${campaign.slug}.xlsx"`,
      },
    });
  }
  const realCategories = campaign.categories.filter(
    (category) => category.name !== "__UNASSIGNED__",
  );
  for (const category of realCategories) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        participantRows.filter((row) => row["Nhóm tuổi"] === category.name),
      ),
      safeSheetName(category.name, "Nhom tuoi"),
    );
  }
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([...grouped.values()]),
    "Ao da thanh toan",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(paymentRows),
    "Giao dich ao",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(webhookRows),
    "Webhook Kid Run",
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kid-run-${campaign.slug}.xlsx"`,
    },
  });
}
