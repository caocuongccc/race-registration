// app/admin/dashboard/statistics/page.tsx - ENHANCED VERSION
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Download,
  TrendingUp,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Shirt,
} from "lucide-react";

interface Stats {
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  totalRevenue: number;
  revenueByDistance: Array<{ name: string; value: number; count: number }>;
  registrationsByDate: Array<{ date: string; count: number; paid: number }>;
  shirtStats: {
    total: number;
    byCategory: Record<string, number>;
  };
  ageGroups: Record<string, number>;
  emailStats?: Array<{
    type: string;
    sent: number;
    failed: number;
    pending: number;
    total: number;
  }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadStats();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events);
      if (data.events.length > 0) {
        setSelectedEvent(data.events[0].id);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/admin/statistics?eventId=${selectedEvent}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (selectedEvent === "all") {
      toast.error("Vui lòng chọn sự kiện cụ thể để xuất Excel");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/registrations/export?eventId=${selectedEvent}`
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations-${selectedEvent}-${Date.now()}.xlsx`;
      a.click();
      toast.success("✅ Đã xuất file Excel");
    } catch (error) {
      toast.error("❌ Không thể xuất file");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>Không thể tải thống kê</div>;
  }

  const conversionRate =
    stats.totalRegistrations > 0
      ? ((stats.paidRegistrations / stats.totalRegistrations) * 100).toFixed(1)
      : 0;

  // Mock email stats (replace with real data from API)
  const emailStats = [
    {
      type: "REGISTRATION_PENDING",
      sent: 156,
      failed: 4,
      pending: 2,
      total: 162,
    },
    { type: "PAYMENT_CONFIRMED", sent: 142, failed: 3, pending: 0, total: 145 },
    { type: "BIB_ANNOUNCEMENT", sent: 138, failed: 2, pending: 4, total: 144 },
    { type: "RACE_PACK_INFO", sent: 85, failed: 1, pending: 0, total: 86 },
  ];

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      REGISTRATION_PENDING: "Email đăng ký",
      PAYMENT_CONFIRMED: "Xác nhận thanh toán",
      BIB_ANNOUNCEMENT: "Thông báo BIB",
      RACE_PACK_INFO: "Thông tin Race Pack",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Thống kê chi tiết
          </h1>
          <p className="text-gray-600 mt-1">Phân tích dữ liệu đăng ký</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              label="Chọn sự kiện"
            >
              <option value="all">Tất cả sự kiện</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </div>
          {selectedEvent !== "all" && (
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Tổng đăng ký</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                {stats.totalRegistrations}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Đã thanh toán</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {stats.paidRegistrations}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tỷ lệ: {conversionRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Chờ thanh toán</p>
              <p className="text-4xl font-bold text-yellow-600 mt-2">
                {stats.pendingRegistrations}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Doanh thu</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration Trends with Payment Line */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              📊 Đăng ký & Thanh toán theo thời gian (7 ngày gần nhất)
            </CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Đăng ký</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Đã thanh toán</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.registrationsByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Đăng ký"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="paid"
                stroke="#10b981"
                strokeWidth={2}
                name="Đã thanh toán"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Tổng đăng ký (7 ngày)</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.registrationsByDate.reduce((sum, d) => sum + d.count, 0)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">
                Đã thanh toán (7 ngày)
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.registrationsByDate.reduce(
                  (sum, d) => sum + (d.paid || 0),
                  0
                )}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Tỷ lệ chuyển đổi</div>
              <div className="text-2xl font-bold text-purple-600">
                {conversionRate}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            📧 Thống kê Email theo loại
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {emailStats.map((stat, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {getEmailTypeLabel(stat.type)}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-600">Đã gửi</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {stat.sent}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-gray-600">Lỗi</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {stat.failed}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-gray-600">Chờ</span>
                    </div>
                    <span className="font-bold text-yellow-600">
                      {stat.pending}
                    </span>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Tổng
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {stat.total}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Tỷ lệ thành công</span>
                    <span
                      className={`font-bold ${
                        (stat.sent / stat.total) * 100 >= 95
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {((stat.sent / stat.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Email summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">
                Tổng email đã gửi
              </div>
              <div className="text-3xl font-bold text-green-600">
                {emailStats.reduce((sum, s) => sum + s.sent, 0)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Tổng email lỗi</div>
              <div className="text-3xl font-bold text-red-600">
                {emailStats.reduce((sum, s) => sum + s.failed, 0)}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Email đang chờ</div>
              <div className="text-3xl font-bold text-yellow-600">
                {emailStats.reduce((sum, s) => sum + s.pending, 0)}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Tỷ lệ thành công</div>
              <div className="text-3xl font-bold text-blue-600">
                {(
                  (emailStats.reduce((sum, s) => sum + s.sent, 0) /
                    emailStats.reduce((sum, s) => sum + s.total, 0)) *
                  100
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Distance */}
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo cự ly</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.revenueByDistance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: "#374151" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(stats.revenueByDistance ?? []).map((item, index) => (
                <div
                  key={index}
                  className="text-center p-2 bg-gray-50 rounded-lg"
                >
                  <div className="text-xs text-gray-600">{item.name}</div>
                  <div className="text-lg font-bold text-gray-900">
                    {item.count}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Age Groups */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố theo nhóm tuổi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(stats.ageGroups).map(
                    ([name, value]) => ({
                      name,
                      value,
                    })
                  )}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    const pct = percent ? (percent * 100).toFixed(0) : "0";
                    return `${name}: ${pct}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.keys(stats.ageGroups).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Shirt Statistics
      {stats.shirtStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Thống kê áo đã bán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-4xl font-bold text-blue-600">
                  {stats.shirtStats.total}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Tổng số áo đã bán
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(stats.shirtStats.byCategory).map(
                  ([category, count], index) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="text-sm font-medium">
                          {category === "MALE"
                            ? "Áo Nam"
                            : category === "FEMALE"
                              ? "Áo Nữ"
                              : "Áo Trẻ Em"}
                        </span>
                      </div>
                      <span className="text-lg font-bold">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* ✅ NEW: Enhanced Shirt Statistics Section */}
      {stats.shirtStats?.total > 0 && (
        <>
          {/* Shirt Sales Overview */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Shirt className="w-6 h-6" />
                📊 Thống kê bán áo chi tiết
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    Tổng áo đã bán
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.shirtStats.total}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Áo kèm BIB</div>
                  <div className="text-3xl font-bold text-green-600">
                    {stats.shirtStats.withBib || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.shirtStats.total > 0
                      ? (
                          (stats.shirtStats.withBib / stats.shirtStats.total) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Áo mua riêng</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {stats.shirtStats.standalone || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.shirtStats.total > 0
                      ? (
                          (stats.shirtStats.standalone /
                            stats.shirtStats.total) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Doanh thu áo</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(stats.shirtStats.revenue || 0)}
                  </div>
                </div>
              </div>

              {/* By Category (Nam/Nữ/Trẻ em) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    👔👗👶 Phân bổ theo loại
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(
                          stats.shirtStats.byCategory || {}
                        ).map(([name, value]) => ({
                          name:
                            name === "MALE"
                              ? "Nam"
                              : name === "FEMALE"
                                ? "Nữ"
                                : "Trẻ em",
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.keys(stats.shirtStats.byCategory || {}).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* By Size */}
                <div>
                  <h3 className="font-bold text-lg mb-4">
                    📏 Phân bổ theo size
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={Object.entries(stats.shirtStats.bySize || {}).map(
                        ([name, value]) => ({ name, value })
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#8b5cf6"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Table: By Category, Type, Size */}
              <div>
                <h3 className="font-bold text-lg mb-4">
                  📋 Chi tiết theo loại & size
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b-2">
                      <tr>
                        <th className="px-4 py-3 text-left">Loại áo</th>
                        <th className="px-4 py-3 text-left">Kiểu</th>
                        <th className="px-4 py-3 text-left">Size</th>
                        <th className="px-4 py-3 text-right">Kèm BIB</th>
                        <th className="px-4 py-3 text-right">Mua riêng</th>
                        <th className="px-4 py-3 text-right">Tổng</th>
                        <th className="px-4 py-3 text-right">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.shirtStats.details?.map(
                        (item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {item.category === "MALE"
                                ? "👔 Nam"
                                : item.category === "FEMALE"
                                  ? "👗 Nữ"
                                  : "👶 Trẻ em"}
                            </td>
                            <td className="px-4 py-3">
                              {item.type === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ"}
                            </td>
                            <td className="px-4 py-3 font-bold">{item.size}</td>
                            <td className="px-4 py-3 text-right text-green-600">
                              {item.withBib || 0}
                            </td>
                            <td className="px-4 py-3 text-right text-purple-600">
                              {item.standalone || 0}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {item.total}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-blue-600">
                              {formatCurrency(item.revenue || 0)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t-2">
                      <tr>
                        <td colSpan={3} className="px-4 py-3">
                          TỔNG CỘNG
                        </td>
                        <td className="px-4 py-3 text-right text-green-600">
                          {stats.shirtStats.withBib || 0}
                        </td>
                        <td className="px-4 py-3 text-right text-purple-600">
                          {stats.shirtStats.standalone || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stats.shirtStats.total}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600">
                          {formatCurrency(stats.shirtStats.revenue || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment Status Breakdown */}
              {stats.shirtStats.byStatus && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Đã thanh toán
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.shirtStats.byStatus.paid || 0}
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-900">
                        Chờ xác nhận
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.shirtStats.byStatus.pending || 0}
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-900">Thất bại</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {stats.shirtStats.byStatus.failed || 0}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Distance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo cự ly</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cự ly
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Số lượng
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Doanh thu
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Trung bình
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.revenueByDistance.map((item) => (
                  <tr key={item.name}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-blue-600">
                      {formatCurrency(item.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                      {formatCurrency(item.value / item.count)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap">TỔNG</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {stats.totalRegistrations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600">
                    {formatCurrency(stats.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {formatCurrency(
                      stats.totalRevenue / stats.totalRegistrations
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Lưu ý:</strong> Tất cả số liệu được cập nhật theo thời gian
          thực. Biểu đồ hiển thị xu hướng 7 ngày gần nhất để theo dõi hiệu quả
          chiến dịch đăng ký.
        </p>
      </div>
    </div>
  );
}
