"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Baby,
  CheckCircle2,
  ChevronDown,
  Gift,
  Heart,
  Mail,
  PiggyBank,
  Plus,
  QrCode,
  Shirt,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + " đ";
const uid = () => Math.random().toString(36).slice(2);
const emptyChild = () => ({
  key: uid(),
  fullName: "",
  dateOfBirth: "",
  gender: "",
  schoolClub: "",
  shirtVariantId: "",
});

export default function KidRunRegistrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [waiverViewed, setWaiverViewed] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [shirtPreviewOpen, setShirtPreviewOpen] = useState(false);
  const [shirtPreviewIndex, setShirtPreviewIndex] = useState(0);
  const [shirtPreviewView, setShirtPreviewView] = useState<
    "front" | "back" | "size"
  >("front");
  const [additionalShirts, setAdditionalShirts] = useState<
    Array<{ key: string; variantId: string; quantity: number }>
  >([]);
  const [form, setForm] = useState({
    guardianName: "",
    email: "",
    phone: "",
    notes: "",
    waiverAccepted: false,
    mediaConsent: false,
  });
  const [children, setChildren] = useState([emptyChild()]);

  useEffect(() => {
    if (!shirtPreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShirtPreviewOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shirtPreviewOpen]);

  useEffect(() => {
    fetch(`/api/kid-run-campaigns/${slug}${preview ? "?preview=1" : ""}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCampaign(data.campaign);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, preview]);

  useEffect(() => {
    if (!result || result.application.shirtPaymentStatus !== "PENDING") return;
    const timer = window.setInterval(async () => {
      const res = await fetch(
        `/api/kid-run-applications/${result.application.publicCode}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secretCode: result.secretCode }),
        },
      );
      if (!res.ok) return;
      const status = await res.json();
      if (status.shirtPaymentStatus === "PAID") {
        setResult((current: any) => ({
          ...current,
          application: {
            ...current.application,
            shirtPaymentStatus: "PAID",
            shirtPaymentDate: status.shirtPaymentDate,
          },
        }));
      }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [
    result?.application?.publicCode,
    result?.application?.shirtPaymentStatus,
    result?.secretCode,
  ]);
  const variantOptions = useMemo(
    () =>
      (campaign?.shirtStyles || []).flatMap((style: any) =>
        style.variants.map((variant: any) => ({
          id: variant.id,
          styleId: style.id,
          category: style.category,
          label: `${style.name} - ${style.category === "MALE" ? "Nam" : style.category === "FEMALE" ? "Nữ" : "Trẻ em"} - ${style.type === "SHORT_SLEEVE" ? "T-shirt" : "Singlet"} - Size ${variant.size}`,
          price: style.price,
        })),
      ),
    [campaign],
  );

  const childShirtOptions = variantOptions.filter(
    (option: any) => option.category === "KID",
  );
  const adultShirtOptions = variantOptions.filter(
    (option: any) => option.category !== "KID",
  );

  const childShirtTotal = children.reduce(
    (sum, child) =>
      sum +
      (variantOptions.find((option: any) => option.id === child.shirtVariantId)
        ?.price || 0),
    0,
  );
  const additionalShirtTotal = additionalShirts.reduce(
    (sum, item) =>
      sum +
      (variantOptions.find((option: any) => option.id === item.variantId)
        ?.price || 0) *
        item.quantity,
    0,
  );
  const shirtTotal = childShirtTotal + additionalShirtTotal;

  const getCategoryForDate = (dateText: string) => {
    const birthYear = Number(dateText?.slice(0, 4));
    if (!birthYear) return null;
    return (
      (campaign?.categories || []).find(
        (category: any) =>
          birthYear >= category.minBirthYear &&
          birthYear <= category.maxBirthYear,
      ) || null
    );
  };

  const requiredInformationComplete =
    form.guardianName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    /^0\d{9}$/.test(form.phone.replace(/\D/g, "")) &&
    children.length > 0 &&
    children.every((child) => {
      const category = getCategoryForDate(child.dateOfBirth);
      return (
        child.fullName.trim().length > 0 &&
        Boolean(child.dateOfBirth) &&
        Boolean(child.gender) &&
        Boolean(category) &&
        category.remainingBibCount > 0
      );
    });
  const registrationReady = Boolean(
    campaign?.isOpen && requiredInformationComplete && form.waiverAccepted,
  );

  const openShirtPreview = (variantId?: string) => {
    const styleIndex = (campaign?.shirtStyles || []).findIndex((style: any) =>
      style.variants?.some((variant: any) => variant.id === variantId),
    );
    setShirtPreviewIndex(styleIndex >= 0 ? styleIndex : 0);
    setShirtPreviewView("front");
    setShirtPreviewOpen(true);
  };

  const updateChild = (key: string, field: string, value: string) =>
    setChildren((current) =>
      current.map((child) =>
        child.key === key ? { ...child, [field]: value } : child,
      ),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/kid-run-campaigns/${slug}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          waiverId:
            campaign.waiverId ||
            campaign.waiver?.id ||
            campaign.waivers?.[0]?.id,
          waiverViewed,
          children: children.map(({ key: _key, ...child }) => child),
          additionalShirts: additionalShirts
            .filter((item) => item.variantId && item.quantity > 0)
            .map(({ variantId, quantity }) => ({ variantId, quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Không thể gửi đăng ký");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  if (!campaign)
    return (
      <div className="min-h-screen grid place-items-center p-6 text-red-600">
        {error || "Không tìm thấy chương trình"}
      </div>
    );

  if (result) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
        <section className="mx-auto max-w-2xl rounded-lg border bg-white p-6 shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold">Đăng ký chạy thành công</h1>
          <p className="mt-2 text-slate-600">
            Mã hồ sơ <strong>{result.application.publicCode}</strong> đã được
            ghi nhận. Email xác nhận hồ sơ đã gửi đến {result.application.email}
            . BIB và QR nhận BIB đã được cấp và gửi trong email xác nhận.
          </p>
          <div className="mt-6 space-y-3">
            {result.application.participants.map(
              (participant: any, index: number) => (
                <div
                  key={participant.id}
                  className="rounded-md border border-slate-200 p-4"
                >
                  <div className="font-bold text-emerald-800">
                    Bé {index + 1}: {participant.fullName}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Sinh năm {participant.birthYear} ·{" "}
                    {participant.category.name}
                  </div>
                  <div className="mt-2 text-lg font-extrabold text-blue-700">
                    BIB {participant.bibNumber}
                  </div>
                </div>
              ),
            )}
          </div>
          {result.bibQrCodeDataUrl && (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="font-bold text-emerald-900">
                QR nhận BIB chung cho gia đình
              </div>
              <img
                src={result.bibQrCodeDataUrl}
                alt="QR nhận BIB"
                className="mx-auto mt-3 w-64 max-w-full border bg-white"
              />
              <p className="mt-2 text-sm text-emerald-800">
                BTC quét một mã này để nhận toàn bộ BIB trong hồ sơ.
              </p>
            </div>
          )}
          <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm text-blue-800">Mã bí mật tra cứu hồ sơ</div>
            <div className="mt-1 text-3xl font-bold tracking-[0.2em] text-blue-950">
              {result.secretCode}
            </div>
          </div>
          {result.application.shirtTotalAmount > 0 && (
            <div className="mt-6 border-t pt-6">
              <h2 className="text-lg font-bold">
                Thanh toán áo: {money(result.application.shirtTotalAmount)}
              </h2>
              {result.application.shirtPaymentStatus === "PAID" && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 p-4 font-bold text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Đã nhận thanh toán áo
                </div>
              )}
              <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Hồ sơ chạy đã được ghi nhận. Áo chỉ được ghi nhận sản xuất sau
                khi có email xác nhận thanh toán thành công.
              </p>
              {result.application.shirtPaymentStatus ===
              "PAID" ? null : result.payment ? (
                <div className="mt-4 text-center">
                  <img
                    src={result.payment.qrPaymentUrl}
                    alt="QR thanh toán áo"
                    className="mx-auto w-72 max-w-full border"
                  />
                  <dl className="mt-4 grid grid-cols-[120px_1fr] gap-2 text-left text-sm">
                    <dt>Ngân hàng</dt>
                    <dd className="font-semibold">
                      {result.payment.bankInfo.bankName}
                    </dd>
                    <dt>Số tài khoản</dt>
                    <dd className="font-semibold">
                      {result.payment.bankInfo.accountNumber}
                    </dd>
                    <dt>Chủ tài khoản</dt>
                    <dd className="font-semibold">
                      {result.payment.bankInfo.accountName}
                    </dd>
                    <dt>Nội dung</dt>
                    <dd className="font-bold text-red-600">
                      {result.payment.transferContent}
                    </dd>
                  </dl>
                  <p className="mt-4 border-l-4 border-amber-500 bg-amber-50 p-3 text-left text-sm">
                    Không thay đổi nội dung chuyển khoản để hệ thống tự động
                    nhận diện.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-red-600">
                  BTC chưa cấu hình tài khoản nhận tiền áo. Vui lòng liên hệ
                  BTC; hồ sơ đăng ký chạy vẫn đã được ghi nhận.
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <img
        src={campaign.heroImageUrl}
        alt={campaign.name}
        className="mx-auto block max-h-[180px] w-full max-w-6xl bg-white object-contain px-3 py-2 sm:max-h-[220px] lg:max-h-[260px]"
      />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Đăng ký Mid-Autumn Kids Runs
            </p>
            <a
              href={`/kid-run/${slug}/lookup`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <QrCode className="h-4 w-4" />
              Tra cứu hồ sơ
            </a>
          </div>
          <h1 className="mt-1 text-3xl font-bold">{campaign.name}</h1>
          <p className="mt-2 text-slate-600">
            {new Date(campaign.eventDate).toLocaleDateString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            · {campaign.location}
          </p>
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2 text-blue-700 ring-1 ring-blue-100">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-blue-950">
                    BIB HOÀN TOÀN MIỄN PHÍ
                  </p>
                  <p className="mt-1 text-sm text-blue-800">
                    {campaign.categories?.length || 4} nhóm tuổi •{" "}
                    {campaign.categories?.[0]?.bibCapacity || 50} BIB/nhóm
                  </p>
                  <p className="mt-1 text-xs italic text-blue-700">
                    Hệ thống tự động phân nhóm theo năm sinh
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Còn lại
                </div>
                <strong className="whitespace-nowrap text-2xl font-extrabold text-blue-900">
                  {campaign.remainingBibCount}/{campaign.bibCapacity} BIB
                </strong>
              </div>
            </div>
            {campaign.categories?.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                {campaign.categories.map((category: any) => (
                  <div
                    key={category.id}
                    className="rounded-xl border border-blue-100 bg-white px-3 py-2"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {category.name}
                    </div>
                    <div
                      className={`mt-0.5 text-xs font-semibold ${category.remainingBibCount > 0 ? "text-blue-700" : "text-red-600"}`}
                    >
                      {category.remainingBibCount > 0
                        ? `Còn ${category.remainingBibCount}/${category.bibCapacity}`
                        : "Đã đủ BIB"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* {campaign.description && (
            <div className="mt-4">
              <div
                className={`relative whitespace-pre-line leading-7 text-slate-700 ${descriptionExpanded ? "" : "max-h-28 overflow-hidden"}`}
              >
                {campaign.description}
                {!descriptionExpanded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50 to-transparent" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setDescriptionExpanded((value) => !value)}
                className="mt-2 text-sm font-semibold text-emerald-700 hover:underline"
              >
                {descriptionExpanded
                  ? "Thu gọn nội dung"
                  : "Xem đầy đủ nội dung"}
              </button>
            </div>
          )} */}
        </header>
        {!campaign.isOpen && (
          <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
            {campaign.closedReason}
          </div>
        )}
        <section className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2 text-amber-700 ring-1 ring-amber-200">
                  <PiggyBank className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-950">
                    HEO ĐẤT YÊU THƯƠNG
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    <strong>BIB miễn phí – yêu thương tự nguyện.</strong>
                    <br />
                    Khi tham gia giải chạy, mỗi bé sẽ tự tay gửi một phần yêu
                    thương của mình vào Heo Đất Trung Thu Cho Em.
                  </p>
                  <p className="mt-2 text-sm font-semibold italic leading-6 text-amber-950">
                    Mỗi bước chạy – một phần yêu thương gửi đến bạn nhỏ Trà
                    Leng.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-amber-200 bg-white/60 p-5 md:border-l md:border-t-0">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 text-sm text-slate-700">
                <Heart className="mt-0.5 h-5 w-5 text-rose-600" />
                <div>
                  <strong className="block uppercase text-slate-900">
                    Cùng bé góp yêu thương
                  </strong>
                  <p className="mt-1 leading-6">
                    Sau khi hoàn thành giải chạy, những chú Heo Đất sẽ được mở
                    và kiểm đếm công khai, ghi nhận toàn bộ số tiền các bé đã
                    gửi tặng.
                  </p>
                </div>
                <Gift className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <strong className="block uppercase text-slate-900">
                    Trao gửi yêu thương
                  </strong>
                  <p className="mt-1 leading-6">
                    Toàn bộ số tiền quyên góp sẽ được đưa vào Quỹ Trung Thu Cho
                    Em, góp phần chuẩn bị những phần quà gửi đến các em nhỏ{" "}
                    <strong>Trà Leng</strong> vào ngày 12/09/2026.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {campaign.shirtStyles?.length > 0 && (
          <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <Shirt className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <h2 className="font-bold text-emerald-950">
                  ÁO TTCE KIDS — đăng ký thêm, không bắt buộc
                </h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  <strong>BIB hoàn toàn miễn phí.</strong> Phụ huynh có thể đăng
                  ký thêm áo TTCE Kids nếu có nhu cầu.
                </p>
              </div>
            </div>
          </section>
        )}
        <form onSubmit={submit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h2 className="text-xl font-bold">
                Thông tin phụ huynh/người giám hộ
              </h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Họ và tên phụ huynh"
                required
                value={form.guardianName}
                onChange={(v) => setForm({ ...form, guardianName: v })}
              />
              <Field
                label="Email nhận BIB"
                required
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="Số điện thoại liên hệ"
                required
                type="tel"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <Field
                label="Ghi chú"
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Baby className="h-5 w-5" />
                <h2 className="text-xl font-bold">Thông tin các bé</h2>
              </div>
              <button
                type="button"
                disabled={
                  children.length >=
                  Math.min(
                    campaign.maxChildrenPerApplication,
                    campaign.remainingBibCount,
                  )
                }
                onClick={() => setChildren([...children, emptyChild()])}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Thêm bé
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Nhập chính xác ngày sinh. Hệ thống sẽ tự phân nhóm tuổi và kiểm
              tra số BIB còn lại ngay khi bạn chọn ngày sinh.
            </p>
            {children.map((child, index) => {
              const childCategory = getCategoryForDate(child.dateOfBirth);
              const childAge = child.dateOfBirth
                ? new Date(campaign.eventDate).getUTCFullYear() -
                  Number(child.dateOfBirth.slice(0, 4))
                : null;
              return (
                <article
                  key={child.key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Bé {index + 1}</h3>
                    {children.length > 1 && (
                      <button
                        type="button"
                        title="Xóa bé"
                        onClick={() =>
                          setChildren(
                            children.filter((c) => c.key !== child.key),
                          )
                        }
                        className="p-2 text-red-600"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Họ và tên bé"
                      required
                      value={child.fullName}
                      onChange={(v) => updateChild(child.key, "fullName", v)}
                    />
                    <Field
                      label="Ngày tháng năm sinh"
                      required
                      type="date"
                      value={child.dateOfBirth}
                      onChange={(v) => updateChild(child.key, "dateOfBirth", v)}
                    />
                    <label className="text-sm font-medium">
                      Giới tính <span className="text-red-500">*</span>
                      <select
                        required
                        value={child.gender}
                        onChange={(e) =>
                          updateChild(child.key, "gender", e.target.value)
                        }
                        className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3"
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                    </label>
                    <Field
                      label="Trường/lớp hoặc CLB"
                      value={child.schoolClub}
                      onChange={(v) => updateChild(child.key, "schoolClub", v)}
                    />
                  </div>
                  {child.dateOfBirth &&
                    (childCategory ? (
                      <div
                        className={`mt-4 flex items-center justify-between gap-3 rounded-md border p-3 text-sm ${childCategory.remainingBibCount > 0 ? "border-blue-200 bg-blue-50 text-blue-900" : "border-red-200 bg-red-50 text-red-800"}`}
                      >
                        <span>
                          <strong>✓ {childCategory.name}</strong> · {childAge}{" "}
                          tuổi
                          {childCategory.distanceLabel
                            ? ` · ${childCategory.distanceLabel}`
                            : ""}
                          <span className="ml-1 text-xs opacity-80">
                            (tự động phân theo năm sinh)
                          </span>
                        </span>
                        <strong className="whitespace-nowrap">
                          {childCategory.remainingBibCount > 0
                            ? `Còn ${childCategory.remainingBibCount}/${childCategory.bibCapacity} BIB`
                            : "Đã đủ BIB"}
                        </strong>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <strong>
                          Độ tuổi của bé chưa phù hợp với chương trình.
                        </strong>{" "}
                        Mid-Autumn Kids Runs hiện mở đăng ký cho các bé thuộc
                        nhóm tuổi 3–12.
                      </div>
                    ))}
                  {childShirtOptions.length > 0 && (
                    <div className="mt-5 border-t pt-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <label className="block text-sm font-medium">
                          Áo TTCE Kids cho bé (không bắt buộc)
                          <select
                            value={child.shirtVariantId}
                            onChange={(e) =>
                              updateChild(
                                child.key,
                                "shirtVariantId",
                                e.target.value,
                              )
                            }
                            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                          >
                            <option value="">Không mua áo</option>
                            {childShirtOptions.map((option: any) => (
                              <option key={option.id} value={option.id}>
                                {option.label} - {money(option.price)}
                              </option>
                            ))}
                          </select>
                        </label>
                        {child.shirtVariantId && (
                          <button
                            type="button"
                            onClick={() =>
                              openShirtPreview(child.shirtVariantId)
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800"
                          >
                            <Shirt className="h-4 w-4" /> Xem mẫu & bảng size
                          </button>
                        )}
                      </div>
                      {child.shirtVariantId && (
                        <div className="mt-3 w-full rounded-md border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                          <strong>
                            Áo là sản phẩm mua thêm, không phải phí tham gia.
                          </strong>{" "}
                          Đăng ký chạy và BIB hoàn toàn miễn phí. Nhóm tuổi/BIB
                          được hệ thống xác định theo năm sinh; áo chỉ được ghi
                          nhận sản xuất sau khi BTC nhận thanh toán và gửi email
                          xác nhận.
                          <span className="ml-1 font-bold">
                            Tổng tiền áo đang chọn: {money(shirtTotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          {adultShirtOptions.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    Áo mua thêm cho phụ huynh/gia đình
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Có thể thêm nhiều loại áo, size và số lượng trong cùng hồ
                    sơ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAdditionalShirts((items) => [
                      ...items,
                      { key: uid(), variantId: "", quantity: 1 },
                    ])
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-700 px-4 text-sm font-semibold text-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  Thêm áo người lớn
                </button>
              </div>
              {additionalShirts.length > 0 && (
                <div className="mt-4 space-y-3">
                  {additionalShirts.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-wrap items-end gap-3 rounded-md bg-slate-50 p-3"
                    >
                      <label className="min-w-[240px] flex-1 text-sm font-medium">
                        Mẫu, loại và size
                        <select
                          value={item.variantId}
                          onChange={(e) =>
                            setAdditionalShirts((items) =>
                              items.map((current) =>
                                current.key === item.key
                                  ? { ...current, variantId: e.target.value }
                                  : current,
                              ),
                            )
                          }
                          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        >
                          <option value="">Chọn áo</option>
                          {adultShirtOptions.map((option: any) => (
                            <option key={option.id} value={option.id}>
                              {option.label} - {money(option.price)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="w-24 text-sm font-medium">
                        Số lượng
                        <select
                          value={item.quantity}
                          onChange={(e) =>
                            setAdditionalShirts((items) =>
                              items.map((current) =>
                                current.key === item.key
                                  ? {
                                      ...current,
                                      quantity: Number(e.target.value),
                                    }
                                  : current,
                              ),
                            )
                          }
                          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((quantity) => (
                            <option key={quantity} value={quantity}>
                              {quantity}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        title="Xóa áo"
                        onClick={() =>
                          setAdditionalShirts((items) =>
                            items.filter((current) => current.key !== item.key),
                          )
                        }
                        className="grid h-10 w-10 place-items-center rounded-md border border-red-200 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {additionalShirts.some((item) => item.variantId) && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      openShirtPreview(
                        adultShirtOptions.find((option: any) =>
                          additionalShirts.some(
                            (item) => item.variantId === option.id,
                          ),
                        )?.id,
                      )
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800"
                  >
                    <Shirt className="h-4 w-4" />
                    Xem mẫu & bảng size
                  </button>
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                    <strong>Đăng ký áo là tự nguyện.</strong> Áo chỉ được ghi
                    nhận sau khi BTC nhận thanh toán và gửi email xác nhận thành
                    công.
                    <div className="mt-1 font-bold">
                      Tiền áo người lớn: {money(additionalShirtTotal)}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {shirtTotal > 0 && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-emerald-950">
                    Tóm tắt áo đã chọn
                  </h2>
                  <p className="mt-1 text-sm text-emerald-800">
                    BIB vẫn miễn phí; số tiền dưới đây chỉ là tiền áo mua thêm.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Tiền áo
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-950">
                    {money(shirtTotal)}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">
              Điều khoản & xác nhận của phụ huynh
            </h2>
            <button
              type="button"
              onClick={() => {
                setWaiverOpen(true);
                setWaiverViewed(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-blue-600 px-4 py-2 font-semibold text-blue-700"
            >
              <ChevronDown className="h-4 w-4" />
              Bấm vào để xem điều khoản
            </button>
            {/* <label
              className={`mt-4 flex gap-3 rounded-md border p-4 ${!waiverViewed ? "cursor-not-allowed bg-slate-100 text-slate-400" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                disabled={!waiverViewed}
                checked={form.waiverAccepted}
                onChange={(e) =>
                  setForm({ ...form, waiverAccepted: e.target.checked })
                }
                className="mt-1 h-4 w-4"
              />
              <span>
                Tôi là phụ huynh/người giám hộ, đã đọc và đồng ý điều khoản tham
                gia cho tất cả các bé trong hồ sơ.
              </span>
            </label>
            <label className="mt-3 flex cursor-pointer gap-3 rounded-md border p-4">
              <input
                type="checkbox"
                checked={form.mediaConsent}
                onChange={(e) =>
                  setForm({ ...form, mediaConsent: e.target.checked })
                }
                className="mt-1 h-4 w-4"
              />
              <span>
                Tôi đồng ý để BTC sử dụng hình ảnh/video của chương trình cho
                mục đích truyền thông.
              </span>
            </label> */}
          </section>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}
          <button
            disabled={!registrationReady || submitting}
            className="sticky bottom-3 z-20 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-4 border-white bg-emerald-700 px-5 font-bold text-white shadow-xl transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:static sm:border-0 sm:shadow-sm"
          >
            {submitting ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang thực hiện...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Đăng ký BIB miễn phí
              </>
            )}
          </button>
        </form>
      </div>

      {shirtPreviewOpen &&
        (() => {
          const style = campaign.shirtStyles?.[shirtPreviewIndex];
          if (!style) return null;
          const previewImage =
            shirtPreviewView === "front"
              ? style.frontImageUrl
              : shirtPreviewView === "back"
                ? style.backImageUrl
                : style.sizeGuideImageUrl;
          return (
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 sm:p-6"
              onClick={() => setShirtPreviewOpen(false)}
            >
              <div
                className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
                  <div>
                    <h2 className="text-lg font-bold">Mẫu áo và bảng size</h2>
                    <p className="text-sm text-slate-500">{style.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShirtPreviewOpen(false)}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  >
                    Đóng
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 border-b bg-slate-50 px-5 py-3">
                  {(campaign.shirtStyles || []).map(
                    (item: any, index: number) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShirtPreviewIndex(index);
                          setShirtPreviewView("front");
                        }}
                        className={
                          index === shirtPreviewIndex
                            ? "rounded-full bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white"
                            : "rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                        }
                      >
                        {item.name}
                      </button>
                    ),
                  )}
                </div>
                <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-h-[55vh] rounded-xl bg-slate-100 p-3">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={`Xem ${style.name}`}
                        className="h-full max-h-[68vh] min-h-[50vh] w-full object-contain"
                      />
                    ) : (
                      <div className="grid h-full min-h-[50vh] place-items-center text-slate-400">
                        Chưa có hình ảnh
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {[
                      ["front", "Mặt trước"],
                      ["back", "Mặt sau"],
                      ["size", "Bảng size"],
                    ].map(([view, label]) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() =>
                          setShirtPreviewView(view as typeof shirtPreviewView)
                        }
                        className={
                          shirtPreviewView === view
                            ? "w-full rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-800"
                            : "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700"
                        }
                      >
                        {label}
                      </button>
                    ))}
                    <div className="mt-5 rounded-xl border bg-white p-4 text-sm">
                      <p className="font-bold">{style.name}</p>
                      <p className="mt-1 text-slate-500">
                        {style.category === "MALE"
                          ? "Nam"
                          : style.category === "FEMALE"
                            ? "Nữ"
                            : "Trẻ em"}{" "}
                        ·{" "}
                        {style.type === "SHORT_SLEEVE" ? "T-shirt" : "Singlet"}
                      </p>
                      <p className="mt-3">
                        <strong>Size:</strong>{" "}
                        {style.variants
                          ?.map((variant: any) => variant.size)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      {waiverOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setWaiverOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-bold">{campaign.waiver?.title}</h2>
              <button
                type="button"
                onClick={() => setWaiverOpen(false)}
                className="rounded-md border px-3 py-1"
              >
                Đóng
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto whitespace-pre-line p-5 leading-7">
              {campaign.waiver?.content}
            </div>
            <div className="border-t p-4">
              <button
                type="button"
                onClick={() => {
                  setWaiverViewed(true);
                  setForm((current) => ({
                    ...current,
                    waiverAccepted: true,
                  }));
                  setWaiverOpen(false);
                }}
                className="w-full rounded-md bg-emerald-700 py-3 font-bold text-white"
              >
                Tôi đã đọc điều khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {label} {required && <span className="text-red-500">*</span>}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}
