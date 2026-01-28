"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, X, Users } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface AssignedUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function EventUserManager({ eventId }: { eventId: string }) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all available users
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(usersData.users || []);
      }

      // Load assigned users for this event
      const assignedRes = await fetch(`/api/admin/events/${eventId}/users`);
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json();
        setAssignedUsers(assignedData.users || []);
      }
    } catch (error) {
      console.error("Load error:", error);
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId) {
      toast.error("Vui lòng chọn người dùng");
      return;
    }

    // Check if already assigned
    if (assignedUsers.find((u) => u.id === selectedUserId)) {
      toast.error("Người dùng này đã được gán");
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [selectedUserId],
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success("Đã gán người dùng thành công");
        setSelectedUserId("");
        loadData(); // Reload to update list
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể gán người dùng");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Xóa người dùng này khỏi sự kiện?")) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/users?userId=${userId}`,
        {
          method: "DELETE",
        },
      );

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success("Đã xóa người dùng");
        loadData();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể xóa người dùng");
    }
  };

  // Get users that haven't been assigned yet
  const availableUsers = allUsers.filter(
    (user) => !assignedUsers.find((assigned) => assigned.id === user.id),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Quản lý quyền truy cập
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assign New User */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Select
              label="Chọn người dùng để gán"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Chọn người dùng --</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} ({user.role})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAssignUser}
              disabled={!selectedUserId || assigning}
              isLoading={assigning}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Gán quyền
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Lưu ý:</strong> Người dùng được gán sẽ có quyền xem và
            quản lý sự kiện này. Chủ sự kiện (creator) luôn có quyền truy cập.
          </p>
        </div>

        {/* Assigned Users List */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">
            Người dùng đã được gán ({assignedUsers.length})
          </h3>

          {assignedUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              Chưa có người dùng nào được gán
            </div>
          ) : (
            <div className="space-y-2">
              {assignedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.name || "Chưa đặt tên"}
                      </div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-red-100 text-red-700"
                          : user.role === "ORGANIZER"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role === "ADMIN"
                        ? "Admin"
                        : user.role === "ORGANIZER"
                          ? "Organizer"
                          : "Member"}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role Legend */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 text-sm">
            Phân quyền:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="font-medium text-red-700">🔴 Admin:</span>
              <span className="text-gray-600 ml-1">
                Toàn quyền quản lý hệ thống
              </span>
            </div>
            <div>
              <span className="font-medium text-green-700">🟢 Organizer:</span>
              <span className="text-gray-600 ml-1">
                Quản lý sự kiện được gán
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">⚪ Member:</span>
              <span className="text-gray-600 ml-1">Xem thông tin cơ bản</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
