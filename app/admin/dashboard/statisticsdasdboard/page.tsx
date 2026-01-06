import React, { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Mail, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";

const EnhancedStatistics = () => {
  // Sample data - registration trends with payment
  const registrationTrends = [
    { date: "01/01", registered: 15, paid: 12 },
    { date: "02/01", registered: 23, paid: 18 },
    { date: "03/01", registered: 35, paid: 30 },
    { date: "04/01", registered: 28, paid: 25 },
    { date: "05/01", registered: 42, paid: 38 },
    { date: "06/01", registered: 38, paid: 35 },
    { date: "07/01", registered: 45, paid: 42 },
  ];

  // Email statistics
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

  // Distance registrations by day
  const distanceByDay = [
    { date: "01/01", "5km": 8, "10km": 5, "21km": 2 },
    { date: "02/01", "5km": 12, "10km": 8, "21km": 3 },
    { date: "03/01", "5km": 18, "10km": 12, "21km": 5 },
    { date: "04/01", "5km": 15, "10km": 10, "21km": 3 },
    { date: "05/01", "5km": 22, "10km": 15, "21km": 5 },
    { date: "06/01", "5km": 20, "10km": 13, "21km": 5 },
    { date: "07/01", "5km": 24, "10km": 16, "21km": 5 },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  const DISTANCE_COLORS = {
    "5km": "#3b82f6",
    "10km": "#10b981",
    "21km": "#f59e0b",
  };

  const getEmailTypeLabel = (type) => {
    const labels = {
      REGISTRATION_PENDING: "Email đăng ký",
      PAYMENT_CONFIRMED: "Xác nhận thanh toán",
      BIB_ANNOUNCEMENT: "Thông báo BIB",
      RACE_PACK_INFO: "Thông tin Race Pack",
    };
    return labels[type] || type;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Thống kê nâng cao</h1>

      {/* Registration Trends with Payment Line */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            📊 Đăng ký & Thanh toán theo thời gian (7 ngày gần nhất)
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Đăng ký</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Đã thanh toán</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={registrationTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                formatNumber(value),
                name === "registered" ? "Đăng ký" : "Đã thanh toán",
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="registered"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Đăng ký"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="paid"
              stroke="#ef4444"
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
              {formatNumber(
                registrationTrends.reduce((sum, d) => sum + d.registered, 0)
              )}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Đã thanh toán (7 ngày)</div>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(
                registrationTrends.reduce((sum, d) => sum + d.paid, 0)
              )}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Tỷ lệ chuyển đổi</div>
            <div className="text-2xl font-bold text-green-600">
              {(
                (registrationTrends.reduce((sum, d) => sum + d.paid, 0) /
                  registrationTrends.reduce(
                    (sum, d) => sum + d.registered,
                    0
                  )) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
        </div>
      </div>

      {/* Email Statistics */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          📧 Thống kê Email theo loại
        </h2>

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
                    {formatNumber(stat.sent)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-gray-600">Lỗi</span>
                  </div>
                  <span className="font-bold text-red-600">
                    {formatNumber(stat.failed)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-gray-600">Chờ</span>
                  </div>
                  <span className="font-bold text-yellow-600">
                    {formatNumber(stat.pending)}
                  </span>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Tổng
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatNumber(stat.total)}
                  </span>
                </div>
              </div>

              {/* Success rate */}
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
            <div className="text-sm text-gray-600 mb-1">Tổng email đã gửi</div>
            <div className="text-3xl font-bold text-green-600">
              {formatNumber(emailStats.reduce((sum, s) => sum + s.sent, 0))}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Tổng email lỗi</div>
            <div className="text-3xl font-bold text-red-600">
              {formatNumber(emailStats.reduce((sum, s) => sum + s.failed, 0))}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Email đang chờ</div>
            <div className="text-3xl font-bold text-yellow-600">
              {formatNumber(emailStats.reduce((sum, s) => sum + s.pending, 0))}
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
      </div>

      {/* Distance registrations by day */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            🏃 Đăng ký theo cự ly theo ngày (7 ngày gần nhất)
          </h2>
          <div className="flex items-center gap-4 text-sm">
            {Object.entries(DISTANCE_COLORS).map(([distance, color]) => (
              <div key={distance} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                ></div>
                <span>{distance}</span>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={distanceByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => formatNumber(value)} />
            <Legend />
            <Bar
              dataKey="5km"
              fill={DISTANCE_COLORS["5km"]}
              name="5km"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="10km"
              fill={DISTANCE_COLORS["10km"]}
              name="10km"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="21km"
              fill={DISTANCE_COLORS["21km"]}
              name="21km"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Tổng 5km</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(
                distanceByDay.reduce((sum, d) => sum + d["5km"], 0)
              )}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Tổng 10km</div>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(
                distanceByDay.reduce((sum, d) => sum + d["10km"], 0)
              )}
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Tổng 21km</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(
                distanceByDay.reduce((sum, d) => sum + d["21km"], 0)
              )}
            </div>
          </div>
        </div>
      </div>

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
};

export default EnhancedStatistics;
