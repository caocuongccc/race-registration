// components/EventActionsMenu.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  MoreVertical,
  Eye,
  Edit,
} from "lucide-react";

interface EventActionsMenuProps {
  event: {
    id: string;
    slug: string;
    allowRegistration: boolean;
    status: string;
  };
  onUpdate: () => void;
}

export function EventActionsMenu({ event, onUpdate }: EventActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleRegistration = async (enable: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/events/${event.id}/toggle-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allowRegistration: enable }),
        }
      );

      const result = await res.json();

      if (result.success) {
        toast.success(enable ? "✅ Đã mở đăng ký" : "🔒 Đã đóng đăng ký");
        onUpdate();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể cập nhật");
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/change-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("✅ Đã cập nhật trạng thái");
        onUpdate();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể cập nhật");
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Quick Actions - Always Visible */}
      <div className="flex items-center gap-2">
        {/* Registration Toggle */}
        {event.allowRegistration ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleRegistration(false)}
            disabled={loading}
            className="text-red-600 hover:bg-red-50"
          >
            <Lock className="w-4 h-4 mr-2" />
            Đóng ĐK
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleRegistration(true)}
            disabled={loading}
            className="text-green-600 hover:bg-green-50"
          >
            <Unlock className="w-4 h-4 mr-2" />
            Mở ĐK
          </Button>
        )}

        {/* View Event */}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            window.open(`/events/${event.slug}/register`, "_blank")
          }
        >
          <Eye className="w-4 h-4 mr-2" />
          Xem
        </Button>

        {/* Edit Event */}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            (window.location.href = `/admin/dashboard/events/${event.id}/edit`)
          }
        >
          <Edit className="w-4 h-4 mr-2" />
          Sửa
        </Button>

        {/* More Actions Dropdown */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2">
                    Thay đổi trạng thái
                  </div>

                  <button
                    onClick={() => handleChangeStatus("PUBLISHED")}
                    disabled={loading || event.status === "PUBLISHED"}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2 text-blue-600" />
                    Đã công bố
                  </button>

                  <button
                    onClick={() => handleChangeStatus("REGISTRATION_OPEN")}
                    disabled={loading || event.status === "REGISTRATION_OPEN"}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Unlock className="w-4 h-4 inline mr-2 text-green-600" />
                    Đang mở đăng ký
                  </button>

                  <button
                    onClick={() => handleChangeStatus("REGISTRATION_CLOSED")}
                    disabled={loading || event.status === "REGISTRATION_CLOSED"}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 inline mr-2 text-orange-600" />
                    Đóng đăng ký
                  </button>

                  <button
                    onClick={() => handleChangeStatus("COMPLETED")}
                    disabled={loading || event.status === "COMPLETED"}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2 text-purple-600" />
                    Hoàn thành
                  </button>

                  <button
                    onClick={() => handleChangeStatus("CANCELLED")}
                    disabled={loading || event.status === "CANCELLED"}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 disabled:opacity-50 text-red-600"
                  >
                    <XCircle className="w-4 h-4 inline mr-2" />
                    Hủy bỏ
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
