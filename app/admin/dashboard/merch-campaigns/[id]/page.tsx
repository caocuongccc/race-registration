"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ImageUploader } from "@/components/ImageUploader";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
  Shirt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const adultSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const kidSizes = [
  "KID_1",
  "KID_2",
  "KID_3",
  "KID_4",
  "KID_5",
  "KID_6",
  "KID_7",
  "KID_8",
  "KID_9",
  "KID_10",
  "KID_11",
  "KID_12",
  "KID_13",
  "KID_15",
];
const catLabel: any = { MALE: "Nam", FEMALE: "Nữ", KID: "Trẻ em" };
const typeLabel: any = { SHORT_SLEEVE: "T-shirt", TANK_TOP: "Singlet" };
const emptyStyle = {
  id: "",
  name: "",
  category: "MALE",
  type: "SHORT_SLEEVE",
  price: "",
  previewImageUrl: "",
  cloudinaryPublicId: "",
  backImageUrl: "",
  backCloudinaryPublicId: "",
  isAvailable: true,
  variants: {} as Record<string, number>,
};

export default function MerchCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [tab, setTab] = useState<"config" | "shirts" | "orders">("config");
  const [saving, setSaving] = useState(false);
  const [style, setStyle] = useState<any>(emptyStyle);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [banks, setBanks] = useState<any[]>([]);

  const loadCampaign = () =>
    fetch(`/api/admin/merch-campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => setCampaign(d.campaign));
  const loadOrders = (targetPage = page) =>
    fetch(
      "/api/admin/merch-campaigns/" +
        id +
        "/orders?search=" +
        encodeURIComponent(search) +
        "&status=" +
        status +
        "&page=" +
        targetPage,
    )
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders || []);
        setStats(d.stats);
        setPage(d.pagination?.page || targetPage);
        setTotalPages(d.pagination?.totalPages || 1);
      });
  useEffect(() => {
    loadCampaign();
    fetch("/api/banks")
      .then((res) => res.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => setBanks([]));
  }, [id]);
  useEffect(() => {
    if (tab === "orders") loadOrders(1);
  }, [tab, status]);

  const selectBank = (code: string) => {
    const bank = banks.find((item) => item.code === code);
    setCampaign({ ...campaign, bankCode: code, bankName: bank?.name || code });
  };
  const saveCampaign = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/merch-campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaign),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Đã lưu chương trình");
      loadCampaign();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const updateSaleStatus = async (nextStatus: "OPEN" | "CLOSED") => {
    if (
      nextStatus === "CLOSED" &&
      !confirm("Dừng nhận đơn áo của chương trình này?")
    )
      return;
    const nextCampaign = {
      ...campaign,
      status: nextStatus,
      isPublished: nextStatus === "OPEN" ? true : campaign.isPublished,
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/merch-campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextCampaign),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        nextStatus === "OPEN" ? "Đã mở bán và nhận đơn" : "Đã dừng nhận đơn",
      );
      await loadCampaign();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const availableSizes = style.category === "KID" ? kidSizes : adultSizes;
  const saveStyle = async () => {
    const variants = availableSizes
      .filter(
        (size) =>
          style.variants[size] !== undefined && style.variants[size] !== "",
      )
      .map((size) => ({ size, stockQuantity: Number(style.variants[size]) }));
    if (!variants.length)
      return toast.error("Nhập tồn kho cho ít nhất một size");
    try {
      const url = style.id
        ? `/api/admin/merch-campaigns/${id}/styles/${style.id}`
        : `/api/admin/merch-campaigns/${id}/styles`;
      const res = await fetch(url, {
        method: style.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...style,
          price: Number(style.price),
          variants,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(style.id ? "Đã cập nhật mẫu áo" : "Đã thêm mẫu áo");
      setStyle(emptyStyle);
      loadCampaign();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const editStyle = (item: any) =>
    setStyle({
      ...item,
      price: String(item.price),
      variants: Object.fromEntries(
        item.variants.map((v: any) => [v.size, v.stockQuantity]),
      ),
    });
  const archiveStyle = async (styleId: string) => {
    if (!confirm("Ngừng hiển thị mẫu áo này?")) return;
    const res = await fetch(
      `/api/admin/merch-campaigns/${id}/styles/${styleId}`,
      { method: "DELETE" },
    );
    const data = await res.json();
    if (res.ok) {
      toast.success("Đã ngừng bán mẫu áo");
      loadCampaign();
    } else toast.error(data.error);
  };
  const confirmPayment = async (orderId: string) => {
    if (!confirm("Xác nhận đã nhận đủ tiền cho đơn này?")) return;
    const res = await fetch(
      `/api/admin/merch-campaigns/${id}/orders/${orderId}/confirm-payment`,
      { method: "POST" },
    );
    const data = await res.json();
    if (res.ok) {
      toast.success("Đã xác nhận thanh toán");
      loadOrders();
      loadCampaign();
    } else toast.error(data.error);
  };
  const updateOrder = async (orderId: string, body: any) => {
    const res = await fetch(
      `/api/admin/merch-campaigns/${id}/orders/${orderId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    if (res.ok) {
      toast.success("Đã cập nhật đơn hàng");
      loadOrders();
      loadCampaign();
    } else toast.error(data.error);
  };
  const cancelOrder = (orderId: string) => {
    if (confirm("Hủy đơn chờ và trả lại số lượng áo đã giữ?"))
      updateOrder(orderId, { action: "cancel" });
  };
  const exportExcel = () => {
    window.location.href = "/api/admin/merch-campaigns/" + id + "/export";
  };
  const deleteCampaign = async () => {
    if (!confirm("Xóa chương trình nháp này? Thao tác không thể hoàn tác."))
      return;
    const res = await fetch("/api/admin/merch-campaigns/" + id, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success("Đã xóa chương trình");
    router.push("/admin/dashboard/merch-campaigns");
  };

  if (!campaign)
    return (
      <div className="grid h-96 place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard/merch-campaigns">
            <Button variant="outline" aria-label="Quay lại">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${campaign.status === "OPEN" ? "bg-green-100 text-green-700" : campaign.status === "CLOSED" ? "bg-gray-200 text-gray-700" : "bg-amber-100 text-amber-700"}`}
              >
                {campaign.status === "OPEN"
                  ? "Đang mở bán"
                  : campaign.status === "CLOSED"
                    ? "Đã đóng"
                    : "Bản nháp"}
              </span>
            </div>
            <p className="text-sm text-gray-500">/merch/{campaign.slug}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === "OPEN" ? (
            <Button
              variant="outline"
              isLoading={saving}
              onClick={() => updateSaleStatus("CLOSED")}
            >
              <Pause className="mr-2 h-4 w-4" />
              Dừng nhận đơn
            </Button>
          ) : (
            <Button isLoading={saving} onClick={() => updateSaleStatus("OPEN")}>
              <Play className="mr-2 h-4 w-4" />
              Mở bán ngay
            </Button>
          )}
          <Link href={`/merch/${campaign.slug}`} target="_blank">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Xem trang bán
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex gap-2 border-b">
        {[
          ["config", "Cấu hình"],
          ["shirts", "Mẫu áo & tồn kho"],
          ["orders", "Đơn hàng & thống kê"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "config" && (
        <section className="border bg-white p-5 rounded-lg">
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Tên chương trình"
                value={campaign.name}
                onChange={(e) =>
                  setCampaign({ ...campaign, name: e.target.value })
                }
              />
              <Input
                label="Slug"
                value={campaign.slug}
                onChange={(e) =>
                  setCampaign({ ...campaign, slug: e.target.value })
                }
              />
              <Input
                label="Năm"
                type="number"
                value={campaign.year}
                onChange={(e) =>
                  setCampaign({ ...campaign, year: Number(e.target.value) })
                }
              />
              <Select
                label="Trạng thái"
                value={campaign.status}
                onChange={(e) =>
                  setCampaign({ ...campaign, status: e.target.value })
                }
              >
                <option value="DRAFT">Nháp</option>
                <option value="OPEN">Mở bán</option>
                <option value="CLOSED">Đóng</option>
              </Select>
              <Input
                label="Bắt đầu bán"
                type="datetime-local"
                value={campaign.saleStartAt?.slice?.(0, 16) || ""}
                onChange={(e) =>
                  setCampaign({ ...campaign, saleStartAt: e.target.value })
                }
              />
              <Input
                label="Kết thúc bán"
                type="datetime-local"
                value={campaign.saleEndAt?.slice?.(0, 16) || ""}
                onChange={(e) =>
                  setCampaign({ ...campaign, saleEndAt: e.target.value })
                }
              />
              <Input
                label="Email liên hệ"
                value={campaign.contactEmail || ""}
                onChange={(e) =>
                  setCampaign({ ...campaign, contactEmail: e.target.value })
                }
              />
              <Input
                label="Số điện thoại liên hệ"
                value={campaign.contactPhone || ""}
                onChange={(e) =>
                  setCampaign({ ...campaign, contactPhone: e.target.value })
                }
              />
              <Select
                label="Ngân hàng"
                value={campaign.bankCode || ""}
                onChange={(e) => selectBank(e.target.value)}
              >
                <option value="">-- Chọn ngân hàng --</option>
                {banks.map((bank) => (
                  <option key={bank.code + "-" + bank.bin} value={bank.code}>
                    {bank.shortName || bank.name} - {bank.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Mã ngân hàng"
                readOnly
                value={campaign.bankCode || ""}
              />
              <Input
                label="Số tài khoản"
                value={campaign.bankAccount || ""}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    bankAccount: e.target.value.replace(/\s/g, ""),
                  })
                }
              />
              <Input
                label="Chủ tài khoản"
                value={campaign.bankHolder || ""}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    bankHolder: e.target.value.toUpperCase(),
                  })
                }
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={campaign.isPublished}
                  onChange={(e) =>
                    setCampaign({ ...campaign, isPublished: e.target.checked })
                  }
                />
                Công khai đường dẫn bán áo
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={campaign.requireOnlinePayment}
                  onChange={(e) =>
                    setCampaign({
                      ...campaign,
                      requireOnlinePayment: e.target.checked,
                    })
                  }
                />
                {campaign.requireOnlinePayment
                  ? "Online: SePay tự động xác nhận"
                  : "Offline: admin xác nhận thủ công"}
              </label>
              <label className="md:col-span-2 text-sm font-medium">
                Mô tả
                <textarea
                  className="mt-1 min-h-32 w-full border p-3 rounded-lg"
                  value={campaign.description || ""}
                  onChange={(e) =>
                    setCampaign({ ...campaign, description: e.target.value })
                  }
                />
              </label>
              <label className="md:col-span-2 text-sm font-medium">
                {"Th\u00f4ng tin d\u00e0nh cho ng\u01b0\u1eddi mua"}
                <textarea
                  className="mt-1 min-h-24 w-full border p-3 rounded-lg"
                  placeholder={"V\u00ed d\u1ee5: Ti\u1ec1n b\u00e1n \u00e1o sau khi tr\u1eeb chi ph\u00ed s\u1ea3n xu\u1ea5t..."}
                  value={campaign.buyerNote || ""}
                  onChange={(e) =>
                    setCampaign({ ...campaign, buyerNote: e.target.value })
                  }
                />
              </label>
            </div>
            <ImageUploader
              folder={`merch-campaigns/${campaign.slug}`}
              label="Ảnh bìa chương trình"
              currentImage={campaign.heroImageUrl}
              onUploadComplete={(url, publicId) =>
                setCampaign({
                  ...campaign,
                  heroImageUrl: url,
                  cloudinaryPublicId: publicId,
                })
              }
              onRemove={() =>
                setCampaign({
                  ...campaign,
                  heroImageUrl: "",
                  cloudinaryPublicId: "",
                })
              }
            />
            <ImageUploader
              folder={`merch-campaigns/${campaign.slug}/size-guide`}
              label={"B\u1ea3ng h\u01b0\u1edbng d\u1eabn ch\u1ecdn size"}
              currentImage={campaign.sizeGuideImageUrl}
              onUploadComplete={(url, publicId) =>
                setCampaign({
                  ...campaign,
                  sizeGuideImageUrl: url,
                  sizeGuideCloudinaryPublicId: publicId,
                })
              }
              onRemove={() =>
                setCampaign({
                  ...campaign,
                  sizeGuideImageUrl: "",
                  sizeGuideCloudinaryPublicId: "",
                })
              }
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button isLoading={saving} onClick={saveCampaign}>
              <Save className="mr-2 h-4 w-4" />
              Lưu cấu hình
            </Button>
            <Button variant="outline" onClick={deleteCampaign}>
              <Trash2 className="mr-2 h-4 w-4 text-red-600" />
              Xóa chương trình
            </Button>
          </div>
        </section>
      )}

      {tab === "shirts" && (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="border bg-white p-5 rounded-lg">
            <h2 className="font-bold">
              {style.id ? "Sửa mẫu áo" : "Thêm mẫu áo"}
            </h2>
            <div className="mt-4 space-y-4">
              <Input
                label="Tên mẫu"
                value={style.name}
                onChange={(e) => setStyle({ ...style, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Loại áo"
                  value={style.category}
                  onChange={(e) =>
                    setStyle({
                      ...style,
                      category: e.target.value,
                      variants: {},
                    })
                  }
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="KID">Trẻ em</option>
                </Select>
                <Select
                  label="Kiểu áo"
                  value={style.type}
                  onChange={(e) => setStyle({ ...style, type: e.target.value })}
                >
                  <option value="SHORT_SLEEVE">T-shirt</option>
                  <option value="TANK_TOP">Singlet</option>
                </Select>
              </div>
              <Input
                label="Giá bán"
                type="number"
                value={style.price}
                onChange={(e) => setStyle({ ...style, price: e.target.value })}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <ImageUploader
                  folder={`merch-campaigns/${campaign.slug}/shirts/front`}
                  label="Ảnh mặt trước"
                  currentImage={style.previewImageUrl}
                  aspectRatio="aspect-square"
                  onUploadComplete={(url, publicId) =>
                    setStyle({
                      ...style,
                      previewImageUrl: url,
                      cloudinaryPublicId: publicId,
                    })
                  }
                  onRemove={() =>
                    setStyle({
                      ...style,
                      previewImageUrl: "",
                      cloudinaryPublicId: "",
                    })
                  }
                />
                <ImageUploader
                  folder={`merch-campaigns/${campaign.slug}/shirts/back`}
                  label="Ảnh mặt sau"
                  currentImage={style.backImageUrl}
                  aspectRatio="aspect-square"
                  onUploadComplete={(url, publicId) =>
                    setStyle({
                      ...style,
                      backImageUrl: url,
                      backCloudinaryPublicId: publicId,
                    })
                  }
                  onRemove={() =>
                    setStyle({
                      ...style,
                      backImageUrl: "",
                      backCloudinaryPublicId: "",
                    })
                  }
                />
              </div>
              <div>
                <p className="text-sm font-medium">Tồn kho theo size</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {availableSizes.map((size) => (
                    <label key={size} className="text-xs">
                      {size.replace("KID_", "Size ")}
                      <input
                        type="number"
                        min="0"
                        className="mt-1 h-9 w-full border px-2 rounded-lg"
                        placeholder="-"
                        value={style.variants[size] ?? ""}
                        onChange={(e) =>
                          setStyle({
                            ...style,
                            variants: {
                              ...style.variants,
                              [size]: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveStyle}>
                  <Plus className="mr-2 h-4 w-4" />
                  {style.id ? "Cập nhật" : "Thêm mẫu"}
                </Button>
                {style.id && (
                  <Button
                    variant="outline"
                    onClick={() => setStyle(emptyStyle)}
                  >
                    Hủy
                  </Button>
                )}
              </div>
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-lg font-bold">Các mẫu đang có</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {campaign.styles.map((item: any) => (
                <article
                  key={item.id}
                  className={`border bg-white p-4 rounded-lg ${!item.isAvailable ? "opacity-50" : ""}`}
                >
                  <div className="flex gap-4">
                    {item.previewImageUrl || item.backImageUrl ? (
                      <div className="flex shrink-0 gap-2">
                        {item.previewImageUrl && (
                          <img
                            src={item.previewImageUrl}
                            className="h-24 w-20 bg-gray-100 object-contain rounded-lg"
                            alt={`${item.name} - Mặt trước`}
                            title="Mặt trước"
                          />
                        )}
                        {item.backImageUrl && (
                          <img
                            src={item.backImageUrl}
                            className="h-24 w-20 bg-gray-100 object-contain rounded-lg"
                            alt={`${item.name} - Mặt sau`}
                            title="Mặt sau"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="grid h-24 w-24 place-items-center bg-gray-100 rounded-lg">
                        <Shirt />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        {catLabel[item.category]} · {typeLabel[item.type]}
                      </p>
                      <p className="mt-1 font-semibold text-blue-700">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <button onClick={() => editStyle(item)} title="Sửa">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => archiveStyle(item.id)}
                      title="Ngừng bán"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.variants.map((v: any) => (
                      <span
                        key={v.id}
                        className="bg-gray-100 px-2 py-1 text-xs rounded"
                      >
                        {v.size.replace("KID_", "")}: {v.soldQuantity} bán /{" "}
                        {v.reservedQuantity} giữ / {v.stockQuantity} kho
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-5">
          {stats && (
            <div className="grid gap-4 md:grid-cols-5">
              {[
                ["Tổng đơn", stats.totalOrders],
                ["Đã thanh toán", stats.paidOrders],
                ["Chờ thanh toán", stats.pendingOrders],
                ["Áo đã bán", stats.totalShirts],
                ["Doanh thu", formatCurrency(stats.revenue)],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="border bg-white p-4 rounded-lg"
                >
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          )}
          <section className="border bg-white p-5 rounded-lg">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex flex-1 gap-2">
                <Input
                  placeholder="Tên, email, SĐT hoặc mã đơn"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="PENDING">Chờ thanh toán</option>
                </Select>
                <Button variant="outline" onClick={() => loadOrders(1)}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={exportExcel}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </div>
          </section>
          {stats?.shirtSummary?.length > 0 && (
            <section className="border bg-white p-5 rounded-lg">
              <h2 className="font-bold">Tổng hợp áo đã thanh toán</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.shirtSummary.map((row: any) => (
                  <span
                    key={`${row.category}-${row.type}-${row.size}`}
                    className="border px-3 py-2 text-sm rounded-lg"
                  >
                    {catLabel[row.category]} · {typeLabel[row.type]} ·{" "}
                    {row.size.replace("KID_", "")}{" "}
                    <strong className="ml-2">{row.quantity}</strong>
                  </span>
                ))}
              </div>
            </section>
          )}
          <section className="overflow-x-auto border bg-white rounded-lg">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Mã đơn",
                    "Người mua",
                    "Liên hệ",
                    "Địa chỉ",
                    "Áo",
                    "Số tiền",
                    "Thanh toán",
                    "Ngày đặt",
                    "Thao tác",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="px-4 py-3 font-semibold">
                      {order.publicCode}
                    </td>
                    <td className="px-4 py-3">{order.fullName}</td>
                    <td className="px-4 py-3">
                      {order.phone}
                      <br />
                      <span className="text-gray-500">{order.email}</span>
                    </td>
                    <td className="max-w-52 px-4 py-3">
                      {order.shippingAddress}
                    </td>
                    <td className="px-4 py-3">
                      {order.items.map((i: any) => (
                        <div key={i.id}>
                          {i.styleName} · {catLabel[i.category]} ·{" "}
                          {i.size.replace("KID_", "")} × {i.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          order.paymentStatus === "PAID"
                            ? "text-green-700"
                            : "text-amber-700"
                        }
                      >
                        {order.paymentStatus === "PAID"
                          ? "Đã thanh toán"
                          : order.paymentStatus === "FAILED"
                            ? "Đã hủy"
                            : "Chờ thanh toán"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      {order.paymentStatus === "PENDING" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => confirmPayment(order.id)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Xác nhận
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelOrder(order.id)}
                          >
                            Hủy
                          </Button>
                        </div>
                      ) : order.paymentStatus === "PAID" ? (
                        <Select
                          value={order.fulfillmentStatus}
                          onChange={(e) =>
                            updateOrder(order.id, {
                              fulfillmentStatus: e.target.value,
                            })
                          }
                        >
                          <option value="PENDING">Chờ xử lý</option>
                          <option value="PROCESSING">Đang chuẩn bị</option>
                          <option value="SHIPPED">Đã gửi hàng</option>
                          <option value="COMPLETED">Hoàn tất</option>
                        </Select>
                      ) : (
                        <span className="text-gray-500">Đã hủy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-gray-500">
                Trang {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => loadOrders(page - 1)}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => loadOrders(page + 1)}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
