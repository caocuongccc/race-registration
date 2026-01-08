// ============================================
// PART 4: COMPONENT - SHIRT SELECTOR WITH QUANTITY
// ============================================
// components/ShirtSelectorWithQuantity.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, ShoppingCart } from "lucide-react";

interface ShirtItem {
  shirtId: string;
  category: string;
  type: string;
  size: string;
  price: number;
  standalonePrice?: number;
  stockQuantity: number;
  soldQuantity: number;
  quantity: number; // Selected quantity
}

interface ShirtSelectorProps {
  eventId: string;
  orderType: "WITH_BIB" | "STANDALONE";
  onSelectionChange: (items: ShirtItem[]) => void;
}

export function ShirtSelectorWithQuantity({
  eventId,
  orderType,
  onSelectionChange,
}: ShirtSelectorProps) {
  const [shirts, setShirts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [cart, setCart] = useState<Map<string, ShirtItem>>(new Map());

  useEffect(() => {
    loadShirts();
  }, [eventId]);

  const loadShirts = async () => {
    const res = await fetch(`/api/events/${eventId}/shirts`);
    const data = await res.json();
    setShirts(data.shirts || []);
  };

  const addToCart = (shirt: any) => {
    const price =
      orderType === "STANDALONE"
        ? shirt.standalonePrice || shirt.price
        : shirt.price;

    const newCart = new Map(cart);
    const existing = newCart.get(shirt.id);

    if (existing) {
      // Increment quantity
      if (existing.quantity < shirt.stockQuantity - shirt.soldQuantity) {
        existing.quantity++;
        newCart.set(shirt.id, existing);
      }
    } else {
      // Add new item
      newCart.set(shirt.id, {
        shirtId: shirt.id,
        category: shirt.category,
        type: shirt.type,
        size: shirt.size,
        price: shirt.price,
        standalonePrice: shirt.standalonePrice,
        stockQuantity: shirt.stockQuantity,
        soldQuantity: shirt.soldQuantity,
        quantity: 1,
      });
    }

    setCart(newCart);
    onSelectionChange(Array.from(newCart.values()));
  };

  const removeFromCart = (shirtId: string) => {
    const newCart = new Map(cart);
    const existing = newCart.get(shirtId);

    if (existing && existing.quantity > 1) {
      existing.quantity--;
      newCart.set(shirtId, existing);
    } else {
      newCart.delete(shirtId);
    }

    setCart(newCart);
    onSelectionChange(Array.from(newCart.values()));
  };

  const getTotalAmount = () => {
    let total = 0;
    cart.forEach((item) => {
      const price =
        orderType === "STANDALONE"
          ? item.standalonePrice || item.price + 50000
          : item.price;
      total += price * item.quantity;
    });
    return total;
  };

  const availableShirts = shirts.filter(
    (s) =>
      s.category === selectedCategory &&
      s.type === selectedType &&
      s.soldQuantity < s.stockQuantity
  );

  return (
    <div className="space-y-6">
      {/* Order Type Info */}
      <div
        className={`p-4 rounded-lg border-2 ${
          orderType === "STANDALONE"
            ? "bg-purple-50 border-purple-200"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        <p className="font-medium">
          {orderType === "STANDALONE"
            ? "🎽 Chỉ mua áo (không đăng ký BIB)"
            : "👕 Mua áo kèm đăng ký"}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {orderType === "STANDALONE"
            ? "Giá: Từ 260,000đ/áo (có thể mua nhiều áo)"
            : "Giá: 200,000đ/áo khi đăng ký kèm BIB"}
        </p>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Loại áo</label>
        <div className="grid grid-cols-3 gap-3">
          {["MALE", "FEMALE", "KID"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedType("");
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedCategory === cat
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              {cat === "MALE"
                ? "👔 Nam"
                : cat === "FEMALE"
                  ? "👗 Nữ"
                  : "👶 Trẻ em"}
            </button>
          ))}
        </div>
      </div>

      {/* Type Selection */}
      {selectedCategory && (
        <div>
          <label className="block text-sm font-medium mb-2">Kiểu áo</label>
          <div className="grid grid-cols-2 gap-3">
            {["SHORT_SLEEVE", "TANK_TOP"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedType === type
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {type === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size Selection */}
      {selectedType && availableShirts.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Chọn size và số lượng
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableShirts.map((shirt) => {
              const cartItem = cart.get(shirt.id);
              const available = shirt.stockQuantity - shirt.soldQuantity;
              const price =
                orderType === "STANDALONE"
                  ? shirt.standalonePrice || shirt.price
                  : shirt.price;

              return (
                <div
                  key={shirt.id}
                  className="border-2 border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold">{shirt.size}</div>
                    <div className="text-sm text-gray-600">Còn {available}</div>
                    <div className="text-sm font-medium text-blue-600 mt-1">
                      {formatCurrency(price)}
                    </div>
                  </div>

                  {cartItem ? (
                    <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                      <button
                        onClick={() => removeFromCart(shirt.id)}
                        className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-gray-100 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-lg">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(shirt)}
                        className="w-8 h-8 rounded-full bg-white shadow-sm hover:bg-gray-100 flex items-center justify-center"
                        disabled={cartItem.quantity >= available}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => addToCart(shirt)}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cart Summary */}
      {cart.size > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Giỏ hàng ({cart.size} loại,{" "}
            {Array.from(cart.values()).reduce(
              (sum, item) => sum + item.quantity,
              0
            )}{" "}
            áo)
          </h3>

          <div className="space-y-2 mb-4">
            {Array.from(cart.values()).map((item) => {
              const price =
                orderType === "STANDALONE"
                  ? item.standalonePrice || item.price + 50000
                  : item.price;

              return (
                <div
                  key={item.shirtId}
                  className="flex justify-between text-sm bg-white rounded-lg p-3"
                >
                  <span>
                    {item.category === "MALE"
                      ? "Nam"
                      : item.category === "FEMALE"
                        ? "Nữ"
                        : "Trẻ em"}{" "}
                    - {item.size} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(price * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t-2 border-blue-300 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Tổng cộng:</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(getTotalAmount())}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
