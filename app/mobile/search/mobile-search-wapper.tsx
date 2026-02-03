// app/mobile/search/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  bibNumber: string | null;
  fullName: string;
  email: string;
  phone: string;
  distance: {
    name: string;
  };
  paymentStatus: string;
  racePackCollected: boolean;
  racePackCollectedAt: Date | null;
}

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast.error("Vui lòng nhập BIB hoặc tên");
      return;
    }

    try {
      setSearching(true);
      setSearched(false);

      const res = await fetch(
        `/api/mobile/search?q=${encodeURIComponent(searchQuery)}`,
      );

      if (!res.ok) {
        throw new Error("Search failed");
      }

      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);

      if (data.results.length === 0) {
        toast.info("Không tìm thấy kết quả");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Có lỗi xảy ra khi tìm kiếm");
    } finally {
      setSearching(false);
    }
  }

  function handleSelectResult(registrationId: string) {
    router.push(`/mobile/confirm/${registrationId}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/mobile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Tìm kiếm Runner</h1>
        </div>

        {/* Search Form */}
        <Card className="mb-4 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Tìm theo BIB hoặc Tên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Nhập số BIB hoặc tên runner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-base h-12"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  VD: "123" hoặc "Nguyen Van A"
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang tìm...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Tìm kiếm
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-yellow-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Không tìm thấy</p>
                      <p className="text-sm">
                        Không có runner nào với BIB/tên "{searchQuery}"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="text-sm text-gray-600 mb-2">
                  Tìm thấy {results.length} kết quả
                </div>

                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectResult(result.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-blue-600">
                              {result.bibNumber || "---"}
                            </span>
                            {result.racePackCollected && (
                              <Badge className="bg-green-600">✅ Đã nhận</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg">
                            {result.fullName}
                          </h3>
                        </div>

                        <Badge
                          variant={
                            result.paymentStatus === "PAID"
                              ? "default"
                              : "destructive"
                          }
                          className={
                            result.paymentStatus === "PAID"
                              ? "bg-green-600"
                              : ""
                          }
                        >
                          {result.paymentStatus === "PAID"
                            ? "Đã TT"
                            : "Chưa TT"}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{result.distance.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{result.phone}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{result.email}</span>
                        </div>
                      </div>

                      {result.racePackCollected &&
                        result.racePackCollectedAt && (
                          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                            Đã nhận lúc:{" "}
                            {new Date(
                              result.racePackCollectedAt,
                            ).toLocaleString("vi-VN")}
                          </div>
                        )}

                      <div className="mt-3 pt-3 border-t">
                        <Button
                          className="w-full"
                          variant={
                            result.racePackCollected ? "outline" : "primary"
                          }
                        >
                          {result.racePackCollected
                            ? "Xem chi tiết"
                            : "Xác nhận nhận race pack"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* Quick Tips */}
        {!searched && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                💡 Mẹo tìm kiếm
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Tìm theo số BIB: "123", "456"</li>
                <li>• Tìm theo tên: "Nguyen Van A"</li>
                <li>• Tìm theo email: "email@example.com"</li>
                <li>• Tìm theo số điện thoại: "0901234567"</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
