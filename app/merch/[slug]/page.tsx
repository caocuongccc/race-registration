"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  HeartHandshake,
  LockKeyhole,
  Maximize2,
  Minus,
  PackageSearch,
  Plus,
  Ruler,
  Search,
  Shirt,
  ShoppingBag,
  X,
} from "lucide-react";
import { toast } from "sonner";

const categoryNames: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  KID: "Trẻ em",
};
const typeNames: Record<string, string> = {
  SHORT_SLEEVE: "T-shirt",
  TANK_TOP: "Singlet",
};
const sizeName = (size: string) =>
  size.startsWith("KID_") ? size.replace("KID_", "") : size;
const fulfillmentNames: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang chuẩn bị",
  SHIPPED: "Đã gửi hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

export default function MerchCampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("MALE");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    shippingAddress: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [lookupOrders, setLookupOrders] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupCodeRequested, setLookupCodeRequested] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/merch-campaigns/${slug}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCampaign(data.campaign);
        const first = data.campaign.styles[0]?.category;
        if (first) setCategory(first);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const variants = useMemo(() => {
    const map = new Map<string, any>();
    campaign?.styles?.forEach((style: any) =>
      style.variants.forEach((variant: any) =>
        map.set(variant.id, { ...variant, style }),
      ),
    );
    return map;
  }, [campaign]);
  const totalQuantity = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const totalAmount = Object.entries(cart).reduce(
    (sum, [id, quantity]) =>
      sum + (variants.get(id)?.style.price || 0) * quantity,
    0,
  );
  const categories = [
    ...new Set((campaign?.styles || []).map((s: any) => s.category)),
  ] as string[];

  const changeQuantity = (variant: any, delta: number) => {
    setCart((current) => {
      const next = Math.max(
        0,
        Math.min((current[variant.id] || 0) + delta, variant.remaining),
      );
      const copy = { ...current };
      if (next) copy[variant.id] = next;
      else delete copy[variant.id];
      return copy;
    });
  };

  const submit = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.shippingAddress)
      return toast.error("Vui lòng nhập đầy đủ thông tin nhận hàng");
    if (!totalQuantity)
      return toast.error("Vui lòng chọn loại áo, kiểu áo và size");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/merch-campaigns/${slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: Object.entries(cart).map(([variantId, quantity]) => ({
            variantId,
            quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestLookupCode = async () => {
    if (!identifier) return toast.error("Nhập email hoặc số điện thoại");
    setLookupLoading(true);
    try {
      const res = await fetch("/api/merch-orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.requiresCode) setLookupCodeRequested(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const lookup = async () => {
    if (!identifier) return toast.error("Nhập email hoặc số điện thoại");
    if (!secretCode) return toast.error("Nhập mã bí mật trong email");
    setLookupLoading(true);
    try {
      const res = await fetch("/api/merch-orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, secretCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLookupOrders(data.orders || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  if (!campaign)
    return (
      <div className="min-h-screen grid place-items-center text-gray-600">
        Không tìm thấy chương trình.
      </div>
    );

  if (result)
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl border bg-white p-6 shadow-sm rounded-lg">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold">Đặt áo thành công</h1>
          <p className="mt-2 text-gray-600">
            Mã đơn <strong>{result.order.publicCode}</strong>. Thông tin và mã
            bí mật đã được gửi tới email của bạn.
          </p>
          <div className="mt-5 border border-orange-200 bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-800">Mã bí mật tra cứu</p>
            <p className="mt-1 text-3xl font-bold tracking-widest text-orange-900">
              {result.order.secretCode}
            </p>
          </div>
          <div className="mt-6 border-t pt-6">
            <p className="font-semibold">
              Thanh toán {formatCurrency(result.order.totalAmount)}
            </p>
            {result.qrPaymentUrl && (
              <img
                src={result.qrPaymentUrl}
                alt="QR thanh toán"
                className="mx-auto my-4 w-72 border"
              />
            )}
            <dl className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <dt>Ngân hàng</dt>
              <dd className="font-medium">{result.bankInfo?.bankName}</dd>
              <dt>Số tài khoản</dt>
              <dd className="font-medium">{result.bankInfo?.accountNumber}</dd>
              <dt>Chủ tài khoản</dt>
              <dd className="font-medium">{result.bankInfo?.accountName}</dd>
              <dt>Nội dung</dt>
              <dd className="font-bold text-red-600">
                {result.order.transferContent}
              </dd>
            </dl>
            <p className="mt-4 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              {campaign.requireOnlinePayment
                ? "Không thay đổi nội dung chuyển khoản để hệ thống tự động nhận diện."
                : "Ghi đúng nội dung chuyển khoản để ban tổ chức đối soát nhanh."}
            </p>
          </div>
          <Button
            className="mt-6 w-full"
            onClick={() => {
              setLookupOpen(true);
              setIdentifier(form.email);
              setSecretCode(result.order.secretCode);
              setLookupCodeRequested(true);
            }}
          >
            Tra cứu đơn hàng
          </Button>
        </div>
        {lookupOpen && (
          <LookupModal
            {...{
              identifier,
              setIdentifier,
              secretCode,
              setSecretCode,
              lookup,
              requestLookupCode,
              lookupCodeRequested,
              setLookupCodeRequested,
              lookupLoading,
              lookupOrders,
              setLookupOpen,
            }}
          />
        )}
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f7faf8] pb-16">
      <section className="relative h-[380px] overflow-hidden bg-emerald-950 text-white md:h-[440px]">
        {campaign.heroImageUrl && (
          <img
            src={campaign.heroImageUrl}
            alt={campaign.name}
            className="absolute inset-0 h-full w-full object-contain object-center opacity-90"
          />
        )}
        {/* <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-9">
          <p className="text-sm font-semibold uppercase">
            Chương trình áo thiện nguyện {campaign.year}
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold md:text-5xl">
            {campaign.name}
          </h1>
        </div> */}
      </section>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 flex justify-end">
          <Button variant="outline" onClick={() => setLookupOpen(true)}>
            <PackageSearch className="mr-2 h-4 w-4" />
            Tra cứu đơn
          </Button>
        </div>
        {!campaign.isOpen && (
          <div className="mb-8 border border-amber-300 bg-amber-50 p-4 text-amber-900 rounded-lg">
            {campaign.closedReason || "Chương trình hiện chưa nhận đơn."}
          </div>
        )}
        {campaign.buyerNote && (
          <div className="mb-8 flex gap-4 border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-sm rounded-lg sm:p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center bg-emerald-700 text-white rounded-lg">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">
                {"Th\u00f4ng tin t\u1eeb Ban t\u1ed5 ch\u1ee9c"}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-900">
                {campaign.buyerNote}
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="flex min-w-0 flex-col">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-950 sm:text-2xl">
                <Shirt className="h-6 w-6" />
                {"Ch\u1ecdn \u00e1o"}
              </h2>
              {campaign.sizeGuideImageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewImage({
                      url: campaign.sizeGuideImageUrl,
                      name: "B\u1ea3ng h\u01b0\u1edbng d\u1eabn ch\u1ecdn size",
                    })
                  }
                  className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <Ruler className="h-4 w-4" />
                  {"Xem b\u1ea3ng size \u00e1o"}
                </button>
              )}
            </div>
            <div className="mt-4 inline-flex max-w-full flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`border border-transparent px-5 py-2 text-sm font-semibold transition-colors rounded-md ${category === item ? "bg-emerald-700 text-white shadow-sm" : "text-gray-600 hover:bg-white hover:text-gray-950"}`}
                >
                  {categoryNames[item]}
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-1 flex-col gap-6">
              {campaign.styles
                .filter((s: any) => s.category === category)
                .map((style: any) => (
                  <article
                    key={style.id}
                    className="grid flex-1 overflow-hidden border border-gray-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.07)] rounded-lg md:grid-cols-[minmax(340px,44%)_minmax(0,1fr)]"
                  >
                    <MerchStyleImage
                      style={style}
                      onPreview={(url, name) => setPreviewImage({ url, name })}
                    />
                    <div className="min-w-0 p-5 sm:p-6 lg:p-7">
                      <div className="flex justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-950">
                            {style.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {categoryNames[style.category]} ·{" "}
                            {typeNames[style.type]}
                          </p>
                        </div>
                        <strong className="shrink-0 text-lg text-emerald-700">
                          {formatCurrency(style.price)}
                        </strong>
                      </div>
                      <p className="mt-6 text-sm font-semibold text-gray-800">
                        {"Ch\u1ecdn size v\u00e0 s\u1ed1 l\u01b0\u1ee3ng"}
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {style.variants.map((variant: any) => (
                          <div
                            key={variant.id}
                            className="flex min-h-14 items-center justify-between gap-3 border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 transition-colors rounded-lg hover:border-emerald-300 hover:bg-emerald-50/30"
                          >
                            <div className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-900">
                                Size {sizeName(variant.size)}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-gray-500">
                                còn {variant.remaining}
                              </span>
                            </div>
                            <div className="flex h-9 shrink-0 items-center border border-gray-300 bg-white shadow-sm rounded-md">
                              <button
                                aria-label={`Giảm size ${sizeName(variant.size)}`}
                                disabled={!cart[variant.id]}
                                className="grid h-full w-8 place-items-center text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
                                onClick={() => changeQuantity(variant, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-7 text-center text-sm font-semibold">
                                {cart[variant.id] || 0}
                              </span>
                              <button
                                aria-label={`Tăng size ${sizeName(variant.size)}`}
                                disabled={
                                  !variant.remaining ||
                                  (cart[variant.id] || 0) >= variant.remaining
                                }
                                className="grid h-full w-8 place-items-center text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
                                onClick={() => changeQuantity(variant, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <aside className="border border-gray-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.07)] rounded-lg sm:p-6 xl:sticky xl:top-6 xl:self-start">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950">
              <ShoppingBag className="h-5 w-5" />
              Thông tin nhận hàng
            </h2>
            <div className="mt-5 space-y-4">
              <Input
                required
                label="Tên người mua"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              <Input
                required
                type="email"
                label="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                required
                label="Số điện thoại"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <label className="block text-sm font-medium text-gray-700">
                Địa chỉ nhận hàng <span className="text-red-500">*</span>
                <textarea
                  value={form.shippingAddress}
                  onChange={(e) =>
                    setForm({ ...form, shippingAddress: e.target.value })
                  }
                  className="mt-1 min-h-24 w-full border bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-600 rounded-lg"
                />
              </label>
              <Input
                label="Ghi chú"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <p className="text-sm font-semibold text-gray-700">Áo đã chọn</p>
              {totalQuantity ? (
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {Object.entries(cart).map(([id, quantity]) => {
                    const item = variants.get(id);
                    return (
                      <div
                        key={id}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span>
                          {item.style.name} ·{" "}
                          {categoryNames[item.style.category]} ·{" "}
                          {typeNames[item.style.type]} · Size{" "}
                          {sizeName(item.size)} × {quantity}
                        </span>
                        <span className="shrink-0 font-medium">
                          {formatCurrency(item.style.price * quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Chưa chọn áo.</p>
              )}
              <div className="mt-4 flex items-end justify-between border-t pt-4">
                <div>
                  <p className="text-sm text-gray-500">{totalQuantity} áo</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
              <Button
                className="mt-5 h-11 w-full"
                disabled={!campaign.isOpen || !totalQuantity}
                isLoading={submitting}
                onClick={submit}
              >
                Đặt áo và thanh toán
              </Button>
            </div>
          </aside>
        </div>
      </div>
      {lookupOpen && (
        <LookupModal
          {...{
            identifier,
            setIdentifier,
            secretCode,
            setSecretCode,
            lookup,
            requestLookupCode,
            lookupCodeRequested,
            setLookupCodeRequested,
            lookupLoading,
            lookupOrders,
            setLookupOpen,
          }}
        />
      )}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-5xl items-center justify-center bg-white p-3 shadow-2xl rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[calc(92vh-24px)] max-w-full object-contain"
            />
            <button
              type="button"
              title="Đóng"
              aria-label="Đóng ảnh xem trước"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center border bg-white/95 text-gray-800 shadow-sm rounded-lg hover:bg-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function MerchStyleImage({
  style,
  onPreview,
}: {
  style: {
    name: string;
    previewImageUrl?: string | null;
    backImageUrl?: string | null;
  };
  onPreview: (url: string, name: string) => void;
}) {
  const [selectedSide, setSelectedSide] = useState<"front" | "back">("front");
  const images: Array<{
    side: "front" | "back";
    label: string;
    url: string;
  }> = [];

  if (style.previewImageUrl) {
    images.push({
      side: "front",
      label: "Mặt trước",
      url: style.previewImageUrl,
    });
  }
  if (style.backImageUrl) {
    images.push({
      side: "back",
      label: "Mặt sau",
      url: style.backImageUrl,
    });
  }

  const selectedImage =
    images.find((image) => image.side === selectedSide) || images[0];

  return (
    <div className="relative aspect-square bg-[#eef2f0] p-5 md:aspect-auto md:min-h-[460px]">
      {selectedImage ? (
        <>
          <img
            src={selectedImage.url}
            alt={`${style.name} - ${selectedImage.label}`}
            className="h-full w-full object-contain"
          />
          <button
            type="button"
            title="Xem ảnh lớn"
            aria-label={`Xem ảnh lớn ${style.name} ${selectedImage.label}`}
            onClick={() =>
              onPreview(
                selectedImage.url,
                `${style.name} - ${selectedImage.label}`,
              )
            }
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center border border-gray-200 bg-white/95 text-gray-700 shadow-sm transition-colors rounded-lg hover:bg-white hover:text-emerald-700"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 border border-gray-200 bg-white/95 p-1 shadow-sm backdrop-blur rounded-lg">
              {images.map((image) => (
                <button
                  key={image.side}
                  type="button"
                  onClick={() => setSelectedSide(image.side)}
                  className={`min-w-20 px-3 py-2 text-xs font-semibold transition-colors rounded-md ${selectedImage.side === image.side ? "bg-emerald-700 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"}`}
                >
                  {image.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid h-full place-items-center text-gray-400">
          <Shirt className="h-16 w-16" />
        </div>
      )}
    </div>
  );
}

function LookupModal(props: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl rounded-lg">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950">
            <LockKeyhole className="h-5 w-5" />
            Tra cứu đơn áo
          </h2>
          <button onClick={() => props.setLookupOpen(false)} aria-label="Đóng">
            <X />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Nhập email hoặc số điện thoại đã đặt, sau đó dùng mã bí mật 6 số trong
          email.
        </p>
        <div className="mt-5 space-y-3">
          <Input
            disabled={props.lookupCodeRequested}
            placeholder="Email hoặc số điện thoại"
            value={props.identifier}
            onChange={(e) => props.setIdentifier(e.target.value)}
          />
          {!props.lookupCodeRequested ? (
            <Button
              className="w-full"
              isLoading={props.lookupLoading}
              onClick={props.requestLookupCode}
            >
              <Search className="mr-2 h-4 w-4" />
              Tiếp tục
            </Button>
          ) : (
            <>
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="Mã bí mật 6 số trong email"
                value={props.secretCode}
                onChange={(e) =>
                  props.setSecretCode(e.target.value.replace(/\D/g, ""))
                }
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    props.setLookupCodeRequested(false);
                    props.setSecretCode("");
                    props.setLookupOrders([]);
                  }}
                >
                  Đổi thông tin
                </Button>
                <Button
                  className="flex-1"
                  isLoading={props.lookupLoading}
                  onClick={props.lookup}
                >
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  Xác nhận mã
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="mt-5 space-y-3">
          {props.lookupOrders.map((order: any) => (
            <div key={order.id} className="border p-4 rounded-lg">
              <div className="flex justify-between gap-3">
                <strong>{order.publicCode}</strong>
                <span
                  className={`text-sm font-semibold ${order.paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"}`}
                >
                  {order.paymentStatus === "PAID"
                    ? "Đã thanh toán"
                    : order.paymentStatus === "FAILED"
                      ? "Đã hủy"
                      : "Chờ thanh toán"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {order.items
                  .map(
                    (i: any) =>
                      `${i.styleName} - ${categoryNames[i.category]} - ${typeNames[i.type]} - ${sizeName(i.size)} × ${i.quantity}`,
                  )
                  .join("; ")}
              </p>
              <p className="mt-2 font-semibold">
                {formatCurrency(order.totalAmount)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Giao hàng:{" "}
                {fulfillmentNames[order.fulfillmentStatus] ||
                  order.fulfillmentStatus}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
