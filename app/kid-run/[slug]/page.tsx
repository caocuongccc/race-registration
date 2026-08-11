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
  Minus,
  PiggyBank,
  Plus,
  QrCode,
  Shirt,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { KID_RUN_SCHOOL_CLUB_OPTIONS } from "@/lib/kid-run-school-club-options";

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
  shirtQuantity: 1,
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
          styleName: style.name,
          size: variant.size,
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
        ?.price || 0) *
        child.shirtQuantity,
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

  const activeBirthYears = (campaign?.categories || [])
    .filter((category: any) => category.name !== "__UNASSIGNED__")
    .flatMap((category: any) => [category.minBirthYear, category.maxBirthYear]);
  const minimumBirthYear = Math.min(...activeBirthYears);
  const maximumBirthYear = Math.max(...activeBirthYears);
  const minimumBirthDate = Number.isFinite(minimumBirthYear)
    ? `${minimumBirthYear}-01-01`
    : undefined;
  const maximumBirthDate = Number.isFinite(maximumBirthYear)
    ? `${maximumBirthYear}-12-31`
    : undefined;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const phoneValid = /^0\d{9}$/.test(form.phone.replace(/\D/g, ""));
  const requiredFormStarted =
    Boolean(form.guardianName.trim() || form.email.trim() || form.phone.trim()) ||
    children.some((child) =>
      Boolean(child.fullName.trim() || child.dateOfBirth || child.gender),
    );

  const requiredInformationComplete =
    form.guardianName.trim().length > 0 &&
    emailValid &&
    phoneValid &&
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

  const updateChild = (key: string, field: string, value: string | number) =>
    setChildren((current) =>
      current.map((child) =>
        child.key === key ? { ...child, [field]: value } : child,
      ),
    );
  const changeChildShirtQuantity = (
    childKey: string,
    variantId: string,
    delta: number,
  ) =>
    setChildren((current) =>
      current.map((child) => {
        if (child.key !== childKey) return child;
        const currentQuantity =
          child.shirtVariantId === variantId ? child.shirtQuantity : 0;
        const nextQuantity = Math.max(0, Math.min(5, currentQuantity + delta));
        return {
          ...child,
          shirtVariantId: nextQuantity > 0 ? variantId : "",
          shirtQuantity: nextQuantity > 0 ? nextQuantity : 1,
        };
      }),
    );

  const getAdditionalShirtQuantity = (variantId: string) =>
    additionalShirts.find((item) => item.variantId === variantId)?.quantity ||
    0;

  const changeAdditionalShirtQuantity = (variantId: string, delta: number) =>
    setAdditionalShirts((current) => {
      const quantity =
        current.find((item) => item.variantId === variantId)?.quantity || 0;
      const nextQuantity = Math.max(0, Math.min(10, quantity + delta));
      if (nextQuantity === 0) {
        return current.filter((item) => item.variantId !== variantId);
      }
      if (quantity === 0) {
        return [...current, { key: uid(), variantId, quantity: nextQuantity }];
      }
      return current.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: nextQuantity }
          : item,
      );
    });

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
        <section className="mx-auto max-w-4xl rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <header className="rounded-2xl bg-emerald-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold text-emerald-950">
                  Đăng ký chạy thành công
                </h1>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  Thông tin BIB đã được cấp và gửi tới email đăng ký. Vui lòng
                  lưu ảnh BIB và QR nhận BIB bên dưới.
                </p>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 rounded-xl bg-white p-4 text-sm shadow-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Phụ huynh/người giám hộ</dt>
                <dd className="mt-0.5 font-bold text-slate-900">
                  {result.application.guardianName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Số điện thoại</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {result.application.phone}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Email nhận thông tin</dt>
                <dd className="mt-0.5 break-all font-semibold text-slate-900">
                  {result.application.email}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Mua kèm áo</dt>
                <dd
                  className={`mt-0.5 font-bold ${
                    result.application.shirtTotalAmount > 0
                      ? "text-emerald-700"
                      : "text-slate-700"
                  }`}
                >
                  {result.application.shirtTotalAmount > 0 ? "Có" : "Không"}
                </dd>
              </div>
            </dl>
          </header>

          <section className="mt-6">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Ảnh BIB của các bé
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tải và lưu ảnh tương ứng với từng bé.
              </p>
            </div>
            <div className="space-y-4">
              {result.application.participants.map((participant: any) => (
                <article
                  key={participant.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
                >
                  {result.bibImageDataUrls?.[participant.id] ? (
                    <>
                      <img
                        src={result.bibImageDataUrls[participant.id]}
                        alt={`BIB ${participant.bibNumber} - ${participant.fullName}`}
                        className="w-full rounded-xl border border-slate-200 bg-white"
                      />
                      <div className="flex justify-center py-3">
                        <a
                          href={result.bibImageDataUrls[participant.id]}
                          download={`BIB-${participant.bibNumber}.png`}
                          className="inline-flex min-h-10 items-center justify-center rounded-full bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"
                        >
                          Tải ảnh BIB
                        </a>
                      </div>
                    </>
                  ) : (
                    <p className="p-4 text-center text-sm text-slate-500">
                      Ảnh BIB đang được xử lý. Số BIB: {participant.bibNumber}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-bold text-slate-900">Danh sách các bé</h2>
            </div>
            <div>
              <table className="w-full table-fixed text-left text-xs sm:text-sm">
                <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
                  <tr>
                    <th className="w-[28%] px-2 py-3 sm:px-4">Họ và tên</th>
                    <th className="w-[14%] px-2 py-3 sm:px-4">
                      Năm sinh / giới tính
                    </th>
                    <th className="w-[18%] px-2 py-3 sm:px-4">Nhóm tuổi</th>
                    <th className="w-[22%] px-2 py-3 sm:px-4">Trường/CLB</th>
                    <th className="w-[18%] px-2 py-3 text-right sm:px-4">
                      Số BIB
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {result.application.participants.map((participant: any) => (
                    <tr key={participant.id} className="hover:bg-slate-50">
                      <td className="break-words px-2 py-3 font-semibold text-slate-900 sm:px-4">
                        {participant.fullName}
                      </td>
                      <td className="break-words px-2 py-3 text-slate-600 sm:px-4">
                        <div>{participant.birthYear}</div>
                        <div className="mt-0.5 text-[11px] sm:text-xs">
                          {participant.gender === "MALE"
                            ? "Nam"
                            : participant.gender === "FEMALE"
                              ? "Nữ"
                              : "—"}
                        </div>
                      </td>
                      <td className="break-words px-2 py-3 text-slate-600 sm:px-4">
                        {participant.category.name}
                      </td>
                      <td className="break-words px-2 py-3 text-slate-600 sm:px-4">
                        {participant.schoolClub || "—"}
                      </td>
                      <td className="px-2 py-3 text-right text-base font-extrabold text-blue-700 sm:px-4 sm:text-lg">
                        {participant.bibNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {result.bibQrCodeDataUrl && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="font-bold text-emerald-900">QR nhận BIB</div>
              <img
                src={result.bibQrCodeDataUrl}
                alt="QR nhận BIB"
                className="mx-auto mt-3 w-64 max-w-full border bg-white"
              />
              <p className="mt-2 text-sm text-emerald-800">
                Xuất trình mã QR này để nhận toàn bộ BIB của gia đình.
              </p>
            </div>
          )}
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
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
            {new Date(campaign.eventDate)
              .toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "UTC",
              })
              .replace(/^0/, "")}{" "}
            ngày{" "}
            {new Date(campaign.eventDate).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            })}{" "}
            - {campaign.location}
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
                invalid={requiredFormStarted && !form.guardianName.trim()}
                error={
                  requiredFormStarted && !form.guardianName.trim()
                    ? "Vui lòng nhập thông tin."
                    : undefined
                }
                value={form.guardianName}
                onChange={(v) => setForm({ ...form, guardianName: v })}
              />
              <Field
                label="Email nhận BIB"
                required
                type="email"
                invalid={requiredFormStarted && !emailValid}
                error={
                  requiredFormStarted && !form.email.trim()
                    ? "Vui lòng nhập thông tin."
                    : Boolean(form.email.trim()) && !emailValid
                      ? "Định dạng email chưa đúng. Vui lòng kiểm tra lại."
                      : undefined
                }
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="Số điện thoại liên hệ"
                required
                type="tel"
                invalid={requiredFormStarted && !phoneValid}
                error={
                  requiredFormStarted && !form.phone.trim()
                    ? "Vui lòng nhập thông tin."
                    : Boolean(form.phone.trim()) && !phoneValid
                      ? "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0"
                      : undefined
                }
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <Field
                label="Ghi chú"
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
              />
            </div>

            {campaign.shirtStyles?.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shirt className="h-5 w-5 text-emerald-700" />
                      <h3 className="font-bold text-slate-900">
                        Đăng ký thêm áo TTCE
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Không bắt buộc. Chọn mẫu/size rồi chọn số lượng cần mua.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openShirtPreview()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 text-sm font-semibold text-emerald-800"
                  >
                    <Shirt className="h-4 w-4" />
                    Xem mẫu & bảng size
                  </button>
                </div>

                {childShirtOptions.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Áo cho bé
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Mỗi bé chọn một size; dùng nút +/− để chỉnh số lượng.
                      </p>
                    </div>
                    {children.map((child, index) => (
                      <article
                        key={`shirt-${child.key}`}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* <strong className="text-sm text-slate-900">
                            {child.fullName.trim() || `Bé ${index + 1}`}
                          </strong> */}
                          {child.shirtVariantId && (
                            <span className="text-xs font-semibold text-emerald-700">
                              {money(
                                (childShirtOptions.find(
                                  (option: any) =>
                                    option.id === child.shirtVariantId,
                                )?.price || 0) * child.shirtQuantity,
                              )}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {childShirtOptions.map((option: any) => {
                            const quantity =
                              child.shirtVariantId === option.id
                                ? child.shirtQuantity
                                : 0;
                            return (
                              <div
                                key={option.id}
                                className={`flex min-h-14 items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${quantity > 0 ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                              >
                                <div className="min-w-0">
                                  <span className="block text-sm font-semibold text-slate-900">
                                    Size {option.size}
                                  </span>
                                  <span className="block truncate text-[11px] text-slate-500">
                                    {option.styleName} · {money(option.price)}
                                  </span>
                                </div>
                                <div className="flex h-9 shrink-0 items-center rounded-md border border-slate-300 bg-white shadow-sm">
                                  <button
                                    type="button"
                                    aria-label={`Giảm size ${option.size}`}
                                    disabled={quantity === 0}
                                    onClick={() =>
                                      changeChildShirtQuantity(
                                        child.key,
                                        option.id,
                                        -1,
                                      )
                                    }
                                    className="grid h-full w-8 place-items-center text-slate-600 disabled:opacity-30"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-7 text-center text-sm font-bold">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Tăng size ${option.size}`}
                                    disabled={quantity >= 5}
                                    onClick={() =>
                                      changeChildShirtQuantity(
                                        child.key,
                                        option.id,
                                        1,
                                      )
                                    }
                                    className="grid h-full w-8 place-items-center text-slate-600 disabled:opacity-30"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {adultShirtOptions.length > 0 && (
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Áo cho phụ huynh/gia đình
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Có thể chọn nhiều mẫu và size.
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {adultShirtOptions.map((option: any) => {
                        const quantity = getAdditionalShirtQuantity(option.id);
                        return (
                          <div
                            key={option.id}
                            className={`flex min-h-14 items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${quantity > 0 ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                          >
                            <div className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900">
                                Size {option.size}
                              </span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {option.styleName} · {money(option.price)}
                              </span>
                            </div>
                            <div className="flex h-9 shrink-0 items-center rounded-md border border-slate-300 bg-white shadow-sm">
                              <button
                                type="button"
                                aria-label={`Giảm size ${option.size}`}
                                disabled={quantity === 0}
                                onClick={() =>
                                  changeAdditionalShirtQuantity(option.id, -1)
                                }
                                className="grid h-full w-8 place-items-center text-slate-600 disabled:opacity-30"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-7 text-center text-sm font-bold">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={`Tăng size ${option.size}`}
                                disabled={quantity >= 10}
                                onClick={() =>
                                  changeAdditionalShirtQuantity(option.id, 1)
                                }
                                className="grid h-full w-8 place-items-center text-slate-600 disabled:opacity-30"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {shirtTotal > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <span className="text-sm text-emerald-900">
                      BIB vẫn hoàn toàn miễn phí; đây chỉ là tiền áo mua thêm.
                    </span>
                    <strong className="text-xl text-emerald-950">
                      {money(shirtTotal)}
                    </strong>
                  </div>
                )}
              </div>
            )}
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
                      invalid={requiredFormStarted && !child.fullName.trim()}
                      error={
                        requiredFormStarted && !child.fullName.trim()
                          ? "Vui lòng nhập thông tin."
                          : undefined
                      }
                      value={child.fullName}
                      onChange={(v) => updateChild(child.key, "fullName", v)}
                    />
                    <Field
                      label="Ngày tháng năm sinh"
                      required
                      type="date"
                      min={minimumBirthDate}
                      max={maximumBirthDate}
                      pickerOnlyOnMobile
                      invalid={
                        requiredFormStarted &&
                        !getCategoryForDate(child.dateOfBirth)
                      }
                      error={
                        requiredFormStarted && !child.dateOfBirth
                          ? "Vui lòng nhập thông tin."
                          : undefined
                      }
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
                        className={`mt-1 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 ${requiredFormStarted && !child.gender ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"}`}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                      {requiredFormStarted && !child.gender && (
                        <span className="mt-1 block text-xs text-red-600">
                          Vui lòng nhập thông tin.
                        </span>
                      )}
                    </label>
                    <label className="text-sm font-medium">
                      Trường/lớp hoặc CLB
                      <input
                        list="kid-run-school-club-options"
                        value={child.schoolClub}
                        onChange={(event) =>
                          updateChild(
                            child.key,
                            "schoolClub",
                            event.target.value,
                          )
                        }
                        placeholder="Chọn hoặc nhập tên trường/CLB"
                        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
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
                        nhóm tuổi 5–12.
                      </div>
                    ))}
                </article>
              );
            })}
          </section>

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
          {!registrationReady && campaign?.isOpen && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
              role="status"
              aria-live="polite"
            >
              <div className="font-bold">Cần hoàn tất trước khi đăng ký:</div>
              {!requiredInformationComplete && (
                <div>
                  • Nhập đầy đủ các thông tin bắt buộc của phụ huynh và của bé.
                </div>
              )}
              {(!waiverViewed || !form.waiverAccepted) && (
                <div>
                  • Bấm “Đọc điều khoản”, đọc nội dung và chọn đồng ý ở cuối cửa
                  sổ.
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <datalist id="kid-run-school-club-options">
        {KID_RUN_SCHOOL_CLUB_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      {submitting && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-5 backdrop-blur-sm"
          role="status"
          aria-live="assertive"
          aria-label="Hệ thống đang xử lý đăng ký"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
            <h2 className="mt-5 text-xl font-extrabold text-slate-900">
              Đang xử lý đăng ký
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hệ thống đang kiểm tra nhóm tuổi, cấp số BIB và chuẩn bị email xác
              nhận.
            </p>
            <p className="mt-3 text-xs font-semibold text-emerald-700">
              Vui lòng không đóng hoặc tải lại trang.
            </p>
          </div>
        </div>
      )}
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
                Tôi đã đọc điều khoản và đồng ý với tất cả các điều khoản trên.
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
  min,
  max,
  pickerOnlyOnMobile = false,
  invalid = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  pickerOnlyOnMobile?: boolean;
  invalid?: boolean;
  error?: string;
}) {
  const isMobilePointer = () =>
    pickerOnlyOnMobile && window.matchMedia("(pointer: coarse)").matches;
  const openDatePicker = (input: HTMLInputElement) => {
    if (!isMobilePointer()) return;
    input.showPicker?.();
  };

  return (
    <label className="text-sm font-medium">
      {label} {required && <span className="text-red-500">*</span>}
      <input
        type={type}
        required={required}
        min={min}
        max={max}
        inputMode={pickerOnlyOnMobile ? "none" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => openDatePicker(e.currentTarget)}
        onKeyDown={(e) => {
          if (isMobilePointer() && e.key !== "Tab") e.preventDefault();
        }}
        onPaste={(e) => {
          if (isMobilePointer()) e.preventDefault();
        }}
        aria-invalid={invalid}
        className={`mt-1 h-11 w-full rounded-md border px-3 outline-none focus:ring-2 ${invalid ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
