// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  AlertCircle,
} from "lucide-react";
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
} from "recharts";

interface DashboardStats {
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  totalRevenue: number;
  revenueByDistance: Array<{ name: string; value: number; count: number }>;
  registrationsByDate: Array<{ date: string; count: number }>;
  shirtStats: {
    total: number;
    byCategory: Record<string, number>;
  };
}

interface EventItem {
  id: string;
  name: string;
  role?: string; // User's role on this event
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is ADMIN
    if (session?.user?.role === "ADMIN") {
      setIsAdmin(true);
      setSelectedEvent("all"); // Admin can see "all"
    }
  }, [session]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    // Only load stats when:
    // 1. ADMIN selects "all" or specific event
    // 2. Non-admin selects specific event
    if (selectedEvent && selectedEvent !== "") {
      loadStats();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      const eventList = data.events || [];
      setEvents(eventList);

      // Auto-select first event for non-admin if no selection
      if (!isAdmin && eventList.length > 0 && !selectedEvent) {
        setSelectedEvent(eventList[0].id);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  const loadStats = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/statistics?eventId=${selectedEvent}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Show message when no event is selected
  if (!selectedEvent || selectedEvent === "") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-gray-600 mt-1">
            Dashboard quản lý đăng ký giải chạy
          </p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">
                  Vui lòng chọn sự kiện
                </h3>
                <p className="text-yellow-800 text-sm">
                  Chọn một sự kiện bên dưới để xem thống kê và báo cáo chi tiết.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Selection */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="
              flex-1 px-4 py-3 rounded-lg bg-gray-50 border-2 border-gray-300 
              text-gray-800 text-base font-medium shadow-sm
              hover:bg-gray-100 hover:border-blue-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              transition-all
            "
          >
            <option value="">-- Chọn sự kiện --</option>
            {isAdmin && <option value="all">📊 Tất cả sự kiện</option>}
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
                {event.role && ` (${event.role})`}
              </option>
            ))}
          </select>
        </div>

        {/* Events list preview */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sự kiện của bạn ({events.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event.id)}
                    className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <div className="font-medium text-gray-900">
                      {event.name}
                    </div>
                    {event.role && (
                      <div className="text-sm text-gray-600 mt-1">
                        Quyền: {event.role}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-gray-600 mt-1">
            Dashboard quản lý đăng ký giải chạy
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">
                  Không thể tải thống kê
                </h3>
                <p className="text-red-800 text-sm">
                  Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conversionRate =
    stats.totalRegistrations > 0
      ? ((stats.paidRegistrations / stats.totalRegistrations) * 100).toFixed(1)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-600 mt-1">
          Dashboard quản lý đăng ký giải chạy
        </p>
      </div>

      {/* Event Filter */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-md">
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="
            flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 
            text-gray-800 text-sm shadow-sm
            hover:bg-gray-100 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all
          "
        >
          {isAdmin && <option value="all">📊 Tất cả sự kiện</option>}
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
              {event.role && ` (${event.role})`}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Registrations */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng đăng ký</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.totalRegistrations}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid Registrations */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã thanh toán</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {stats.paidRegistrations}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tỷ lệ: {conversionRate}%
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Registrations */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ thanh toán</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {stats.pendingRegistrations}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Doanh thu</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

        {/* Registrations Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng ký theo thời gian</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.registrationsByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Shirt Statistics */}
      {stats.shirtStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Thống kê áo đã bán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.shirtStats.byCategory).map(
                        ([name, value]) => ({
                          name:
                            name === "MALE"
                              ? "Nam"
                              : name === "FEMALE"
                                ? "Nữ"
                                : "Trẻ em",
                          value,
                        }),
                      )}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => {
                        const pct = percent ? (percent * 100).toFixed(0) : "0";
                        return `${name}: ${pct}%`;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(stats.shirtStats.byCategory).map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-3">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.shirtStats.total}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Tổng số áo đã bán
                  </div>
                </div>
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
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
