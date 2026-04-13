// app/admin/dashboard/shirt-orders/page.tsx - UPDATED
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ShoppingBag,
  Calendar,
  Filter,
} from "lucide-react";

interface ShirtOrder {
  id: string;
  orderType: "WITH_BIB" | "STANDALONE";
  totalAmount: number;
  paymentStatus: string;
  createdAt: Date;
  paymentDate?: Date;
  registration?: {
    fullName: string;
    email: string;
    phone: string;
    bibNumber?: string;
  };
  event: {
    name: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    shirt: {
      category: string;
      type: string;
      size: string;
    };
  }>;
}

export default function ShirtOrdersPage() {
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ShirtOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadEvents();
    loadOrders();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [selectedEvent, statusFilter, typeFilter]);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, orders]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEvent !== "all") params.append("eventId", selectedEvent);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const res = await fetch(`/api/admin/shirt-orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setFilteredOrders(data.orders || []);
    } catch (error) {
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (!searchQuery) {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter((order) => {
      const matchName = order.registration?.fullName
        ?.toLowerCase()
        .includes(query);
      const matchEmail = order.registration?.email
        ?.toLowerCase()
        .includes(query);
      const matchPhone = order.registration?.phone?.includes(query);
      const matchBib = order.registration?.bibNumber
        ?.toLowerCase()
        .includes(query);

      return matchName || matchEmail || matchPhone || matchBib;
    });

    setFilteredOrders(filtered);
  };

  const handleConfirmPayment = async (orderId: string) => {
    if (!confirm("Xác nhận thanh toán cho đơn hàng này?")) return;

    try {
      const res = await fetch(
        `/api/admin/shirt-orders/${orderId}/confirm-payment`,
        {
          method: "POST",
        },
      );

      const result = await res.json();

      if (result.success) {
        toast.success("✅ Đã xác nhận thanh toán và gửi email");
        loadOrders();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể xác nhận thanh toán");
    }
  };

  const handleExport = async () => {
    if (selectedEvent === "all") {
      toast.error("Vui lòng chọn sự kiện cụ thể để xuất báo cáo");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/shirt-orders/export?eventId=${selectedEvent}`,
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-ao-${selectedEvent}-${Date.now()}.xlsx`;
      a.click();
      toast.success("✅ Đã xuất báo cáo Excel");
    } catch (error) {
      toast.error("Không thể xuất file");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" /> Đã thanh toán
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
            <Clock className="w-3 h-3" /> Chờ thanh toán
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
            <XCircle className="w-3 h-3" /> Thất bại
          </span>
        );
      default:
        return status;
    }
  };

  const getOrderTypeBadge = (type: string) => {
    if (type === "STANDALONE") {
      return (
        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
          🎽 Mua riêng
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
        👕 Kèm BIB
      </span>
    );
  };

  const paidCount = filteredOrders.filter(
    (o) => o.paymentStatus === "PAID",
  ).length;
  const pendingCount = filteredOrders.filter(
    (o) => o.paymentStatus === "PENDING",
  ).length;
  const totalRevenue = filteredOrders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const standaloneCount = filteredOrders.filter(
    (o) => o.orderType === "STANDALONE",
  ).length;
  const withBibCount = filteredOrders.filter(
    (o) => o.orderType === "WITH_BIB",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Đơn hàng áo</h1>
          <p className="text-gray-600 mt-1">
            Tổng: {filteredOrders.length} đơn (
            <span className="text-green-600">{paidCount} đã TT</span>,{" "}
            <span className="text-yellow-600">{pendingCount} chờ</span>)
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={selectedEvent === "all"}
          >
            <Download className="w-4 h-4 mr-2" />
            Xuất báo cáo tổng hợp
          </Button>
        </div>
      </div>

      {/* ✅ Event Selection Notice */}
      {selectedEvent === "all" && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <p className="text-yellow-900 font-medium">
            ⚠️ Vui lòng chọn sự kiện cụ thể để xuất báo cáo tổng hợp áo
          </p>
          <p className="text-sm text-yellow-800 mt-1">
            Báo cáo sẽ bao gồm: Áo mua riêng + Áo kèm đăng ký BIB
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng đơn</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {filteredOrders.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {standaloneCount} mua riêng, {withBibCount} kèm BIB
                </p>
              </div>
              <ShoppingBag className="w-12 h-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã thanh toán</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {paidCount}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ xác nhận</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {pendingCount}
                </p>
              </div>
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Doanh thu</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* ✅ Event Filter - Prominent */}
            <div className="md:col-span-1">
              {/* <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Chọn sự kiện
              </label> */}
              <Select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="border-2 border-blue-500"
              >
                <option value="all">Tất cả sự kiện</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              placeholder="Tìm tên, email, SĐT, BIB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="FAILED">Thất bại</option>
            </Select>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tất cả loại</option>
              <option value="STANDALONE">Mua riêng</option>
              <option value="WITH_BIB">Kèm BIB</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs">STT</th>
                  <th className="px-6 py-3 text-left text-xs">Loại</th>
                  <th className="px-6 py-3 text-left text-xs">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs">Email</th>
                  <th className="px-6 py-3 text-left text-xs">Sự kiện</th>
                  <th className="px-6 py-3 text-left text-xs">Sản phẩm</th>
                  <th className="px-6 py-3 text-left text-xs">Số tiền</th>
                  <th className="px-6 py-3 text-left text-xs">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs">Ngày đặt</th>
                  <th className="px-6 py-3 text-left text-xs">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr key={order.id} className="hover:bg-gray-50 border-b">
                    <td className="px-6 py-4">{idx + 1}</td>

                    <td className="px-6 py-4">
                      {getOrderTypeBadge(order.orderType)}
                    </td>

                    <td className="px-6 py-4">
                      {order.registration ? (
                        <div>
                          <div className="font-medium">
                            {order.registration.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.registration.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.registration.phone}
                          </div>
                          {order.registration.bibNumber && (
                            <div className="text-xs text-blue-600 font-mono mt-1">
                              BIB: {order.registration.bibNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Mua riêng</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {order.email || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm">{order.event.name}</td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <span className="font-medium">
                              {item.shirt.category === "MALE"
                                ? "Nam"
                                : item.shirt.category === "FEMALE"
                                  ? "Nữ"
                                  : "Trẻ em"}{" "}
                              - {item.shirt.size}
                            </span>
                            <span className="text-gray-500">
                              {" "}
                              × {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(order.paymentStatus)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(order.createdAt)}
                      {order.paymentDate && (
                        <div className="text-xs text-green-600 mt-1">
                          TT: {formatDate(order.paymentDate)}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {order.paymentStatus === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfirmPayment(order.id)}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Không có đơn hàng nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
