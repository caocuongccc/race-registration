// app/member/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Award,
  LogOut,
  Eye,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Registration {
  id: string;
  bibNumber: string | null;
  paymentStatus: string;
  totalAmount: number;
  registrationDate: Date;
  distance: {
    name: string;
  };
  event: {
    name: string;
    date: Date;
    location: string;
  };
}

export default function MemberPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      // Redirect admin/organizer to admin dashboard
      if (session.user.role === "ADMIN" || session.user.role === "ORGANIZER") {
        router.push("/admin/dashboard");
      } else {
        loadRegistrations();
      }
    }
  }, [status, session, router]);

  const loadRegistrations = async () => {
    try {
      const res = await fetch("/api/member/registrations");
      const data = await res.json();
      setRegistrations(data.registrations);
    } catch (error) {
      console.error("Failed to load registrations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">
                🏃 Trang Cá Nhân
              </h1>
              <p className="text-gray-600 mt-1">
                Xin chào, {session?.user?.name || session?.user?.email}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Lịch sử đăng ký của tôi
          </h2>
          <p className="text-gray-600 mt-1">
            Tổng: {registrations.length} đăng ký
          </p>
        </div>

        {registrations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Bạn chưa đăng ký giải chạy nào
              </p>
              <Button onClick={() => router.push("/")}>
                Xem các giải đang mở đăng ký
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registrations.map((reg) => (
              <Card key={reg.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{reg.event.name}</CardTitle>
                  {reg.bibNumber ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Award className="w-5 h-5 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-600">
                        {reg.bibNumber}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2 text-yellow-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Chờ thanh toán</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(reg.event.date)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{reg.event.location}</span>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Cự ly:</span>
                      <span className="font-medium">{reg.distance.name}</span>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Số tiền:</span>
                      <span className="font-medium">
                        {formatCurrency(reg.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Trạng thái:</span>
                      {reg.paymentStatus === "PAID" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Đã thanh toán
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                          <Clock className="w-3 h-3" />
                          Chờ thanh toán
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() =>
                      router.push(`/registrations/${reg.id}/payment`)
                    }
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Xem chi tiết
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
