// ============================================
// PART 3: EXPORT SHIRT ORDERS
// ============================================
// app/api/admin/shirt-orders/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId || eventId === "all") {
      return NextResponse.json(
        { error: "Vui lòng chọn sự kiện cụ thể" },
        { status: 400 }
      );
    }

    // Get orders
    const orders = await prisma.shirtOrder.findMany({
      where: {
        eventId,
        paymentStatus: "PAID",
      },
      include: {
        registration: true,
        event: true,
        items: {
          include: {
            shirt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Order List
    const orderData = orders.map((order, idx) => ({
      STT: idx + 1,
      "Loại đơn": order.orderType === "STANDALONE" ? "Mua riêng" : "Kèm BIB",
      "Họ tên": order.registration?.fullName || "N/A",
      Email: order.registration?.email || "N/A",
      "Số điện thoại": order.registration?.phone || "N/A",
      "Số BIB": order.registration?.bibNumber || "N/A",
      "Số lượng": order.items.reduce((sum, item) => sum + item.quantity, 0),
      "Tổng tiền": order.totalAmount,
      "Ngày đặt": new Date(order.createdAt).toLocaleDateString("vi-VN"),
      "Ngày thanh toán": order.paymentDate
        ? new Date(order.paymentDate).toLocaleDateString("vi-VN")
        : "",
    }));

    const wsOrders = XLSX.utils.json_to_sheet(orderData);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Danh sách đơn hàng");

    // Sheet 2: Detailed Items
    const itemData: any[] = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        itemData.push({
          "Họ tên": order.registration?.fullName || "N/A",
          "Số điện thoại": order.registration?.phone || "N/A",
          "Số BIB": order.registration?.bibNumber || "N/A",
          "Loại áo":
            item.shirt.category === "MALE"
              ? "Nam"
              : item.shirt.category === "FEMALE"
                ? "Nữ"
                : "Trẻ em",
          "Kiểu áo": item.shirt.type === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ",
          Size: item.shirt.size,
          "Số lượng": item.quantity,
          "Đơn giá": item.unitPrice,
          "Thành tiền": item.totalPrice,
        });
      });
    });

    const wsItems = XLSX.utils.json_to_sheet(itemData);
    XLSX.utils.book_append_sheet(wb, wsItems, "Chi tiết sản phẩm");

    // Sheet 3: Summary by Size
    const sizeSummary: Record<string, Record<string, number>> = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.shirt.category}-${item.shirt.type}-${item.shirt.size}`;
        if (!sizeSummary[key]) {
          sizeSummary[key] = {
            category: item.shirt.category,
            type: item.shirt.type,
            size: item.shirt.size,
            quantity: 0,
          };
        }
        sizeSummary[key].quantity += item.quantity;
      });
    });

    const summaryData = Object.values(sizeSummary).map((item: any) => ({
      "Loại áo":
        item.category === "MALE"
          ? "Nam"
          : item.category === "FEMALE"
            ? "Nữ"
            : "Trẻ em",
      "Kiểu áo": item.type === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ",
      Size: item.size,
      "Tổng số lượng": item.quantity,
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng hợp theo size");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="shirt-orders-${eventId}-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
