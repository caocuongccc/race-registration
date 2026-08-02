"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, RefreshCw, Search, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

const categoryLabel: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  KID: "Trẻ em",
};
const typeLabel: Record<string, string> = {
  SHORT_SLEEVE: "T-shirt",
  TANK_TOP: "Singlet",
};
const fulfillmentLabel: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang chuẩn bị",
  SHIPPED: "Đã gửi hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};
const sizeLabel = (size: string) => size.replace("KID_", "");

export default function MerchReportPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/merch-reports/${slug}/${token}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Không tải được báo cáo");
      setData(result);
    } catch (loadError: any) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [slug, token]);

  const orders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (data?.orders || []).filter((order: any) => {
      if (status !== "all" && order.paymentStatus !== status) return false;
      if (!keyword) return true;
      return [order.publicCode, order.fullName, order.email, order.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [data, search, status]);

  useEffect(() => {
    setPage(1);
  }, [search, status, pageSize]);

  const totalPages = Math.max(Math.ceil(orders.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageOrders = orders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const firstItem = orders.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, orders.length);

  if (loading && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50 p-4">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-950">
            Không mở được báo cáo
          </h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  const stats = data.stats;
  const exportUrl = `/api/merch-reports/${slug}/${token}/export`;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Báo cáo bán áo
            </p>
            <h1 className="text-2xl font-bold">{data.campaign.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Danh sách được cập nhật theo dữ liệu hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadReport} disabled={loading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
            <a href={exportUrl}>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Tổng đơn", stats.totalOrders],
            ["Đã thanh toán", stats.paidOrders],
            ["Chờ thanh toán", stats.pendingOrders],
            ["Áo đã thanh toán", stats.totalShirts],
            ["Doanh thu", formatCurrency(stats.revenue)],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <Shirt className="h-5 w-5 text-emerald-700" />
            Tổng hợp áo đã thanh toán
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.shirtSummary.length ? (
              stats.shirtSummary.map((item: any) => (
                <span
                  key={`${item.category}-${item.type}-${item.size}`}
                  className="rounded-md border bg-gray-50 px-3 py-2 text-sm"
                >
                  {categoryLabel[item.category]} · {typeLabel[item.type]} · Size{" "}
                  {sizeLabel(item.size)}{" "}
                  <strong className="ml-2">{item.quantity}</strong>
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">Chưa có áo đã thanh toán.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_150px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Tìm mã đơn, tên, email hoặc số điện thoại"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
            </Select>
            <Select
              value={String(pageSize)}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label="Số đơn trên mỗi trang"
            >
              <option value="10">10 đơn/trang</option>
              <option value="20">20 đơn/trang</option>
              <option value="50">50 đơn/trang</option>
            </Select>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Hiển thị {firstItem}-{lastItem} trong {orders.length} đơn hàng
          </p>
        </section>

        <section className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-gray-100 text-left text-gray-700">
              <tr>
                {[
                  "Mã đơn",
                  "Người mua",
                  "Liên hệ",
                  "Nhận áo",
                  "Áo đã chọn",
                  "Số tiền",
                  "Thanh toán",
                  "Xử lý",
                  "Ngày đặt",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageOrders.map((order: any) => (
                <tr key={order.id} className="border-t align-top">
                  <td className="px-4 py-3 font-semibold">
                    {order.publicCode}
                  </td>
                  <td className="px-4 py-3">{order.fullName}</td>
                  <td className="px-4 py-3">
                    <div>{order.phone}</div>
                    <div className="text-gray-500">{order.email}</div>
                  </td>
                  <td className="max-w-56 px-4 py-3">
                    <div>
                      {order.deliveryMethod === "SHIPPING"
                        ? "Chuyển phát"
                        : "Trực tiếp"}
                    </div>
                    {order.deliveryMethod === "SHIPPING" && (
                      <div className="mt-1 text-xs text-gray-500">
                        {order.shippingAddress}
                      </div>
                    )}
                  </td>
                  <td className="max-w-80 px-4 py-3">
                    {order.items.map((item: any) => (
                      <div key={item.id}>
                        {categoryLabel[item.category]} · {typeLabel[item.type]}{" "}
                        · Size {sizeLabel(item.size)} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge paid={order.paymentStatus === "PAID"} />
                  </td>
                  <td className="px-4 py-3">
                    {fulfillmentLabel[order.fulfillmentStatus] ||
                      order.fulfillmentStatus}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3 md:hidden">
          {pageOrders.map((order: any) => (
            <article
              key={order.id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{order.fullName}</p>
                  <p className="text-sm text-gray-500">
                    {order.publicCode} · {order.phone}
                  </p>
                </div>
                <StatusBadge paid={order.paymentStatus === "PAID"} />
              </div>
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span>
                      {categoryLabel[item.category]} · {typeLabel[item.type]} ·
                      Size {sizeLabel(item.size)}
                    </span>
                    <strong>× {item.quantity}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t pt-3 text-sm">
                <span>
                  {order.deliveryMethod === "SHIPPING"
                    ? "Chuyển phát · người nhận trả phí"
                    : "Nhận trực tiếp"}
                </span>
                <strong className="text-emerald-700">
                  {formatCurrency(order.totalAmount)}
                </strong>
              </div>
              {order.deliveryMethod === "SHIPPING" && (
                <p className="mt-2 text-sm text-gray-500">
                  {order.shippingAddress}
                </p>
              )}
            </article>
          ))}
        </section>

        {!orders.length && (
          <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
            Không có đơn phù hợp.
          </div>
        )}

        {orders.length > 0 && (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-gray-600">
              Trang {currentPage}/{totalPages} · {orders.length} đơn
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Sau
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
    >
      {paid ? "Đã thanh toán" : "Chờ thanh toán"}
    </span>
  );
}
