import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const categoryLabel = (v: string) =>
  v === "MALE" ? "Nam" : v === "FEMALE" ? "Nữ" : "Trẻ em";
const typeLabel = (v: string) => (v === "SHORT_SLEEVE" ? "T-shirt" : "Singlet");

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const campaign = await prisma.merchCampaign.findUnique({ where: { id } });
    if (!campaign)
      return NextResponse.json(
        { error: "Không tìm thấy chương trình" },
        { status: 404 },
      );
    const orders = await prisma.merchOrder.findMany({
      where: { campaignId: id, paymentStatus: "PAID" },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });
    const wb = XLSX.utils.book_new();
    const detailRows = orders.map((order, index) => ({
      STT: index + 1,
      "Mã đơn": order.publicCode,
      "Tên người mua": order.fullName,
      Email: order.email,
      "Số điện thoại": order.phone,
      "Địa chỉ nhận hàng": order.shippingAddress,
      "Chi tiết áo": order.items
        .map(
          (i) =>
            `${i.styleName} - ${categoryLabel(i.category)} - ${typeLabel(i.type)} - ${i.size} x ${i.quantity}`,
        )
        .join("; "),
      "Tổng số áo": order.items.reduce((sum, i) => sum + i.quantity, 0),
      "Tổng tiền": order.totalAmount,
      "Ngày đặt": order.createdAt.toLocaleString("vi-VN"),
      "Ngày thanh toán": order.paymentDate?.toLocaleString("vi-VN") || "",
      "Trạng thái giao hàng": order.fulfillmentStatus,
      "Ghi chú": order.notes || "",
    }));
    const summary = new Map<string, any>();
    for (const order of orders)
      for (const item of order.items) {
        const key = `${item.styleName}-${item.category}-${item.type}-${item.size}`;
        const row = summary.get(key) || {
          "Mẫu áo": item.styleName,
          "Loại áo": categoryLabel(item.category),
          "Kiểu áo": typeLabel(item.type),
          Size: item.size,
          "Số lượng": 0,
        };
        row["Số lượng"] += item.quantity;
        summary.set(key, row);
      }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(detailRows),
      "Danh sách đăng ký",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([...summary.values()]),
      "Thống kê đặt áo",
    );
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="merch-${campaign.slug}-${Date.now()}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
