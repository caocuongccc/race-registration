// components/DistanceShirtManager.tsx - FIXED VERSION
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Save, Target, Shirt } from "lucide-react";

interface Distance {
  id: string;
  name: string;
  price: number;
  bibPrefix: string;
  maxParticipants?: number;
  currentParticipants: number;
  isAvailable: boolean;
  sortOrder: number;
  isNew?: boolean;
}

interface EventShirt {
  id: string;
  category: string;
  type: string;
  size: string;
  price: number;
  stockQuantity: number;
  soldQuantity: number;
  isAvailable: boolean;
  isNew?: boolean;
}

export default function DistanceShirtManager({ eventId }: { eventId: string }) {
  const [activeTab, setActiveTab] = useState<"distances" | "shirts">(
    "distances",
  );
  const [distances, setDistances] = useState<Distance[]>([]);
  const [shirts, setShirts] = useState<EventShirt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load distances
      const distRes = await fetch(`/api/admin/events/${eventId}/distances`);
      const distData = await distRes.json();
      setDistances(distData.distances || []);

      // Load shirts
      const shirtRes = await fetch(`/api/admin/events/${eventId}/shirts`);
      const shirtData = await shirtRes.json();
      setShirts(shirtData.shirts || []);
    } catch (error) {
      console.error("Load error:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DISTANCE MANAGEMENT
  // ============================================
  const addDistance = () => {
    setDistances([
      ...distances,
      {
        id: `new-${Date.now()}`,
        name: "",
        price: 0,
        bibPrefix: "",
        maxParticipants: undefined,
        currentParticipants: 0,
        isAvailable: true,
        sortOrder: distances.length,
        isNew: true,
      },
    ]);
  };

  const updateDistance = (id: string, field: string, value: any) => {
    setDistances(
      distances.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  };

  const removeDistance = (id: string) => {
    setDistances(distances.filter((d) => d.id !== id));
  };

  const saveDistances = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/distances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distances }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Đã lưu cự ly thành công");
        loadData(); // Reload to get updated IDs
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể lưu cự ly");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // SHIRT MANAGEMENT
  // ============================================
  const addShirt = () => {
    setShirts([
      ...shirts,
      {
        id: `new-${Date.now()}`,
        category: "MALE",
        type: "SHORT_SLEEVE",
        size: "M",
        price: 150000,
        stockQuantity: 50,
        soldQuantity: 0,
        isAvailable: true,
        isNew: true,
      },
    ]);
  };

  const updateShirt = (id: string, field: string, value: any) => {
    setShirts(shirts.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeShirt = (id: string) => {
    setShirts(shirts.filter((s) => s.id !== id));
  };

  const saveShirts = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/shirts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shirts }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Đã lưu áo thành công");
        loadData();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể lưu áo");
    } finally {
      setSaving(false);
    }
  };

  // Auto-generate all sizes
  const generateAllShirts = async () => {
    if (!confirm("Tạo tất cả size áo (Nam, Nữ, Trẻ em × XS-XXL)?")) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/shirts/bulk-create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultPrice: 150000,
            defaultStock: 50,
          }),
        },
      );

      const result = await res.json();

      if (result.success) {
        toast.success(result.message || "Đã tạo tất cả mẫu áo");
        loadData();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể tạo áo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("distances")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "distances"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Target className="w-5 h-5 inline mr-2" />
          Cự ly
        </button>
        <button
          onClick={() => setActiveTab("shirts")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "shirts"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Shirt className="w-5 h-5 inline mr-2" />
          Áo kỷ niệm
        </button>
      </div>

      {/* Distances Tab */}
      {activeTab === "distances" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quản lý cự ly</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={addDistance}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm cự ly
                </Button>
                <Button onClick={saveDistances} isLoading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {distances.map((distance) => (
                <div
                  key={distance.id}
                  className="grid grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <Input
                    label="Tên cự ly"
                    value={distance.name}
                    onChange={(e) =>
                      updateDistance(distance.id, "name", e.target.value)
                    }
                    placeholder="Ví dụ: 5KM"
                  />

                  <Input
                    label="Giá (VNĐ)"
                    type="number"
                    value={distance.price}
                    onChange={(e) =>
                      updateDistance(
                        distance.id,
                        "price",
                        parseInt(e.target.value) || 0,
                      )
                    }
                  />

                  <Input
                    label="BIB Prefix"
                    value={distance.bibPrefix}
                    onChange={(e) =>
                      updateDistance(
                        distance.id,
                        "bibPrefix",
                        e.target.value.toUpperCase(),
                      )
                    }
                    placeholder="5K"
                  />

                  <Input
                    label="Giới hạn VĐV"
                    type="number"
                    value={distance.maxParticipants || ""}
                    onChange={(e) =>
                      updateDistance(
                        distance.id,
                        "maxParticipants",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    placeholder="Không giới hạn"
                  />

                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={distance.isAvailable}
                        onChange={(e) =>
                          updateDistance(
                            distance.id,
                            "isAvailable",
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">Khả dụng</span>
                    </label>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDistance(distance.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {distances.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Chưa có cự ly nào. Bấm "Thêm cự ly" để tạo mới.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shirts Tab */}
      {activeTab === "shirts" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quản lý áo kỷ niệm</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateAllShirts}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo tất cả size
                </Button>
                <Button variant="outline" onClick={addShirt}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm thủ công
                </Button>
                <Button onClick={saveShirts} isLoading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shirts.map((shirt) => (
                <div
                  key={shirt.id}
                  className="grid grid-cols-7 gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <Select
                    label="Loại"
                    value={shirt.category}
                    onChange={(e) =>
                      updateShirt(shirt.id, "category", e.target.value)
                    }
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="KID">Trẻ em</option>
                  </Select>

                  <Select
                    label="Kiểu"
                    value={shirt.type}
                    onChange={(e) =>
                      updateShirt(shirt.id, "type", e.target.value)
                    }
                  >
                    <option value="SHORT_SLEEVE">Có tay</option>
                    <option value="TANK_TOP">3 lỗ</option>
                  </Select>

                  <Select
                    label="Size"
                    value={shirt.size}
                    onChange={(e) =>
                      updateShirt(shirt.id, "size", e.target.value)
                    }
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </Select>

                  <Input
                    label="Giá"
                    type="number"
                    value={shirt.price}
                    onChange={(e) =>
                      updateShirt(
                        shirt.id,
                        "price",
                        parseInt(e.target.value) || 0,
                      )
                    }
                  />

                  <Input
                    label="Tồn kho"
                    type="number"
                    value={shirt.stockQuantity}
                    onChange={(e) =>
                      updateShirt(
                        shirt.id,
                        "stockQuantity",
                        parseInt(e.target.value) || 0,
                      )
                    }
                  />

                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shirt.isAvailable}
                        onChange={(e) =>
                          updateShirt(shirt.id, "isAvailable", e.target.checked)
                        }
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">Bán</span>
                    </label>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeShirt(shirt.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {shirts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Chưa có áo nào. Bấm "Tạo tất cả size" hoặc "Thêm thủ công".
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
