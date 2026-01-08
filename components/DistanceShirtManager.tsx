// components/DistanceShirtManager.tsx - FIXED SAVE ISSUE
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, ArrowUp, ArrowDown, Loader2 } from "lucide-react";

interface Distance {
  id: string;
  name: string;
  price: number;
}

interface Shirt {
  id?: string;
  category: string;
  type: string;
  size: string;
  price: number;
  standalonePrice: number; // ✅ NEW: Giá bán lẻ
  stockQuantity: number;
  isAvailable: boolean;
  isNew?: boolean;
}

const DistanceShirtManagerIntegrated = ({ eventId }) => {
  const [distances, setDistances] = useState([]);
  const [shirts, setShirts] = useState([]);
  //   const [activeTab, setActiveTab] = useState("distances");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"distances" | "shirts">(
    "distances"
  );
  // Load data on mount
  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      //   const [distancesRes, shirtsRes] = await Promise.all([
      //     fetch(`/api/admin/events/${eventId}/distances`),
      //     fetch(`/api/admin/events/${eventId}/shirts`),
      //   ]);

      //   const distancesData = await distancesRes.json();
      //   const shirtsData = await shirtsRes.json();

      //   setDistances(distancesData.distances || []);
      //   setShirts(shirtsData.shirts || []);

      // Load distances
      const distRes = await fetch(`/api/admin/events/${eventId}/distances`);
      const distData = await distRes.json();
      setDistances(distData.distances || []);

      // Load shirts
      const shirtRes = await fetch(`/api/admin/events/${eventId}/shirts`);
      const shirtData = await shirtRes.json();
      setShirts(shirtData.shirts || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      alert("❌ Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Distance functions
  const addDistance = () => {
    const newDistance = {
      id: `new-${Date.now()}`,
      isNew: true,
      name: "",
      price: 100000,
      bibPrefix: "",
      maxParticipants: null,
      isAvailable: true,
      sortOrder: distances.length,
    };
    setDistances([...distances, newDistance]);
  };

  const updateDistance = (id, field, value) => {
    setDistances(
      distances.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const deleteDistance = (id) => {
    if (confirm("Xóa cự ly này? VĐV đã đăng ký sẽ không bị ảnh hưởng.")) {
      setDistances(distances.filter((d) => d.id !== id));
    }
  };

  const moveDistance = (index, direction) => {
    const newDistances = [...distances];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= distances.length) return;

    [newDistances[index], newDistances[targetIndex]] = [
      newDistances[targetIndex],
      newDistances[index],
    ];

    newDistances.forEach((d, i) => (d.sortOrder = i));
    setDistances(newDistances);
  };

  // Shirt functions
  const addShirt = () => {
    const newShirt = {
      id: `new-${Date.now()}`,
      isNew: true,
      category: "MALE",
      type: "SHORT_SLEEVE",
      size: "M",
      price: 150000,
      standalonePrice: 260000, // ✅ NEW: Default +60k
      stockQuantity: 100,
      isAvailable: true,
    };
    setShirts([...shirts, newShirt]);
  };

  const updateShirt = (id, field, value) => {
    setShirts(shirts.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const deleteShirt = (id) => {
    if (confirm("Xóa áo này?")) {
      setShirts(shirts.filter((s) => s.id !== id));
    }
  };

  const bulkCreateShirts = async () => {
    if (
      !confirm(
        "Tạo tất cả mẫu áo (Nam/Nữ/Trẻ em × XS-XXL)? Các mẫu đã tồn tại sẽ không bị trùng."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/shirts/bulk-create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultPrice: 150000,
            defaultStock: 50,
            defaultStandalonePrice: 260000, // ✅ NEW
          }),
        }
      );

      const result = await res.json();

      if (result.success) {
        alert(`✅ ${result.message}`);
        loadData(); // Reload to show new shirts
      } else {
        alert("❌ Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Bulk create error:", error);
      alert("❌ Không thể tạo áo hàng loạt");
    }
  };

  const handleSave = async (e) => {
    // Prevent default if this is triggered by event
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Validate
    const emptyDistances = distances.filter((d) => !d.name || !d.bibPrefix);
    if (emptyDistances.length > 0) {
      alert(
        "⚠️ Vui lòng điền đầy đủ thông tin cho tất cả cự ly (Tên và BIB Prefix)"
      );
      return;
    }

    setSaving(true);

    try {
      console.log("Saving distances:", distances);
      console.log("Saving shirts:", shirts);

      // Save distances
      const distancesRes = await fetch(
        `/api/admin/events/${eventId}/distances`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ distances }),
        }
      );

      // Save shirts
      const shirtsRes = await fetch(`/api/admin/events/${eventId}/shirts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shirts }),
      });

      const distancesResult = await distancesRes.json();
      const shirtsResult = await shirtsRes.json();

      console.log("Distances result:", distancesResult);
      console.log("Shirts result:", shirtsResult);

      if (distancesResult.success && shirtsResult.success) {
        alert("✅ Đã lưu thành công!");
        loadData(); // Reload fresh data
      } else {
        alert("❌ Có lỗi xảy ra khi lưu");
        console.error("Save errors:", {
          distances: distancesResult.error,
          shirts: shirtsResult.error,
        });
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("❌ Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quản lý Cự Ly & Áo</h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Lưu tất cả
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("distances")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "distances"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🏃 Cự Ly ({distances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("shirts")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "shirts"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          👕 Áo ({shirts.length})
        </button>
      </div>

      {/* Distances Tab */}
      {activeTab === "distances" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Quản lý các cự ly của sự kiện</p>
            <button
              type="button"
              onClick={addDistance}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Thêm cự ly
            </button>
          </div>

          <div className="space-y-3">
            {distances.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chưa có cự ly nào</p>
                <button
                  type="button"
                  onClick={addDistance}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Thêm cự ly đầu tiên
                </button>
              </div>
            ) : (
              distances.map((distance, index) => (
                <div
                  key={distance.id}
                  className="bg-white border rounded-lg p-4"
                >
                  <div className="grid grid-cols-12 gap-3 items-start">
                    {/* Sort buttons */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveDistance(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDistance(index, "down")}
                        disabled={index === distances.length - 1}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Name */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">
                        Tên cự ly *
                      </label>
                      <input
                        type="text"
                        value={distance.name}
                        onChange={(e) =>
                          updateDistance(distance.id, "name", e.target.value)
                        }
                        placeholder="5km, 10km..."
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        required
                      />
                    </div>

                    {/* Price */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Giá (VND)</label>
                      <input
                        type="number"
                        value={distance.price}
                        onChange={(e) =>
                          updateDistance(
                            distance.id,
                            "price",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>

                    {/* BIB Prefix */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">
                        BIB Prefix *
                      </label>
                      <input
                        type="text"
                        value={distance.bibPrefix}
                        onChange={(e) =>
                          updateDistance(
                            distance.id,
                            "bibPrefix",
                            e.target.value.toUpperCase()
                          )
                        }
                        placeholder="5K, 10K..."
                        className="w-full px-3 py-2 border rounded-lg text-sm uppercase"
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
                        value={distance.maxParticipants || ""}
                        onChange={(e) =>
                          updateDistance(
                            distance.id,
                            "maxParticipants",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder="Không giới hạn"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>

                    {/* Available */}
                    <div className="col-span-2 flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        checked={distance.isAvailable !== false}
                        onChange={(e) =>
                          updateDistance(
                            distance.id,
                            "isAvailable",
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label className="text-sm">Khả dụng</label>
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 flex justify-end pt-5">
                      <button
                        type="button"
                        onClick={() => deleteDistance(distance.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Shirts Tab */}
      {activeTab === "shirts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Quản lý các mẫu áo kỷ niệm</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={bulkCreateShirts}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Tạo tất cả size
              </button>
              <button
                type="button"
                onClick={addShirt}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Thêm áo
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {shirts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chưa có mẫu áo nào</p>
                <button
                  type="button"
                  onClick={addShirt}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Thêm mẫu áo đầu tiên
                </button>
              </div>
            ) : (
              shirts.map((shirt) => (
                <div key={shirt.id} className="bg-white border rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-3 items-start">
                    {/* Category */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Loại áo</label>
                      <select
                        value={shirt.category}
                        onChange={(e) =>
                          updateShirt(shirt.id, "category", e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="KID">Trẻ em</option>
                      </select>
                    </div>

                    {/* Type */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Kiểu</label>
                      <select
                        value={shirt.type}
                        onChange={(e) =>
                          updateShirt(shirt.id, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="SHORT_SLEEVE">Có tay</option>
                        <option value="TANK_TOP">3 lỗ</option>
                      </select>
                    </div>

                    {/* Size */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Size</label>
                      <select
                        value={shirt.size}
                        onChange={(e) =>
                          updateShirt(shirt.id, "size", e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="XXXL">XXXL</option>
                      </select>
                    </div>

                    {/* Price */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Giá (VND)</label>
                      <input
                        type="number"
                        value={shirt.price}
                        onChange={(e) =>
                          updateShirt(
                            shirt.id,
                            "price",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    {/* ✅ NEW: Standalone Price */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Giá bán lẻ <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        value={shirt.standalonePrice}
                        onChange={(e) =>
                          updateShirt(index, "standalonePrice", e.target.value)
                        }
                        className="text-sm"
                        placeholder="260000"
                      />
                    </div>
                    {/* Stock */}
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600">Số lượng</label>
                      <input
                        type="number"
                        value={shirt.stockQuantity}
                        onChange={(e) =>
                          updateShirt(
                            shirt.id,
                            "stockQuantity",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>

                    {/* Available */}
                    <div className="col-span-1 flex items-center pt-5">
                      <input
                        type="checkbox"
                        checked={shirt.isAvailable !== false}
                        onChange={(e) =>
                          updateShirt(shirt.id, "isAvailable", e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 flex justify-end pt-5">
                      <button
                        type="button"
                        onClick={() => deleteShirt(shirt.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ✅ NEW: Price Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-900">
              💡 <strong>Ghi chú giá bán:</strong>
              <br />• <strong>Giá ĐK:</strong> Giá khi khách đăng ký kèm BIB
              <br />• <strong>Giá bán lẻ:</strong> Giá khi khách mua áo riêng
              (không có BIB)
              <br />• Giá bán lẻ nên cao hơn giá ĐK
            </p>
          </div>
          {shirts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                💡 <strong>Lưu ý:</strong> Nút "Tạo tất cả size" sẽ tự động tạo
                các mẫu áo cho tất cả loại (Nam/Nữ/Trẻ em) × tất cả size
                (XS-XXL). Các mẫu đã tồn tại sẽ không bị trùng.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-900">
          ⚠️ <strong>Lưu ý quan trọng:</strong>
        </p>
        <ul className="text-sm text-yellow-800 mt-2 space-y-1">
          <li>
            • BIB Prefix dùng để sinh số BIB tự động (ví dụ: "5K" → 5K001,
            5K002...)
          </li>
          <li>
            • Nếu không đặt "Số lượng tối đa" → không giới hạn số người đăng ký
          </li>
          <li>
            • Mỗi mẫu áo cần có đầy đủ: Loại + Kiểu + Size + Giá + Số lượng
          </li>
          <li>
            • Sau khi lưu, các thay đổi sẽ áp dụng ngay lập tức cho form đăng ký
          </li>
          <li>• Xóa cự ly/áo không ảnh hưởng đến VĐV đã đăng ký trước đó</li>
        </ul>
      </div>
    </div>
  );
};

export default DistanceShirtManagerIntegrated;
