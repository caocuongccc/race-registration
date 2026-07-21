"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarPlus, ExternalLink, Package, Plus } from "lucide-react";
import { toast } from "sonner";

export default function MerchCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "Trung thu cho em 2026",
    slug: "trung-thu-cho-em-2026",
    year: "2026",
    description: "",
    contactEmail: "",
    contactPhone: "",
  });

  const load = () =>
    fetch("/api/admin/merch-campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);
  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/merch-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Đã tạo chương trình bán áo");
      router.push("/admin/dashboard/merch-campaigns/" + data.campaign.id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Cổng bán áo</h1>
          <p className="mt-1 text-gray-600">
            Quản lý các chương trình bán áo độc lập theo năm
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo chương trình
        </Button>
      </div>
      {showForm && (
        <section className="border bg-white p-5 shadow-sm rounded-lg">
          <h2 className="text-lg font-bold">Chương trình mới</h2>
          <p className="mt-1 text-sm text-gray-600">
            Chương trình được tạo ở trạng thái nháp. Sau đó khai báo tài khoản,
            mẫu áo và tồn kho trước khi mở bán.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Tên chương trình"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Slug đường dẫn"
              required
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-"),
                })
              }
            />
            <Input
              label="Năm"
              type="number"
              required
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
            <Input
              label="Email liên hệ"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
            />
            <Input
              label="Số điện thoại liên hệ"
              value={form.contactPhone}
              onChange={(e) =>
                setForm({ ...form, contactPhone: e.target.value })
              }
            />
          </div>
          <label className="mt-4 block text-sm font-medium">
            Mô tả
            <textarea
              className="mt-1 min-h-24 w-full border p-3 rounded-lg"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <Button className="mt-4" isLoading={creating} onClick={create}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Tạo chương trình
          </Button>
        </section>
      )}
      {loading ? (
        <div className="grid h-64 place-items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((item) => (
            <article
              key={item.id}
              className="border bg-white p-5 shadow-sm rounded-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500">
                    {item.year}
                  </p>
                  <h2 className="mt-1 text-lg font-bold">{item.name}</h2>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === "OPEN" ? "bg-green-100 text-green-700" : item.status === "CLOSED" ? "bg-gray-200 text-gray-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {item.status === "OPEN"
                    ? "Đang mở"
                    : item.status === "CLOSED"
                      ? "Đã đóng"
                      : "Nháp"}
                </span>
              </div>
              <div className="mt-5 flex gap-5 text-sm text-gray-600">
                <span>
                  <Package className="mr-1 inline h-4 w-4" />
                  {item._count.styles} mẫu
                </span>
                <span>{item._count.orders} đơn</span>
              </div>
              <div className="mt-5 flex gap-2">
                <Link
                  className="flex-1"
                  href={`/admin/dashboard/merch-campaigns/${item.id}`}
                >
                  <Button className="w-full">Quản lý</Button>
                </Link>
                {item.isPublished && (
                  <Link href={`/merch/${item.slug}`} target="_blank">
                    <Button variant="outline" aria-label="Mở trang bán">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
