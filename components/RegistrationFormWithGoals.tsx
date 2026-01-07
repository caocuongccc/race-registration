"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { Target, Clock, Users, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DistanceGoal {
  id: string;
  name: string;
  description?: string;
  targetTime?: number;
  bibPrefix: string;
  maxParticipants?: number;
  currentParticipants: number;
  priceAdjustment: number;
  isAvailable: boolean;
}

interface Distance {
  id: string;
  name: string;
  price: number;
  bibPrefix: string;
  hasGoals: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  goals?: DistanceGoal[];
}

interface Event {
  id: string;
  name: string;
  distances: Distance[];
}

export default function RegistrationFormWithGoals() {
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<Distance | null>(
    null
  );
  const [selectedGoal, setSelectedGoal] = useState<DistanceGoal | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "MALE",
    idCard: "",
    address: "",
    city: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    healthDeclaration: false,
    bloodType: "",
  });

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      const eventId = new URLSearchParams(window.location.search).get(
        "eventId"
      );
      if (!eventId) return;

      const res = await fetch(`/api/events/${eventId}?includeGoals=true`);
      const data = await res.json();
      setEvent(data.event);
    } catch (error) {
      console.error("Failed to load event:", error);
    }
  };

  const handleDistanceChange = async (distanceId: string) => {
    const distance = event?.distances.find((d) => d.id === distanceId);
    if (!distance) return;

    setSelectedDistance(distance);
    setSelectedGoal(null);

    if (distance.hasGoals) {
      try {
        const res = await fetch(`/api/distances/${distanceId}/goals`);
        const data = await res.json();
        setSelectedDistance({ ...distance, goals: data.goals });
      } catch (error) {
        console.error("Failed to load goals:", error);
      }
    }
  };

  const calculateTotal = () => {
    if (!selectedDistance) return 0;
    let total = selectedDistance.price;
    if (selectedGoal?.priceAdjustment) {
      total += selectedGoal.priceAdjustment;
    }
    return total;
  };

  const handleSubmit = async () => {
    if (!selectedDistance) {
      toast.error("Vui lòng chọn cự ly");
      return;
    }

    if (selectedDistance.hasGoals && !selectedGoal) {
      toast.error("Vui lòng chọn mục tiêu");
      return;
    }

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.dob
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event?.id,
          distanceId: selectedDistance.id,
          distanceGoalId: selectedGoal?.id || null,
          ...formData,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("✅ Đăng ký thành công!");
        window.location.href = `/payment/${result.registration.id}`;
      } else {
        toast.error(result.error || "Đăng ký thất bại");
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra khi đăng ký");
    } finally {
      setLoading(false);
    }
  };

  const getGoalAvailability = (goal: DistanceGoal) => {
    if (!goal.isAvailable) return { available: false, message: "Đã đóng" };

    if (goal.maxParticipants) {
      const remaining = goal.maxParticipants - goal.currentParticipants;
      if (remaining <= 0) {
        return { available: false, message: "Đã đầy" };
      }
      if (remaining <= 10) {
        return {
          available: true,
          message: `Còn ${remaining} chỗ`,
          warning: true,
        };
      }
    }

    return { available: true, message: "Còn chỗ" };
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Đăng ký tham gia</CardTitle>
          {event && <p className="text-gray-600 mt-2">{event.name}</p>}
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Distance Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Chọn cự ly *
              </label>
              <select
                value={selectedDistance?.id || ""}
                onChange={(e) => handleDistanceChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">-- Chọn cự ly --</option>
                {event?.distances.map((distance) => (
                  <option key={distance.id} value={distance.id}>
                    {distance.name} - {formatCurrency(distance.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Goal Selection */}
            {selectedDistance?.hasGoals && selectedDistance.goals && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Chọn mục tiêu *
                </label>
                <div className="space-y-3">
                  {selectedDistance.goals.map((goal) => {
                    const availability = getGoalAvailability(goal);

                    return (
                      <div
                        key={goal.id}
                        onClick={() =>
                          availability.available && setSelectedGoal(goal)
                        }
                        className={`
                          border-2 rounded-lg p-4 cursor-pointer transition-all
                          ${
                            selectedGoal?.id === goal.id
                              ? "border-blue-500 bg-blue-50"
                              : availability.available
                                ? "border-gray-200 hover:border-blue-300"
                                : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Target className="w-5 h-5 text-blue-600" />
                              <h3 className="font-bold text-lg">{goal.name}</h3>
                              {goal.targetTime && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  {goal.targetTime} phút
                                </div>
                              )}
                            </div>

                            {goal.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {goal.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-600">BIB:</span>
                                <span className="font-mono font-bold text-blue-600">
                                  {goal.bibPrefix}XXX
                                </span>
                              </div>

                              {goal.maxParticipants && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  <span className="text-gray-600">
                                    {goal.currentParticipants}/
                                    {goal.maxParticipants}
                                  </span>
                                </div>
                              )}

                              {goal.priceAdjustment !== 0 && (
                                <div
                                  className={`font-medium ${
                                    goal.priceAdjustment > 0
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {goal.priceAdjustment > 0 ? "+" : ""}
                                  {formatCurrency(goal.priceAdjustment)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            className={`
                            px-3 py-1 rounded-full text-xs font-medium
                            ${
                              availability.available
                                ? availability.warning
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }
                          `}
                          >
                            {availability.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total Summary */}
            {selectedDistance && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">
                      Tổng phí đăng ký
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(calculateTotal())}
                    </div>
                    {selectedGoal && (
                      <div className="text-xs text-gray-600 mt-1">
                        ({selectedDistance.name} - {selectedGoal.name})
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Số BIB dự kiến</div>
                    <div className="text-xl font-mono font-bold text-gray-900">
                      {selectedGoal?.bibPrefix || selectedDistance.bibPrefix}???
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Họ và tên *"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />

              <Input
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />

              <Input
                label="Số điện thoại *"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />

              <Input
                label="Ngày sinh *"
                type="date"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
              />

              <Select
                label="Giới tính *"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </Select>

              <Input
                label="CCCD/CMND"
                value={formData.idCard}
                onChange={(e) =>
                  setFormData({ ...formData, idCard: e.target.value })
                }
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !selectedDistance ||
                  (selectedDistance.hasGoals && !selectedGoal)
                }
                className="px-8"
              >
                {loading ? "Đang xử lý..." : "Đăng ký ngay"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
