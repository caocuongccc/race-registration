// app/admin/dashboard/events/[id]/send-feedback-email/page.tsx
// Admin page to send post-event feedback emails

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Send, Users, CheckCircle, AlertCircle, Eye } from "lucide-react";

interface Event {
  id: string;
  name: string;
  date: Date;
}

interface RegistrationStats {
  total: number;
  withBib: number;
  paid: number;
  emailsSent: number;
  notSent: number;
}

export default function SendFeedbackEmailPage() {
  const params = useParams();
  const router = useRouter();

  const [eventId, setEventId] = useState<string>("");
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });

  // Options
  const [sendToAll, setSendToAll] = useState(true);
  const [onlyWithBib, setOnlyWithBib] = useState(true);
  const [onlyPaid, setOnlyPaid] = useState(true);

  useEffect(() => {
    if (params?.id) {
      setEventId(params.id as string);
    }
  }, [params]);

  useEffect(() => {
    if (eventId) {
      loadEventAndStats();
    }
  }, [eventId]);

  const loadEventAndStats = async () => {
    setLoading(true);
    try {
      // Load event
      const eventRes = await fetch(`/api/admin/events/${eventId}`);
      const eventData = await eventRes.json();
      setEvent(eventData.event);

      // Load stats
      const statsRes = await fetch(
        `/api/admin/events/${eventId}/feedback-email-stats`,
      );
      const statsData = await statsRes.json();
      setStats(statsData.stats);
    } catch (error) {
      toast.error("Không thể tải thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (!confirm(`Gửi email feedback cho ${stats?.notSent || 0} VĐV?`)) {
      return;
    }

    setSending(true);
    setSendProgress({ sent: 0, total: stats?.notSent || 0 });

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/send-feedback-emails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onlyWithBib,
            onlyPaid,
          }),
        },
      );

      const data = await res.json();

      if (data.success) {
        toast.success(`✅ Đã gửi ${data.sentCount} email thành công!`);
        loadEventAndStats(); // Reload stats
      } else {
        toast.error(data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Send emails error:", error);
      toast.error("Không thể gửi email");
    } finally {
      setSending(false);
    }
  };

  const handlePreview = () => {
    // Open preview in new tab
    window.open(
      `/api/admin/events/${eventId}/preview-feedback-email`,
      "_blank",
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          📧 Gửi Email Feedback
        </h1>
        <p className="text-gray-600 mt-1">
          Gửi link khảo sát đánh giá sự kiện cho VĐV
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Sự kiện: <strong>{event?.name}</strong>
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng VĐV</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.total || 0}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Có BIB</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats?.withBib || 0}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã gửi email</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.emailsSent || 0}
                </p>
              </div>
              <Mail className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chưa gửi</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.notSent || 0}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle>Tùy chọn gửi email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="onlyWithBib"
              checked={onlyWithBib}
              onCheckedChange={(checked) => setOnlyWithBib(checked as boolean)}
            />
            <label
              htmlFor="onlyWithBib"
              className="text-sm font-medium cursor-pointer"
            >
              Chỉ gửi cho VĐV đã có BIB number
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="onlyPaid"
              checked={onlyPaid}
              onCheckedChange={(checked) => setOnlyPaid(checked as boolean)}
            />
            <label
              htmlFor="onlyPaid"
              className="text-sm font-medium cursor-pointer"
            >
              Chỉ gửi cho VĐV đã thanh toán
            </label>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Sẽ gửi email cho:</strong>{" "}
              {onlyPaid && onlyWithBib
                ? `${stats?.notSent || 0} VĐV (có BIB + đã thanh toán + chưa nhận email)`
                : onlyPaid
                  ? `VĐV đã thanh toán`
                  : onlyWithBib
                    ? `VĐV có BIB`
                    : `Tất cả VĐV`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Nội dung email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              <strong>Tiêu đề:</strong> Đánh giá trải nghiệm - {event?.name}
            </p>
            <p className="text-sm text-gray-700 mb-3">
              <strong>Nội dung chính:</strong>
            </p>
            <div className="text-sm text-gray-600 space-y-2 pl-4">
              <p>Chào [Tên VĐV],</p>
              <p>
                Cảm ơn bạn đã tham gia {event?.name}! Chúng tôi rất mong nhận
                được phản hồi của bạn.
              </p>
              <p>
                Vui lòng dành 2 phút để hoàn thành khảo sát 5 câu hỏi về trải
                nghiệm của bạn:
              </p>
              <p className="font-medium text-blue-600">
                [Link cá nhân hóa cho từng VĐV]
              </p>
              <p>Trân trọng,</p>
              <p>Ban tổ chức {event?.name}</p>
            </div>
          </div>

          <Button onClick={handlePreview} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Xem preview email
          </Button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button
              onClick={handleSendEmails}
              disabled={sending || !stats?.notSent}
              size="lg"
              className="flex-1"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Đang gửi... ({sendProgress.sent}/{sendProgress.total})
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Gửi email cho {stats?.notSent || 0} VĐV
                </>
              )}
            </Button>

            <Button
              onClick={() => router.push(`/admin/dashboard/events/${eventId}`)}
              variant="outline"
            >
              Quay lại
            </Button>
          </div>

          {!stats?.notSent && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Tất cả VĐV đã nhận email feedback rồi
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Lưu ý
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800 space-y-2">
          <p>• Mỗi VĐV sẽ nhận link khảo sát cá nhân hóa (có token riêng)</p>
          <p>• Email chỉ gửi 1 lần cho mỗi VĐV (tránh spam)</p>
          <p>• VĐV click vào link → Điền form 5 câu hỏi → Submit</p>
          <p>• Feedback lưu vào database, xem được ở trang thống kê</p>
          <p>• Nên gửi email sau khi event kết thúc 1-2 ngày để VĐV còn nhớ</p>
        </CardContent>
      </Card>
    </div>
  );
}
