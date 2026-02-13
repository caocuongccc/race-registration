"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  Shirt,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function BatchCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;

  const [batch, setBatch] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatch();
  }, [batchId]);

  async function fetchBatch() {
    try {
      setLoading(true);
      const res = await fetch(`/api/mobile/batch/${batchId}`);
      const data = await res.json();

      setBatch(data.batch);
      setRegistrations(data.registrations);
      setStats(data.stats);
    } catch (error) {
      console.error("Fetch batch error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Batch not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/mobile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Batch Check-in</h1>
        </div>

        {/* Batch Info */}
        <Card className="mb-4 border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">📦 {batch.fileName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">Số BIB</p>
                <p className="font-bold text-blue-900">
                  {batch.bibRangeStart} - {batch.bibRangeEnd}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng áo</p>
                <p className="font-bold text-blue-900 flex items-center gap-1">
                  <Shirt className="w-4 h-4" />
                  {batch.totalShirts} cái
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-600">Tổng</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">
                {stats.collected}
              </p>
              <p className="text-xs text-gray-600">Đã nhận</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-600">
                {stats.pending}
              </p>
              <p className="text-xs text-gray-600">Chờ nhận</p>
            </CardContent>
          </Card>
        </div>

        {/* Registration List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Danh sách VĐV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  className={`p-3 rounded-lg border-2 ${
                    reg.racePackCollected
                      ? "bg-green-50 border-green-300"
                      : "bg-white border-gray-200"
                  }`}
                  onClick={() => {
                    if (!reg.racePackCollected) {
                      router.push(`/mobile/confirm/${reg.id}`);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-blue-600 text-lg">
                        {reg.bibNumber}
                      </div>
                      <div>
                        <p className="font-medium">{reg.fullName}</p>
                        <p className="text-sm text-gray-600">
                          {reg.distance.name}
                          {reg.shirtSize && ` • Áo ${reg.shirtSize}`}
                        </p>
                      </div>
                    </div>

                    {reg.racePackCollected ? (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đã nhận
                      </Badge>
                    ) : (
                      <Button size="sm">Check-in</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
