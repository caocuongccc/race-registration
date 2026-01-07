// components/DistanceGoalManager.tsx
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface DistanceGoal {
  id: string;
  name: string;
  description?: string;
  targetTime?: number;
  bibPrefix: string;
  maxParticipants?: number;
  priceAdjustment: number;
  isAvailable: boolean;
  sortOrder: number;
  isNew?: boolean;
}

interface Props {
  distanceId: string;
  distanceName: string;
  baseBibPrefix: string;
}

export function DistanceGoalManager({
  distanceId,
  distanceName,
  baseBibPrefix,
}: Props) {
  const [goals, setGoals] = useState<DistanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [distanceId]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/distances/${distanceId}/goals`);
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = () => {
    const newGoal: DistanceGoal = {
      id: `new-${Date.now()}`,
      isNew: true,
      name: "",
      description: "",
      targetTime: 45,
      bibPrefix: `${baseBibPrefix}45-`,
      maxParticipants: undefined,
      priceAdjustment: 0,
      isAvailable: true,
      sortOrder: goals.length,
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoal = (id: string, field: string, value: any) => {
    setGoals(
      goals.map((g) => {
        if (g.id !== id) return g;

        const updated = { ...g, [field]: value };

        // Auto-generate bibPrefix from targetTime
        if (field === "targetTime" && value) {
          updated.bibPrefix = `${baseBibPrefix}${value}-`;
        }

        return updated;
      })
    );
  };

  const deleteGoal = (id: string) => {
    if (confirm("Xóa mục tiêu này?")) {
      setGoals(goals.filter((g) => g.id !== id));
    }
  };

  const handleSave = async () => {
    // Validate
    const emptyGoals = goals.filter((g) => !g.name || !g.bibPrefix);
    if (emptyGoals.length > 0) {
      alert("⚠️ Vui lòng điền đầy đủ tên và BIB Prefix cho tất cả mục tiêu");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/distances/${distanceId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals }),
      });

      const result = await res.json();

      if (result.success) {
        alert("✅ Đã lưu thành công!");
        loadGoals();
      } else {
        alert("❌ Có lỗi xảy ra khi lưu");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("❌ Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Đang tải...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Mục tiêu cho {distanceName}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addGoal}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm mục tiêu
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Lưu
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">
              Chưa có mục tiêu nào cho cự ly này
            </p>
            <Button onClick={addGoal}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm mục tiêu đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, index) => (
              <div key={goal.id} className="bg-white border rounded-lg p-4">
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Order */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="col-span-3">
                    <label className="text-xs text-gray-600">
                      Tên mục tiêu *
                    </label>
                    <input
                      type="text"
                      value={goal.name}
                      onChange={(e) =>
                        updateGoal(goal.id, "name", e.target.value)
                      }
                      placeholder="Hoàn thành trong 45 phút"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>

                  {/* Target Time */}
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Thời gian (phút)
                    </label>
                    <input
                      type="number"
                      value={goal.targetTime || ""}
                      onChange={(e) =>
                        updateGoal(
                          goal.id,
                          "targetTime",
                          parseInt(e.target.value) || undefined
                        )
                      }
                      placeholder="45"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  {/* BIB Prefix (Auto-generated) */}
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">
                      BIB Prefix *
                    </label>
                    <input
                      type="text"
                      value={goal.bibPrefix}
                      onChange={(e) =>
                        updateGoal(
                          goal.id,
                          "bibPrefix",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="5K45-"
                      className="w-full px-3 py-2 border rounded-lg text-sm uppercase font-mono"
                      required
                    />
                  </div>

                  {/* Max Participants */}
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">
                      Số lượng tối đa
                    </label>
                    <input
                      type="number"
                      value={goal.maxParticipants || ""}
                      onChange={(e) =>
                        updateGoal(
                          goal.id,
                          "maxParticipants",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="Không giới hạn"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  {/* Available */}
                  <div className="col-span-1 flex items-center pt-5">
                    <input
                      type="checkbox"
                      checked={goal.isAvailable !== false}
                      onChange={(e) =>
                        updateGoal(goal.id, "isAvailable", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-end pt-5">
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Description (full width) */}
                  <div className="col-span-12 mt-2">
                    <label className="text-xs text-gray-600">
                      Mô tả (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={goal.description || ""}
                      onChange={(e) =>
                        updateGoal(goal.id, "description", e.target.value)
                      }
                      placeholder="Ví dụ: Dành cho VĐV chạy nhanh, có kinh nghiệm"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            💡 <strong>Lưu ý:</strong>
          </p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1">
            <li>• Mỗi mục tiêu sẽ có BIB riêng (ví dụ: 5K45-001, 5K60-001)</li>
            <li>• VĐV sẽ chọn mục tiêu khi đăng ký</li>
            <li>
              • Thứ tự hiển thị theo thời gian tăng dần (45 phút trước, 60 phút
              sau)
            </li>
            <li>• BIB Prefix tự động được tạo dựa trên thời gian mục tiêu</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
