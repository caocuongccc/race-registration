import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserSession();
  if (user.role !== "ADMIN" && user.role !== "MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (user.role === "MEMBER") {
    const access = await prisma.kidRunCampaignUser.findUnique({ where: { campaignId_userId: { campaignId: id, userId: user.id } } });
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const campaign = await prisma.kidRunCampaign.findUniqueOrThrow({
    where: { id },
    include: { applications: { orderBy: { createdAt: "asc" }, include: { shirts: true, participants: { include: { category: true, shirts: true } } } } },
  });
  const participantRows = campaign.applications.flatMap((app) => app.participants.map((p, participantIndex) => ({
    "Mã hồ sơ": app.publicCode, "Phụ huynh": app.guardianName, Email: app.email, "Số điện thoại": app.phone,
    "Tên bé": p.fullName, "Ngày sinh": p.dateOfBirth.toISOString().slice(0, 10), "Năm sinh": p.birthYear,
    "Giới tính": p.gender === "MALE" ? "Nam" : "Nữ", "Trường/CLB": p.schoolClub || "", "Nhóm tuổi": p.category.name,
    "Cự ly": p.category.distanceLabel, BIB: p.bibNumber, "Đã nhận BIB": p.bibCollectedAt ? "Có" : "Chưa",
    "Áo trẻ em": p.shirts.filter((shirt) => shirt.category === "KID").map((shirt) => `${shirt.styleName} - ${shirt.type} - ${shirt.size} x${shirt.quantity}`).join("; "),
    "Áo người lớn mua thêm": participantIndex === 0 ? app.shirts.filter((shirt) => shirt.category !== "KID").map((shirt) => `${shirt.styleName} - ${shirt.category} - ${shirt.type} - ${shirt.size} x${shirt.quantity}`).join("; ") : "",
    "Tổng tiền áo hồ sơ": participantIndex === 0 ? app.shirtTotalAmount : "", "Thanh toán áo": app.shirtPaymentStatus,
  })));
  const paidShirts = campaign.applications.filter((application) => application.shirtPaymentStatus === "PAID").flatMap((application) => application.shirts);
  const grouped = new Map<string, any>();
  for (const shirt of paidShirts) {
    const key = [shirt.styleName, shirt.category, shirt.type, shirt.size].join("|");
    const row = grouped.get(key) || { "Mẫu áo": shirt.styleName, "Loại": shirt.category, "Kiểu": shirt.type, Size: shirt.size, "Số lượng": 0, "Thành tiền": 0 };
    row["Số lượng"] += shirt.quantity; row["Thành tiền"] += shirt.totalPrice; grouped.set(key, row);
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(participantRows), "Danh sach BIB");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...grouped.values()]), "Ao da thanh toan");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="kid-run-${campaign.slug}.xlsx"` } });
}