import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { verifyMerchReportToken } from "@/lib/merch-report-access";

const categoryLabel = (value: string) =>
  value === "MALE" ? "Nam" : value === "FEMALE" ? "Nữ" : "Trẻ em";
const typeLabel = (value: string) =>
  value === "SHORT_SLEEVE" ? "T-shirt" : "Singlet";
const sizeLabel = (value: string) => value.replace("KID_", "");
const paymentLabel = (value: string) =>
  value === "PAID" ? "Đã thanh toán" : "Chờ thanh toán";
const fulfillmentLabel: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang chuẩn bị",
  SHIPPED: "Đã gửi hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; token: string }> },
) {
  try {
    const { slug, token } = await context.params;
    const campaign = await prisma.merchCampaign.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!campaign || !verifyMerchReportToken(campaign.id, token)) {
      return NextResponse.json(
        { error: "Link báo cáo không hợp lệ hoặc đã bị thay đổi" },
        { status: 404 },
      );
    }

    const orders = await prisma.merchOrder.findMany({
      where: { campaignId: campaign.id },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });

    const detailRows = orders.map((order, index) => ({
      STT: index + 1,
      "Mã đơn": order.publicCode,
      "Tên người mua": order.fullName,
      Email: order.email,
      "Số điện thoại": order.phone,
      "Cách nhận áo":
        order.deliveryMethod === "SHIPPING"
          ? "Chuyển phát - người nhận trả phí"
          : "Nhận trực tiếp",
      "Địa chỉ nhận hàng":
        order.deliveryMethod === "SHIPPING" ? order.shippingAddress : "",
      "Chi tiết áo": order.items
        .map(
          (item) =>
            item.styleName +
            " - " +
            categoryLabel(item.category) +
            " - " +
            typeLabel(item.type) +
            " - Size " +
            sizeLabel(item.size) +
            " x " +
            item.quantity,
        )
        .join("; "),
      "Tổng số áo": order.items.reduce((sum, item) => sum + item.quantity, 0),
      "Tổng tiền": order.totalAmount,
      "Thanh toán": paymentLabel(order.paymentStatus),
      "Ngày đặt": order.createdAt.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      "Ngày thanh toán": order.paymentDate
        ? order.paymentDate.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })
        : "",
      "Tình trạng giao hàng":
        fulfillmentLabel[order.fulfillmentStatus] || order.fulfillmentStatus,
      "Ghi chú": order.notes || "",
    }));

    const summary = new Map<string, Record<string, string | number>>();
    for (const order of orders.filter(
      (item) => item.paymentStatus === "PAID",
    )) {
      for (const item of order.items) {
        const key = [item.category, item.type, item.size].join("|");
        const row = summary.get(key) || {
          "Loại áo": categoryLabel(item.category),
          "Kiểu áo": typeLabel(item.type),
          Size: sizeLabel(item.size),
          "Số lượng đã thanh toán": 0,
        };
        row["Số lượng đã thanh toán"] =
          Number(row["Số lượng đã thanh toán"]) + item.quantity;
        summary.set(key, row);
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detailRows),
      "Danh sách đơn",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([...summary.values()]),
      "Áo đã thanh toán",
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="merch-report-' +
          campaign.slug +
          "-" +
          Date.now() +
          '.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
