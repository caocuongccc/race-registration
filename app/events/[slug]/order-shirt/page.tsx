// app/events/[slug]/order-shirt/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShirtSelectorWithQuantity } from "@/components/ShirtSelectorWithQuantity";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { ShoppingBag, ArrowLeft, Check, Link, ArrowRight } from "lucide-react";
import Image from "next/image";
import { ShirtImageCarousel } from "@/components/ShirtImageCarousel";

const CATEGORY_LABELS: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  KID: "Trẻ em",
};

interface ShirtItem {
  shirtId: string;
  category: string;
  type: string;
  size: string;
  price: number;
  standalonePrice?: number;
  quantity: number;
}

export default function OrderShirtPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [shirtImages, setShirtImages] = useState<any>({});
  const [shirts, setShirts] = useState<any[]>([]);

  // Customer info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Selected shirts
  const [selectedShirts, setSelectedShirts] = useState<ShirtItem[]>([]);

  useEffect(() => {
    loadEvent();
  }, [params.slug]);

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/events/${params.slug}`);
      const data = await res.json();

      if (!data.event) {
        toast.error("Không tìm thấy sự kiện");
        router.push("/");
        return;
      }

      if (!data.event.hasShirt || !data.event.allowStandaloneShirtSale) {
        toast.error("Sự kiện hiện không mở bán áo riêng");
        router.push(`/events/${params.slug}`);
        return;
      }

      setEvent(data.event);
      setShirtImages(data.shirtImages || {}); // ✅ ADD

      const shirtsRes = await fetch(`/api/events/${data.event.id}/shirts`);
      const shirtsData = await shirtsRes.json();
      setShirts(shirtsData.shirts || []);
    } catch (error) {
      toast.error("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const handleShirtSelection = (items: ShirtItem[]) => {
    setSelectedShirts(items);
  };

  const calculateTotal = () => {
    return selectedShirts.reduce((sum, item) => {
      const price = item.standalonePrice ?? item.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const handleSubmitOrder = async () => {
    // Validation
    if (!fullName || !email || !phone) {
      toast.error("Vui lòng điền đầy đủ thông tin liên hệ");
      return;
    }

    if (selectedShirts.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email không hợp lệ");
      return;
    }

    // Validate phone
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Số điện thoại phải có 10 số và bắt đầu bằng 0");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/shirt-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          orderType: "STANDALONE",
          customerInfo: {
            fullName,
            email,
            phone,
            address,
          },
          items: selectedShirts.map((item) => ({
            shirtId: item.shirtId,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Đã tạo đơn hàng thành công!");
        setOrderCreated(true);
        setOrderResult(result);
      } else {
        toast.error(result.error || "Không thể tạo đơn hàng");
      }
    } catch (error) {
      toast.error("Đã có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const availableShirts = shirts.filter(
    (shirt) =>
      shirt.isAvailable !== false && shirt.soldQuantity < shirt.stockQuantity,
  );
  const minStandalonePrice = availableShirts.reduce<number | null>(
    (min, shirt) => {
      const price = shirt.standalonePrice ?? shirt.price;
      if (typeof price !== "number") return min;
      return min === null ? price : Math.min(min, price);
    },
    null,
  );
  const availableCategoryLabels = Array.from(
    new Set(availableShirts.map((shirt) => shirt.category)),
  )
    .map((category) => CATEGORY_LABELS[category] || category)
    .join(", ");
  const availableCategorySet = new Set(
    availableShirts.map((shirt) => shirt.category),
  );
  const previewCategories = Object.keys(shirtImages).filter(
    (category) =>
      availableCategorySet.has(category) && shirtImages[category]?.length > 0,
  );

  // Order success screen
  if (orderCreated && orderResult) {
    const requireOnlinePayment =
      orderResult.requireOnlinePayment ?? event.requireOnlinePayment;
    const bankInfo = orderResult.bankInfo || {
      bankName: event.bankName,
      accountNumber: event.bankAccount,
      accountHolder: event.bankHolder,
      bankCode: event.bankCode,
    };
    const normalizedBankCode = String(bankInfo.bankCode || "")
      .replace(/[\s_-]/g, "")
      .toUpperCase();
    const isVietinBank =
      normalizedBankCode === "VIETINBANK" ||
      normalizedBankCode === "ICB" ||
      normalizedBankCode === "CTG" ||
      normalizedBankCode === "970415";
    const transferContent =
      orderResult.order?.transferContent ||
      orderResult.transferContent ||
      (requireOnlinePayment
        ? isVietinBank
          ? `SEVQR AO${orderResult.order?.id || ""}`
          : `DHAO${orderResult.order?.id || ""}`
        : `AO ${phone.replace(/\D/g, "")} ${(
            orderResult.order?.id || ""
          ).slice(-6).toUpperCase()}`);
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Card className="border-2 border-green-500">
            <CardHeader className="bg-green-50">
              <div className="text-center">
                <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-2xl text-green-900">
                  Đơn hàng đã được tạo thành công!
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Order Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">
                  📦 Thông tin đơn hàng
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Mã đơn:</strong>{" "}
                    {orderResult.order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p>
                    <strong>Tổng tiền:</strong>{" "}
                    <span className="text-blue-600 font-bold text-lg">
                      {formatCurrency(orderResult.order.totalAmount)}
                    </span>
                  </p>
                </div>
              </div>

              {/* QR Payment */}
              {orderResult.qrPaymentUrl && (
                <div className="text-center">
                  <h3 className="font-bold text-lg mb-4">
                    {requireOnlinePayment
                      ? "💳 Quét mã QR để thanh toán tự động"
                      : "💳 Quét mã QR để chuyển khoản"}
                  </h3>
                  <Image
                    src={orderResult.qrPaymentUrl}
                    alt="QR Payment"
                    width={300}
                    height={300}
                    className="mx-auto border-2 border-gray-300 rounded-lg"
                  />

                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900">
                      ⚠️{" "}
                      <strong>
                        {requireOnlinePayment
                          ? "Nội dung chuyển khoản bắt buộc:"
                          : "Nội dung chuyển khoản đề nghị:"}
                      </strong>{" "}
                      <span className="font-mono font-bold">
                        {transferContent}
                      </span>
                    </p>
                    <p className="text-xs text-yellow-800 mt-2">
                      {requireOnlinePayment
                        ? "Vui lòng giữ nguyên nội dung này để hệ thống tự động xác nhận thanh toán."
                        : "Nội dung này giúp BTC đối chiếu đơn áo nhanh hơn khi xác nhận thủ công."}
                    </p>
                  </div>
                </div>
              )}

              {/* Bank Transfer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">
                  {requireOnlinePayment
                    ? "🏦 Hoặc nhập thông tin chuyển khoản thủ công:"
                    : "🏦 Thông tin chuyển khoản thủ công:"}
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Ngân hàng:</strong> {bankInfo.bankName}
                  </p>
                  <p>
                    <strong>Số TK:</strong> {bankInfo.accountNumber}
                  </p>
                  <p>
                    <strong>Chủ TK:</strong> {bankInfo.accountHolder}
                  </p>
                  <p>
                    <strong>Số tiền:</strong>{" "}
                    {formatCurrency(orderResult.order.totalAmount)}
                  </p>
                  <p>
                    <strong>Nội dung:</strong>{" "}
                    <span className="font-mono font-bold text-red-600">
                      {transferContent}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {requireOnlinePayment
                      ? "Không sửa nội dung CK nếu muốn hệ thống tự động gạch thanh toán."
                      : "Sau khi chuyển khoản, BTC sẽ kiểm tra giao dịch và xác nhận đơn hàng."}
                  </p>
                </div>
              </div>

              {/* Pickup Info */}
              {event.racePackLocation && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">📍 Thông tin nhận hàng:</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Địa điểm:</strong> {event.racePackLocation}
                    </p>
                    {event.racePackTime && (
                      <p>
                        <strong>Thời gian:</strong> {event.racePackTime}
                      </p>
                    )}
                    <p className="text-red-600 font-medium mt-2">
                      ⚠️ Mang theo CCCD và thông tin đơn hàng này
                    </p>
                  </div>
                </div>
              )}

              {/* Important Notes */}
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="font-bold text-red-900 mb-2">
                  📌 Lưu ý quan trọng:
                </h3>
                <ul className="text-sm text-red-800 space-y-1 list-disc pl-5">
                  <li>
                    {requireOnlinePayment
                      ? "Nếu chuyển đúng nội dung CK, hệ thống sẽ tự động xác nhận khi nhận được giao dịch"
                      : "Sau khi chuyển khoản, đơn hàng sẽ được BTC xác nhận thủ công trong vòng 24h"}
                  </li>
                  <li>Bạn sẽ nhận email xác nhận khi thanh toán được duyệt</li>
                  <li>Chỉ nhận hàng khi đã được xác nhận thanh toán</li>
                  <li>
                    Đây là áo mua riêng, KHÔNG bao gồm quyền tham gia thi đấu
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/events/${event.slug}`)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Về trang sự kiện
                </Button>
                <Button onClick={() => window.print()} className="flex-1">
                  🖨️ In thông tin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Order form screen
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${event.slug}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <div className="text-center">
            {event.logoUrl && (
              <Image
                src={event.logoUrl}
                alt={event.name}
                width={150}
                height={150}
                className="mx-auto mb-4"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900">
              Đặt mua áo kỷ niệm
            </h1>
            <p className="text-gray-600 mt-2">{event.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              📅 {formatDate(event.date)} | 📍 {event.location}
            </p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <ShoppingBag className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-purple-900 text-lg mb-2">
                🎽 Mua áo kỷ niệm riêng (Không kèm BIB)
              </h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>✓ Áo chất lượng cao, thiết kế độc quyền cho sự kiện</li>
                {minStandalonePrice !== null && (
                  <li>
                    ✓ Giá: Từ {formatCurrency(minStandalonePrice)}/áo (có thể
                    mua nhiều áo, nhiều size)
                  </li>
                )}
                {availableCategoryLabels && (
                  <li>✓ Loại áo đang bán: {availableCategoryLabels}</li>
                )}
                <li>
                  ⚠️ Đây là áo MUA RIÊNG, KHÔNG bao gồm quyền tham gia thi đấu
                </li>
                <li>
                  ⚠️ Muốn thi đấu, vui lòng đăng ký tại trang{" "}
                  <a
                    href={`/events/${event.slug}/register`}
                    className="text-red-600"
                  >
                    "Đăng ký tại đây"
                  </a>
                  {/* <Link href={`/events/${event.slug}/register`}>
                    <Button size="lg">
                      "Đăng ký tham gia"
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link> */}
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* ✅ ADD: Shirt Gallery Preview */}
        {previewCategories.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>👕 Xem trước mẫu áo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {previewCategories.map((category) => (
                  <ShirtImageCarousel
                    key={category}
                    images={shirtImages[category]}
                    category={category as "MALE" | "FEMALE" | "KID"}
                  />
                ))}
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 text-center">
                  💡 Vuốt hoặc click mũi tên để xem các góc chụp khác nhau
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Customer Info Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>👤 Thông tin người đặt hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Họ và tên "
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Số điện thoại "
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <Input
              label="Email "
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Địa chỉ (tùy chọn)"
              placeholder="123 Đường ABC, Quận XYZ"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="text-xs text-gray-500">* Thông tin bắt buộc</div>
          </CardContent>
        </Card>

        {/* Shirt Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>👕 Chọn áo và số lượng</CardTitle>
          </CardHeader>
          <CardContent>
            <ShirtSelectorWithQuantity
              eventId={event.id}
              orderType="STANDALONE"
              shirts={shirts}
              onSelectionChange={handleShirtSelection}
            />
          </CardContent>
        </Card>

        {/* Order Summary & Submit */}
        {selectedShirts.length > 0 && (
          <Card className="sticky bottom-4 border-2 border-blue-500 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600">Tổng thanh toán</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(calculateTotal())}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedShirts.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    )}{" "}
                    sản phẩm
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={handleSubmitOrder}
                  disabled={submitting || !fullName || !email || !phone}
                  className="px-8"
                  isLoading={submitting}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Đặt hàng ngay
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Bằng việc đặt hàng, bạn đồng ý với điều khoản và chính sách của
                chúng tôi
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
