import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

function safeSheetName(value: string, fallback: string) {
  return (value.replace(/[\\/?*\[\]:]/g, "-").trim() || fallback).slice(0, 31);
}

export async function GET(
  _req: Request,
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
            shirts: true,
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
    "Ngày nhận": payment.createdAt.toISOString(),
  }));
  const webhookRows = webhookLogs.map((log) => ({
    "Thời gian": log.createdAt.toISOString(),
    "Mã hồ sơ": log.application?.publicCode || "",
    Email: log.application?.email || "",
    Event: log.event,
    "Transaction ID": log.transactionId || "",
    "Trạng thái": log.status,
    Lỗi: log.errorMessage || "",
    Payload: JSON.stringify(log.payload),
  }));

  const workbook = XLSX.utils.book_new();
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
