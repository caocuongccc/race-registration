// app/admin/dashboard/statistics/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
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

interface Stats {
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
  ageGroups: Record<string, number>;
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

  const selectedEventData = events.find((e) => e.id === selectedEvent);

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

      {/* Charts Row 1 */}
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registrations Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng ký theo thời gian (7 ngày gần nhất)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.registrationsByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shirt Statistics */}
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
        )}
      </div>

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
    </div>
  );
}
