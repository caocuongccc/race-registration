// app/admin/dashboard/events/[eventId]/distances/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Target, Plus, Edit, Trash2 } from "lucide-react";
import { DistanceGoalManager } from "@/components/DistanceGoalManager";

interface Distance {
  id: string;
  name: string;
  price: number;
  bibPrefix: string;
  hasGoals: boolean;
  maxParticipants?: number;
  currentParticipants: number;
}

export default function DistanceManagementPage({ params }: any) {
  const [distances, setDistances] = useState<Distance[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<string | null>(null);
  const [showGoalManager, setShowGoalManager] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDistances();
  }, []);

  const loadDistances = async () => {
    setLoading(true);
    try {
      const eventId = await params.eventId;
      const res = await fetch(`/api/admin/events/${eventId}/distances`);
      const data = await res.json();
      setDistances(data.distances || []);
    } catch (error) {
      toast.error("Không thể tải danh sách cự ly");
    } finally {
      setLoading(false);
    }
  };

  const openGoalManager = (distanceId: string) => {
    setSelectedDistance(distanceId);
    setShowGoalManager(true);
  };

  const closeGoalManager = () => {
    setShowGoalManager(false);
    setSelectedDistance(null);
    loadDistances(); // Reload to update hasGoals flag
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedDistanceData = distances.find((d) => d.id === selectedDistance);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý cự ly</h1>
          <p className="text-gray-600 mt-1">
            Cấu hình cự ly và mục tiêu cho sự kiện
          </p>
        </div>
      </div>

      {/* Goal Manager Modal */}
      {showGoalManager && selectedDistanceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Quản lý mục tiêu - {selectedDistanceData.name}
              </h2>
              <Button variant="outline" onClick={closeGoalManager}>
                Đóng
              </Button>
            </div>
            <div className="p-6">
              <DistanceGoalManager
                distanceId={selectedDistance!}
                distanceName={selectedDistanceData.name}
                baseBibPrefix={selectedDistanceData.bibPrefix}
              />
            </div>
          </div>
        </div>
      )}

      {/* Distances List */}
      <div className="grid grid-cols-1 gap-4">
        {distances.map((distance) => (
          <Card key={distance.id}>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{distance.name}</h3>
                    {distance.hasGoals && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Có mục tiêu
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Giá vé</div>
                      <div className="font-bold text-blue-600">
                        {distance.price.toLocaleString("vi-VN")} đ
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600">BIB Prefix</div>
                      <div className="font-mono font-bold">
                        {distance.bibPrefix}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600">Đã đăng ký</div>
                      <div className="font-bold">
                        {distance.currentParticipants}
                        {distance.maxParticipants &&
                          ` / ${distance.maxParticipants}`}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600">Trạng thái</div>
                      <div>
                        {distance.maxParticipants &&
                        distance.currentParticipants >=
                          distance.maxParticipants ? (
                          <span className="text-red-600 font-medium">
                            Đã đầy
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            Còn chỗ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openGoalManager(distance.id)}
                    className="flex items-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    {distance.hasGoals ? "Chỉnh sửa mục tiêu" : "Thêm mục tiêu"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {distances.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Chưa có cự ly nào</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Hướng dẫn:</strong>
        </p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>
            • <strong>Mục tiêu (Goals):</strong> Dành cho các giải chạy có nhiều
            nhóm mục tiêu khác nhau (ví dụ: hoàn thành trong 45 phút, 60 phút,
            75 phút)
          </li>
          <li>
            • Mỗi mục tiêu sẽ có BIB riêng để dễ quản lý (ví dụ: 5K45-001,
            5K60-001)
          </li>
          <li>
            • VĐV sẽ chọn mục tiêu phù hợp khi đăng ký, giúp phân nhóm tốt hơn
          </li>
          <li>
            • Nếu không cần mục tiêu, cự ly sẽ hoạt động như bình thường với BIB
            thống nhất
          </li>
        </ul>
      </div>
    </div>
  );
}
