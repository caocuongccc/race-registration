"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  ScanLine,
  Shirt,
  Users,
} from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + " đ";
const SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
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

export default function KidRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState("config");
  const [campaign, setCampaign] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [resendTarget, setResendTarget] = useState<any>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [paymentEmailSendingId, setPaymentEmailSendingId] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteSavingId, setNoteSavingId] = useState("");
  const [pickupTestOpen, setPickupTestOpen] = useState(false);
  const [pickupTestEmail, setPickupTestEmail] = useState("");
  const [pickupTestSending, setPickupTestSending] = useState(false);
  const [team, setTeam] = useState<{ users: any[]; assignedUserIds: string[] }>(
    { users: [], assignedUserIds: [] },
  );
  const [shirtForm, setShirtForm] = useState({
    name: "",
    category: "KID",
    type: "SHORT_SLEEVE",
    price: 0,
    frontImageUrl: "",
    backImageUrl: "",
    sizeGuideImageUrl: "",
    sizes: ["KID_5", "KID_7", "KID_9", "KID_11"],
  });

  const load = async () => {
    const res = await fetch(`/api/admin/kid-run-campaigns/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setCampaign(data.campaign);
    const waiver = data.campaign.waivers.find((w: any) => w.isActive) || {
      title: "Miễn trừ trách nhiệm",
      content: "",
      version: "1.0",
    };
    setForm({
      ...data.campaign,
      categories: data.campaign.categories.filter(
        (category: any) => category.name !== "__UNASSIGNED__",
      ),
      eventDate: data.campaign.eventDate.slice(0, 10),
      waiver,
      bankName: data.campaign.bankInfo?.bankName || "",
      bankAccount: data.campaign.bankInfo?.accountNumber || "",
      bankHolder: data.campaign.bankInfo?.accountName || "",
      bankCode: data.campaign.bankInfo?.bankCode || "",
    });
  };
  const loadApplications = async (
    page = pagination.page,
    pageSize = pagination.pageSize,
    query = appliedSearch,
    includeSummary = false,
  ) => {
    setApplicationsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: query,
        includeSummary: includeSummary ? "1" : "0",
      });
      const res = await fetch(
        `/api/admin/kid-run-campaigns/${id}/applications?${params}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplications(data.applications);
      if (data.summary) setSummary(data.summary);
      setPagination(data.pagination);
    } finally {
      setApplicationsLoading(false);
    }
  };
  const applySearch = async () => {
    const query = search.trim();
    setAppliedSearch(query);
    await loadApplications(1, pagination.pageSize, query, true);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
    fetch(`/api/admin/kid-run-campaigns/${id}/users`)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setTeam(d));
  }, [id]);
  useEffect(() => {
    if (tab === "applications")
      loadApplications(1, pagination.pageSize, "", true).catch((e) => setError(e.message));
  }, [tab]);

  const save = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/kid-run-campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice("Đã lưu cấu hình");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const addCategory = () =>
    setForm({
      ...form,
      categories: [
        ...form.categories,
        {
          name: "",
          minBirthYear: new Date().getFullYear() - 5,
          maxBirthYear: new Date().getFullYear() - 3,
          distanceLabel: "",
          bibPrefix: "",
          bibStart: 1,
          bibCapacity: 50,
          remainingBibCount: 50,
          isAvailable: true,
        },
      ],
    });
  const updateCategory = (index: number, field: string, value: any) =>
    setForm({
      ...form,
      categories: form.categories.map((c: any, i: number) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    });
  const createShirt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/kid-run-campaigns/${id}/styles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shirtForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice("Đã thêm mẫu áo");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const setAllShirtsAvailability = async (isAvailable: boolean) => {
    if (!window.confirm(isAvailable ? "Mở lại toàn bộ mẫu áo trong form đăng ký Kid Run?" : "Tạm ngừng bán toàn bộ áo? Đăng ký BIB vẫn tiếp tục mở và các đơn áo cũ vẫn được giữ nguyên.")) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/admin/kid-run-campaigns/${id}/styles/availability`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAvailable }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(isAvailable ? `Đã mở lại ${data.updated} mẫu áo.` : `Đã tạm ngừng ${data.updated} mẫu áo. Đăng ký BIB không bị ảnh hưởng.`);
      await load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };
  const toggleTeamUser = async (userId: string, assigned: boolean) => {
    const res = await fetch(
      `/api/admin/kid-run-campaigns/${id}/users${assigned ? `?userId=${userId}` : ""}`,
      {
        method: assigned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: assigned ? undefined : JSON.stringify({ userId }),
      },
    );
    if (!res.ok) return setError((await res.json()).error);
    setTeam({
      ...team,
      assignedUserIds: assigned
        ? team.assignedUserIds.filter((value) => value !== userId)
        : [...team.assignedUserIds, userId],
    });
  };
  const resendApplicationEmail = async () => {
    if (!resendTarget) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/kid-run-campaigns/${id}/applications/${resendTarget.id}/resend-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resendEmail }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(`Đã gửi lại email tới ${data.email} và cập nhật email hồ sơ.`);
      setResendTarget(null);
      await loadApplications(pagination.page, pagination.pageSize, appliedSearch);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  };

  const resendPaymentEmail = async (application: any) => {
    if (
      !window.confirm(
        `Gửi lại email xác nhận thanh toán áo tới ${application.email}?`,
      )
    )
      return;

    setPaymentEmailSendingId(application.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/kid-run-campaigns/${id}/applications/${application.id}/resend-payment-email`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(`Đã gửi lại email xác nhận thanh toán áo tới ${data.email}.`);
      await loadApplications(pagination.page, pagination.pageSize, appliedSearch);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPaymentEmailSendingId("");
    }
  };
  const saveApplicationNote = async (application: any) => {
    const notes = noteDrafts[application.id] ?? application.notes ?? "";
    setNoteSavingId(application.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/kid-run-campaigns/${id}/applications/${application.id}/note`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, notes: data.notes } : item,
        ),
      );
      setNoteDrafts((current) => ({
        ...current,
        [application.id]: data.notes || "",
      }));
      setNotice(`Đã lưu ghi chú cho hồ sơ ${application.publicCode}.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setNoteSavingId("");
    }
  };
  const cancelBib = async (participant: any) => {
    const reason = window.prompt(
      `Nhập lý do hủy BIB ${participant.bibNumber} - ${participant.fullName}:`,
    );
    if (reason === null) return;
    if (!reason.trim()) return setError("Vui lòng nhập lý do hủy BIB");
    if (
      !window.confirm(
        `Xác nhận hủy BIB ${participant.bibNumber}? Quota sẽ được hoàn lại nhưng số BIB này không được tái sử dụng.`,
      )
    )
      return;
    setWorkflowBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/kid-run-campaigns/${id}/participants/${participant.id}/cancel-bib`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(
        data.alreadyCancelled
          ? `BIB ${participant.bibNumber} đã được hủy trước đó.`
          : `Đã hủy BIB ${participant.bibNumber} và hoàn lại 1 quota.`,
      );
      await loadApplications(
        pagination.page,
        pagination.pageSize,
        appliedSearch,
        true,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorkflowBusy(false);
    }
  };

  const confirmPayment = async (applicationId: string) => {
    if (!confirm("Xác nhận BTC đã nhận đủ tiền áo?")) return;
    const res = await fetch(
      `/api/admin/kid-run-campaigns/${id}/applications/${applicationId}/confirm-payment`,
      { method: "POST" },
    );
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    await loadApplications(pagination.page, pagination.pageSize, appliedSearch, true);
  };
  const assignGroups = async () => {
    if (
      !confirm(
        "Xếp lại toàn bộ runner chưa cấp BIB theo dải năm sinh đang cấu hình?",
      )
    )
      return;
    setWorkflowBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/kid-run-campaigns/${id}/assign-groups`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.invalid
            ? `${data.error}: ${data.invalid.map((item: any) => `${item.fullName} (${item.birthYear})`).join(", ")}`
            : data.error,
        );
      setNotice(`Đã xếp ${data.assigned} runner vào nhóm tuổi`);
      await loadApplications(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorkflowBusy(false);
    }
  };
  const sendBibs = async (retryFailed = false) => {
    if (
      !confirm(
        retryFailed
          ? "Gửi lại các email BIB đang lỗi?"
          : "Cấp số BIB theo prefix nhóm và bắt đầu gửi email?",
      )
    )
      return;
    setWorkflowBusy(true);
    setError("");
    setNotice("");
    try {
      let sent = 0,
        failed = 0,
        issued = 0,
        remaining = 1,
        rounds = 0,
        failedRemaining = 0;
      do {
        const res = await fetch(
          `/api/admin/kid-run-campaigns/${id}/send-bibs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ retryFailed }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        sent += data.sent;
        failed += data.failed;
        issued += data.issued;
        remaining = retryFailed ? 0 : data.remainingUnattempted;
        failedRemaining = data.failedRemaining;
        rounds++;
        if (!data.processed) break;
      } while (remaining > 0 && rounds < 30);
      setNotice(
        `Đã cấp mới ${issued} BIB, gửi thành công ${sent} email${failed || failedRemaining ? `, còn ${failedRemaining} email lỗi cần gửi lại` : ""}.`,
      );
      await loadApplications(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorkflowBusy(false);
    }
  };
  const sendBibPickupTest = async () => {
    setPickupTestSending(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/kid-run-campaigns/${id}/send-bib-pickup-test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pickupTestEmail }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPickupTestOpen(false);
      setNotice(
        `Đã gửi email test tới ${data.email}, dùng hồ sơ mẫu ${data.samplePublicCode}.`,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPickupTestSending(false);
    }
  };
  const sendBibPickupEmails = async (retryFailed = false) => {
    if (
      !confirm(
        retryFailed
          ? "Gửi lại các email thông báo nhận BIB đang lỗi?"
          : "Gửi email thông báo thời gian nhận BIB cho tất cả hồ sơ còn BIB hiệu lực? BIB đã hủy sẽ không được gửi.",
      )
    )
      return;
    setWorkflowBusy(true);
    setError("");
    setNotice("");
    try {
      let sent = 0;
      let failed = 0;
      let remaining = 1;
      let failedRemaining = 0;
      let rounds = 0;
      do {
        const res = await fetch(
          `/api/admin/kid-run-campaigns/${id}/send-bib-pickup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ retryFailed }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        sent += data.sent;
        failed += data.failed;
        remaining = retryFailed ? 0 : data.remainingUnattempted;
        failedRemaining = data.failedRemaining;
        rounds++;
        if (!data.processed) break;
      } while (remaining > 0 && rounds < 30);
      setNotice(
        `Đã gửi ${sent} email thông báo nhận BIB${failed || failedRemaining ? `; còn ${failedRemaining} email lỗi.` : "."}`,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorkflowBusy(false);
    }
  };
  if (!form) return <div className="p-8">{error || "Đang tải..."}</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <Link
            href="/admin/dashboard/kid-run"
            className="rounded-md border p-2"
          >
            <ArrowLeft />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${campaign.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="mt-1 text-slate-500">/kid-run/{campaign.slug}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/dashboard/kid-run/${id}/scanner`}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white"
          >
            <ScanLine className="h-4 w-4" />
            Quét BIB liên tục
          </Link>
          <Link
            target="_blank"
            href={`/kid-run/${campaign.slug}?preview=1`}
            className="inline-flex items-center gap-2 rounded-md border border-blue-600 px-4 py-2 text-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            Xem trang đăng ký
          </Link>
        </div>
      </div>
      <div className="mt-6 flex overflow-x-auto border-b">
        {[
          ["config", "Cấu hình"],
          ["shirts", "Mẫu áo"],
          ["applications", "Đăng ký & BIB"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`min-w-fit border-b-2 px-5 py-3 font-semibold ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <div className="mt-5 rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-5 rounded-md bg-emerald-50 p-4 text-emerald-700">
          {notice}
        </div>
      )}

      {tab === "config" && (
        <div className="mt-6 space-y-6">
          <section className="grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-2">
            <Input
              label="Tên chương trình"
              value={form.name}
              onChange={(v: string) => setForm({ ...form, name: v })}
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(v: string) => setForm({ ...form, slug: v })}
            />
            <Input
              label="Ngày tổ chức"
              type="date"
              value={form.eventDate}
              onChange={(v: string) => setForm({ ...form, eventDate: v })}
            />
            <Input
              label="Địa điểm"
              value={form.location}
              onChange={(v: string) => setForm({ ...form, location: v })}
            />
            <div className="md:col-span-2">
              <ImageUploader
                folder={`kid-run/${id}/hero`}
                label="Ảnh banner"
                currentImage={form.heroImageUrl || undefined}
                onUploadComplete={(url) =>
                  setForm({ ...form, heroImageUrl: url })
                }
                onRemove={() => setForm({ ...form, heroImageUrl: "" })}
              />
            </div>
            <Input
              label="Số bé tối đa/hồ sơ"
              type="number"
              value={form.maxChildrenPerApplication}
              onChange={(v: string) =>
                setForm({ ...form, maxChildrenPerApplication: Number(v) })
              }
            />
            <Input
              label="Tổng số BIB tối đa"
              type="number"
              value={form.bibCapacity}
              onChange={(v: string) =>
                setForm({ ...form, bibCapacity: Number(v) })
              }
            />
            <div className="rounded-md border bg-blue-50 p-3 text-sm text-blue-800">
              <div className="font-semibold">BIB còn lại</div>
              <div className="mt-1 text-xl font-bold">
                {form.remainingBibCount}/{form.bibCapacity}
              </div>
              <div className="mt-1 text-xs">
                Số còn lại được tính lại khi lưu cấu hình.
              </div>
            </div>
            <label className="md:col-span-2 text-sm font-medium">
              Mô tả
              <textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 min-h-28 w-full rounded-md border p-3"
              />
            </label>
            <label className="text-sm font-medium">
              Trạng thái
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 h-11 w-full rounded-md border bg-white px-3"
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="OPEN">Mở đăng ký</option>
                <option value="CLOSED">Đóng đăng ký</option>
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-5 pb-2">
              <Check
                label="Hiển thị công khai"
                checked={form.isPublished}
                onChange={(v: boolean) => setForm({ ...form, isPublished: v })}
              />
              <Check
                label="Cho phép đăng ký"
                checked={form.allowRegistration}
                onChange={(v: boolean) =>
                  setForm({ ...form, allowRegistration: v })
                }
              />
              <Check
                label="Đối soát online"
                checked={form.requireOnlinePayment}
                onChange={(v: boolean) =>
                  setForm({ ...form, requireOnlinePayment: v })
                }
              />
            </div>
          </section>
          <section className="rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nhóm tuổi và dải BIB</h2>
              <button
                onClick={addCategory}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <Plus className="h-4 w-4" />
                Thêm nhóm
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Hệ thống tự xếp nhóm theo năm sinh, giữ chỗ và cấp BIB ngay khi
              đăng ký.
            </p>
            <div className="mt-4 space-y-4">
              {form.categories.map((c: any, index: number) => (
                <div
                  key={c.id || index}
                  className="grid gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-4 xl:grid-cols-8"
                >
                  <Input
                    label="Tên nhóm"
                    value={c.name}
                    onChange={(v: string) => updateCategory(index, "name", v)}
                  />
                  <Input
                    label="Từ năm sinh"
                    type="number"
                    value={c.minBirthYear}
                    onChange={(v: string) =>
                      updateCategory(index, "minBirthYear", Number(v))
                    }
                  />
                  <Input
                    label="Đến năm sinh"
                    type="number"
                    value={c.maxBirthYear}
                    onChange={(v: string) =>
                      updateCategory(index, "maxBirthYear", Number(v))
                    }
                  />
                  <Input
                    label="Cự ly"
                    value={c.distanceLabel}
                    onChange={(v: string) =>
                      updateCategory(index, "distanceLabel", v)
                    }
                  />
                  <Input
                    label="Prefix BIB"
                    value={c.bibPrefix}
                    onChange={(v: string) =>
                      updateCategory(index, "bibPrefix", v.toUpperCase())
                    }
                  />
                  <Input
                    label="BIB bắt đầu"
                    type="number"
                    value={c.bibStart}
                    onChange={(v: string) =>
                      updateCategory(index, "bibStart", Number(v))
                    }
                  />
                  <Input
                    label="Tổng BIB nhóm"
                    type="number"
                    value={c.bibCapacity ?? 50}
                    onChange={(v: string) =>
                      updateCategory(index, "bibCapacity", Number(v))
                    }
                  />
                  <div className="rounded-md border bg-white px-3 py-2 text-sm">
                    <div className="text-slate-500">BIB còn lại</div>
                    <strong>
                      {c.remainingBibCount ?? c.bibCapacity ?? 50}/
                      {c.bibCapacity ?? 50}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-2">
            <h2 className="text-lg font-bold md:col-span-2">
              Tài khoản nhận tiền áo
            </h2>
            <Input
              label="Ngân hàng"
              value={form.bankName}
              onChange={(v: string) => setForm({ ...form, bankName: v })}
            />
            <Input
              label="Mã ngân hàng"
              value={form.bankCode}
              onChange={(v: string) => setForm({ ...form, bankCode: v })}
            />
            <Input
              label="Số tài khoản"
              value={form.bankAccount}
              onChange={(v: string) => setForm({ ...form, bankAccount: v })}
            />
            <Input
              label="Chủ tài khoản"
              value={form.bankHolder}
              onChange={(v: string) => setForm({ ...form, bankHolder: v })}
            />
          </section>
          {team.users.length > 0 && (
            <section className="rounded-lg border bg-white p-5">
              <h2 className="text-lg font-bold">Nhóm được phép quản lý</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {team.users.map((user) => {
                  const assigned = team.assignedUserIds.includes(user.id);
                  return (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3"
                    >
                      <input
                        type="checkbox"
                        checked={assigned}
                        onChange={() => toggleTeamUser(user.id, assigned)}
                      />
                      <span>
                        <b>{user.name || user.email}</b>
                        <br />
                        <span className="text-sm text-slate-500">
                          {user.email}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}
          <section className="rounded-lg border bg-white p-5">
            <h2 className="text-lg font-bold">Miễn trừ trách nhiệm</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="Tiêu đề"
                value={form.waiver.title}
                onChange={(v: string) =>
                  setForm({ ...form, waiver: { ...form.waiver, title: v } })
                }
              />
              <Input
                label="Phiên bản"
                value={form.waiver.version}
                onChange={(v: string) =>
                  setForm({ ...form, waiver: { ...form.waiver, version: v } })
                }
              />
              <label className="md:col-span-2 text-sm font-medium">
                Nội dung
                <textarea
                  value={form.waiver.content}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      waiver: { ...form.waiver, content: e.target.value },
                    })
                  }
                  className="mt-1 min-h-64 w-full rounded-md border p-3"
                />
              </label>
            </div>
          </section>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 font-bold text-white"
          >
            <Save className="h-5 w-5" />
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      )}

      {tab === "shirts" && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
            <div><h2 className="font-bold">Trạng thái bán áo trong Kid Run</h2><p className="mt-1 text-sm text-slate-600">{campaign.shirtStyles.some((style: any) => style.isAvailable) ? "Đang hiển thị áo trong form đăng ký." : "Đã tạm ngừng bán áo; đăng ký BIB vẫn hoạt động."}</p></div>
            {campaign.shirtStyles.some((style: any) => style.isAvailable) ? <button disabled={saving || campaign.shirtStyles.length === 0} onClick={() => setAllShirtsAvailability(false)} className="rounded-md border border-red-600 px-4 py-2 font-semibold text-red-700 disabled:opacity-50">Tạm ngừng bán áo</button> : <button disabled={saving || campaign.shirtStyles.length === 0} onClick={() => setAllShirtsAvailability(true)} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Mở lại bán áo</button>}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {campaign.shirtStyles.map((style: any) => (
              <div
                key={style.id}
                className="flex gap-4 rounded-lg border bg-white p-4"
              >
                {style.frontImageUrl ? (
                  <img
                    src={style.frontImageUrl}
                    alt={style.name}
                    className="h-28 w-28 rounded object-contain bg-slate-100"
                  />
                ) : (
                  <div className="grid h-28 w-28 place-items-center bg-slate-100">
                    <Shirt />
                  </div>
                )}
                <div>
                  <h3 className="font-bold">{style.name}</h3>
                  <p className="text-sm text-slate-500">
                    {style.category} · {style.type}
                  </p>
                  <p className="mt-2 font-bold text-emerald-700">
                    {money(style.price)}
                  </p>
                  <p className="mt-2 text-sm">
                    Size:{" "}
                    {style.variants
                      .filter((v: any) => v.isAvailable)
                      .map((v: any) => v.size)
                      .join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={createShirt}
            className="h-fit rounded-lg border bg-white p-5"
          >
            <h2 className="font-bold">Thêm mẫu áo</h2>
            <div className="mt-4 space-y-3">
              <Input
                label="Tên mẫu"
                value={shirtForm.name}
                onChange={(v: string) =>
                  setShirtForm({ ...shirtForm, name: v })
                }
              />
              <Select
                label="Loại áo"
                value={shirtForm.category}
                onChange={(v: string) =>
                  setShirtForm({ ...shirtForm, category: v })
                }
                options={[
                  ["MALE", "Nam"],
                  ["FEMALE", "Nữ"],
                  ["KID", "Trẻ em"],
                ]}
              />
              <Select
                label="Kiểu áo"
                value={shirtForm.type}
                onChange={(v: string) =>
                  setShirtForm({ ...shirtForm, type: v })
                }
                options={[
                  ["SHORT_SLEEVE", "T-shirt"],
                  ["TANK_TOP", "Singlet"],
                ]}
              />
              <Input
                label="Giá"
                type="number"
                value={shirtForm.price}
                onChange={(v: string) =>
                  setShirtForm({ ...shirtForm, price: Number(v) })
                }
              />
              <ImageUploader
                folder={`kid-run/${id}/shirts`}
                label="Ảnh mặt trước"
                currentImage={shirtForm.frontImageUrl || undefined}
                onUploadComplete={(url) =>
                  setShirtForm({ ...shirtForm, frontImageUrl: url })
                }
                onRemove={() =>
                  setShirtForm({ ...shirtForm, frontImageUrl: "" })
                }
              />
              <ImageUploader
                folder={`kid-run/${id}/shirts`}
                label="Ảnh mặt sau"
                currentImage={shirtForm.backImageUrl || undefined}
                onUploadComplete={(url) =>
                  setShirtForm({ ...shirtForm, backImageUrl: url })
                }
                onRemove={() =>
                  setShirtForm({ ...shirtForm, backImageUrl: "" })
                }
              />
              <ImageUploader
                folder={`kid-run/${id}/shirts`}
                label="Bảng size"
                currentImage={shirtForm.sizeGuideImageUrl || undefined}
                onUploadComplete={(url) =>
                  setShirtForm({ ...shirtForm, sizeGuideImageUrl: url })
                }
                onRemove={() =>
                  setShirtForm({ ...shirtForm, sizeGuideImageUrl: "" })
                }
              />
              <div>
                <div className="text-sm font-medium">Size</div>
                <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {SIZE_OPTIONS.map((size) => (
                    <label
                      key={size}
                      className="flex items-center gap-1 rounded border px-2 py-1 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={shirtForm.sizes.includes(size)}
                        onChange={(e) =>
                          setShirtForm({
                            ...shirtForm,
                            sizes: e.target.checked
                              ? [...shirtForm.sizes, size]
                              : shirtForm.sizes.filter((s) => s !== size),
                          })
                        }
                      />
                      {size}
                    </label>
                  ))}
                </div>
              </div>
              <button
                disabled={saving}
                className="w-full rounded-md bg-emerald-700 py-3 font-bold text-white"
              >
                Thêm mẫu áo
              </button>
            </div>
          </form>
        </div>
          </div>
      )}

      {tab === "applications" && (
        <div className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Hồ sơ", summary?.applications || 0],
              ["Áo đã thanh toán", summary?.selectedShirts || 0],
              ["Tiền áo", money(summary?.paidShirtRevenue || 0)],
              [
                "BIB đã nhận",
                `${summary?.collectedBibs || 0}/${summary?.activeBibs || 0}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-lg border bg-white p-5"
              >
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-1 text-2xl font-bold">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 rounded-lg border bg-white p-4">
            <button
              disabled={workflowBusy}
              onClick={assignGroups}
              className="rounded-md border border-blue-600 px-4 py-2 font-semibold text-blue-700 disabled:opacity-50"
            >
              Xếp runner vào nhóm
            </button>
            <button
              disabled={workflowBusy}
              onClick={() => sendBibs(false)}
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Cấp & gửi BIB
            </button>
            <button
              disabled={workflowBusy}
              onClick={() => sendBibs(true)}
              className="rounded-md border border-amber-600 px-4 py-2 font-semibold text-amber-700 disabled:opacity-50"
            >
              Gửi lại email lỗi
            </button>
            <button
              disabled={workflowBusy}
              onClick={() => setPickupTestOpen(true)}
              className="rounded-md border border-sky-600 px-4 py-2 font-semibold text-sky-700 disabled:opacity-50"
            >
              Gửi email test
            </button>
            <button
              disabled={workflowBusy}
              onClick={() => sendBibPickupEmails(false)}
              className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Gửi thông báo nhận BIB
            </button>
            <button
              disabled={workflowBusy}
              onClick={() => sendBibPickupEmails(true)}
              className="rounded-md border border-emerald-700 px-4 py-2 font-semibold text-emerald-700 disabled:opacity-50"
            >
              Gửi lại thông báo lỗi
            </button>
            <span className="self-center text-sm text-slate-500">
              {workflowBusy
                ? "Đang thực hiện..."
                : `Runner: ${summary?.participants || 0} · Chưa xếp nhóm: ${summary?.unassigned || 0} · Đã cấp BIB: ${summary?.issuedBibs || 0} · Email BIB: ${summary?.bibEmailsSent || 0}`}
            </span>
          </div>
          <div className="mt-5 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Tên bé, BIB, phụ huynh, email, SĐT..."
              className="h-11 flex-1 rounded-md border px-3"
            />
            <button
              onClick={applySearch}
              disabled={applicationsLoading}
              className="rounded-md border px-4 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${applicationsLoading ? "animate-spin" : ""}`} />
            </button>
            <a
              href={`/api/admin/kid-run-campaigns/${id}/export`}
              className="rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white"
            >
              Export Excel
            </a>
          </div>
          <div className={`mt-4 overflow-x-auto rounded-lg border bg-white transition-opacity ${applicationsLoading ? "pointer-events-none opacity-60" : ""}`}>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-3">Hồ sơ</th>
                  <th className="p-3">Các BIB</th>
                  <th className="min-w-72 p-3">Ghi chú phát BIB</th>
                  <th className="p-3">Áo</th>
                  <th className="p-3">Nhận BIB</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className={`border-t align-top ${app.duplicateInfo ? app.duplicateInfo.differentCategories ? "border-l-4 border-l-red-600 bg-red-100" : "border-l-4 border-l-amber-500 bg-amber-100" : ""}`}
                  >
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <b>{app.guardianName}</b>
                        {app.duplicateInfo && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${app.duplicateInfo.differentCategories ? "bg-red-600" : "bg-amber-600"}`}>
                            Nghi trùng
                          </span>
                        )}
                      </div>
                      {app.duplicateInfo && (
                        <div className={`mt-1 rounded-md border px-2 py-1 text-xs font-semibold ${app.duplicateInfo.differentCategories ? "border-red-300 bg-red-100 text-red-800" : "border-amber-300 bg-amber-100 text-amber-800"}`}>
                          Dòng {app.duplicateInfo.rowNumber} · trùng với dòng {app.duplicateInfo.duplicateRows.join(", ")}
                          {app.duplicateInfo.differentCategories
                            ? ` · khác nhóm: ${app.duplicateInfo.categories} ↔ ${app.duplicateInfo.duplicateCategories.join(" / ")}`
                            : ` · cùng nhóm ${app.duplicateInfo.categories}`}
                        </div>
                      )}
                      <div>{app.phone}</div>
                      <div className="text-slate-500">{app.publicCode}</div>
                      <div className="break-all text-xs text-slate-500">
                        {app.email}
                      </div>
                      {app.emailLogs?.[0]?.status === "FAILED" && (
                        <div className="mt-1 text-xs font-semibold text-red-600">
                          Email gần nhất gửi lỗi
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {app.participants.map((p: any) => (
                        <div key={p.id} className="mb-2">
                          <div className={`flex flex-wrap items-center gap-2 ${p.bibStatus === "CANCELLED" ? "opacity-70" : ""}`}>
                            <b className={p.bibStatus === "CANCELLED" ? "text-red-700 line-through" : ""}>
                              {p.bibNumber || "Chưa cấp BIB"}
                            </b>{" "}- {p.fullName}
                            {p.bibStatus === "CANCELLED" ? (
                              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                BIB ĐÃ HỦY · KHÔNG CÒN HIỆU LỰC
                              </span>
                            ) : (
                              p.bibNumber && (
                                <button
                                  disabled={workflowBusy}
                                  onClick={() => cancelBib(p)}
                                  className="rounded border border-red-500 px-2 py-1 text-xs font-semibold text-red-600 disabled:opacity-50"
                                >
                                  Hủy BIB
                                </button>
                              )
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.category.name === "__UNASSIGNED__"
                              ? `Chờ xếp nhóm · sinh năm ${p.birthYear}`
                              : `${p.category.name} · ${p.category.distanceLabel}`}
                          </div>
                        </div>
                      ))}
                    </td>
                    <td className="min-w-72 p-3">
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={noteDrafts[app.id] ?? app.notes ?? ""}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [app.id]: event.target.value,
                          }))
                        }
                        placeholder="VD: BIB gốc 123 nhóm 11–12 chuyển sang BIB 234 nhóm 5–6..."
                        className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                      <button
                        disabled={noteSavingId === app.id}
                        onClick={() => saveApplicationNote(app)}
                        className="mt-2 rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {noteSavingId === app.id ? "Đang lưu..." : "Lưu ghi chú"}
                      </button>
                    </td>
                    <td className="p-3">
                      <div>
                        {app.shirts.length} áo · {money(app.shirtTotalAmount)}
                      </div>
                      <span
                        className={
                          app.shirtPaymentStatus === "PAID"
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }
                      >
                        {app.shirtPaymentStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      {
                        app.participants.filter((p: any) => p.bibCollectedAt)
                          .length
                      }
                      /{app.participants.length}
                    </td>
                    <td className="p-3">
                      {appliedSearch && (
                        <button
                          onClick={() => {
                            setResendTarget(app);
                            setResendEmail(app.email);
                          }}
                          className="mb-2 block rounded-md border border-blue-600 px-3 py-2 text-blue-700"
                        >
                          Gửi lại email BIB
                        </button>
                      )}
                      {appliedSearch && app.shirtPaymentStatus === "PAID" && (
                        <button
                          disabled={paymentEmailSendingId === app.id}
                          onClick={() => resendPaymentEmail(app)}
                          className="mb-2 block rounded-md border border-emerald-600 px-3 py-2 text-emerald-700 disabled:opacity-50"
                        >
                          {paymentEmailSendingId === app.id
                            ? "Đang gửi..."
                            : "Gửi lại email thanh toán"}
                        </button>
                      )}
                      {app.shirtPaymentStatus === "PENDING" && (
                        <button
                          onClick={() => confirmPayment(app.id)}
                          className="rounded-md border border-emerald-600 px-3 py-2 text-emerald-700"
                        >
                          Xác nhận tiền áo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <select
              value={pagination.pageSize}
              onChange={(e) => loadApplications(1, Number(e.target.value), appliedSearch)}
              className="rounded-md border px-3 py-2"
            >
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                disabled={applicationsLoading || pagination.page <= 1}
                onClick={() => loadApplications(pagination.page - 1, pagination.pageSize, appliedSearch)}
                className="rounded-md border px-3 py-2 disabled:opacity-40"
              >
                Trước
              </button>
              <span>
                {pagination.page}/{Math.max(1, pagination.totalPages)}
              </span>
              <button
                disabled={applicationsLoading || pagination.page >= pagination.totalPages}
                onClick={() => loadApplications(pagination.page + 1, pagination.pageSize, appliedSearch)}
                className="rounded-md border px-3 py-2 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}
      {pickupTestOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold">Gửi thử thông báo nhận BIB</h2>
            <p className="mt-1 text-sm text-slate-600">
              Email dùng một hồ sơ còn BIB hiệu lực làm dữ liệu mẫu. Thao tác này không đánh dấu đã gửi hàng loạt.
            </p>
            <label className="mt-4 block text-sm font-medium">
              Email nhận bản test
              <input
                type="email"
                autoFocus
                value={pickupTestEmail}
                onChange={(event) => setPickupTestEmail(event.target.value)}
                placeholder="example@gmail.com"
                className="mt-1 h-11 w-full rounded-md border px-3"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={pickupTestSending}
                onClick={() => setPickupTestOpen(false)}
                className="rounded-md border px-4 py-2"
              >
                Hủy
              </button>
              <button
                disabled={pickupTestSending || !pickupTestEmail.trim()}
                onClick={sendBibPickupTest}
                className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {pickupTestSending ? "Đang gửi..." : "Gửi email test"}
              </button>
            </div>
          </div>
        </div>
      )}
      {resendTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold">Gửi lại email đăng ký</h2>
            <p className="mt-1 text-sm text-slate-600">
              {resendTarget.guardianName} · {resendTarget.publicCode}
            </p>
            <label className="mt-4 block text-sm font-medium">
              Email nhận lại
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border px-3"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button disabled={resending} onClick={() => setResendTarget(null)} className="rounded-md border px-4 py-2">Hủy</button>
              <button disabled={resending} onClick={resendApplicationEmail} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {resending ? "Đang gửi..." : "Gửi và cập nhật email"}
              </button>
            </div>
          </div>
        </div>
      )}    </div>
  );
}
function Input({ label, value, onChange, type = "text" }: any) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-md border px-3"
      />
    </label>
  );
}
function Select({ label, value, onChange, options }: any) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-md border bg-white px-3"
      >
        {options.map((o: any) => (
          <option key={o[0]} value={o[0]}>
            {o[1]}
          </option>
        ))}
      </select>
    </label>
  );
}
function Check({ label, checked, onChange }: any) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
