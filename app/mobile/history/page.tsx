// app/mobile/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RadixSelect,
  RadixSelectContent,
  RadixSelectItem,
  RadixSelectTrigger,
  RadixSelectValue,
} from "@/components/ui/radix-select";
import {
  ArrowLeft,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { SelectItem } from "@radix-ui/react-select";

interface HistoryItem {
  id: string;
  bibNumber: string | null;
  fullName: string;
  distance: {
    name: string;
  };
  racePackCollectedAt: Date;
  racePackPhoto: string | null;
  racePackNotes: string | null;
  collectedBy: {
    name: string;
  } | null;
}

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Get eventId from URL params
  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [searchParams]);

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch history when event selected
  useEffect(() => {
    if (selectedEventId) {
      fetchHistory();
    }
  }, [selectedEventId]);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Fetch events error:", error);
    }
  }

  async function fetchHistory() {
    try {
      setLoading(true);
      const res = await fetch(`/api/mobile/history?eventId=${selectedEventId}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error("Fetch history error:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEventChange(eventId: string) {
    setSelectedEventId(eventId);
    // Update URL
    router.push(`/mobile/history?eventId=${eventId}`);
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
          <h1 className="text-xl font-bold text-gray-800">Lịch sử Check-in</h1>
        </div>

        {/* Event Selector */}
        <Card className="mb-4 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Chọn sự kiện</CardTitle>
          </CardHeader>
          <CardContent>
            <RadixSelect
              value={selectedEventId}
              onValueChange={handleEventChange}
            >
              <RadixSelectTrigger className="w-full">
                <RadixSelectValue placeholder="Chọn sự kiện" />
              </RadixSelectTrigger>
              <RadixSelectContent>
                {events.map((event) => (
                  <RadixSelectItem key={event.id} value={event.id}>
                    {event.name}
                  </RadixSelectItem>
                ))}
              </RadixSelectContent>
            </RadixSelect>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!loading && selectedEventId && history.length === 0 && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">
                Chưa có lịch sử check-in
              </p>
              <p className="text-sm text-gray-500">
                Chưa có runner nào nhận race pack cho sự kiện này
              </p>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        {!loading && history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Tổng: {history.length} lượt nhận
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchHistory()}
              >
                Làm mới
              </Button>
            </div>

            {history.map((item) => (
              <Card key={item.id} className="shadow-md">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {item.bibNumber || "---"}
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.fullName}</h3>
                        <p className="text-sm text-gray-500">
                          {item.distance.name}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Đã nhận
                    </Badge>
                  </div>

                  {/* Time & Collector */}
                  <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(item.racePackCollectedAt).toLocaleString(
                          "vi-VN",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>

                    {item.collectedBy && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>BTC: {item.collectedBy.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Photo */}
                  {item.racePackPhoto && (
                    <div className="mb-3">
                      <button
                        onClick={() => setSelectedImage(item.racePackPhoto)}
                        className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={item.racePackPhoto}
                          alt="Race pack photo"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Notes */}
                  {item.racePackNotes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <span className="font-semibold">Ghi chú: </span>
                          {item.racePackNotes}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-3xl w-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <span className="text-2xl">×</span> Đóng
              </button>
              <img
                src={selectedImage}
                alt="Race pack photo"
                className="w-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
