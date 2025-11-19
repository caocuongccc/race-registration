// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");

  useEffect(() => {
    loadStats();
  }, [selectedEvent]);

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
                        })
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
                        )
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
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
