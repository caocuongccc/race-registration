"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, X, Users, Edit2 } from "lucide-react";

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
  role: string; // User system role
  eventUserRole: string; // EventUser role (ADMIN, EDITOR, VIEWER)
  eventUserId: string; // For deletion
}

export default function EventUserManager({ eventId }: { eventId: string }) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("VIEWER");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

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

  const handleAssignUsers = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một người dùng");
      return;
    }

    // Check if any user is already assigned
    const alreadyAssigned = selectedUserIds.filter((userId) =>
      assignedUsers.find((u) => u.id === userId),
    );

    if (alreadyAssigned.length > 0) {
      toast.error("Một số người dùng đã được gán trước đó");
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUserIds,
          role: selectedRole,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success(
          `Đã gán ${selectedUserIds.length} người dùng thành công với quyền ${selectedRole}`,
        );
        setSelectedUserIds([]);
        setSelectedRole("VIEWER");
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

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success("Đã cập nhật quyền thành công");
        setEditingUserId(null);
        loadData();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể cập nhật quyền");
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
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
        {/* Assign New Users */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">
            Gán người dùng mới ({selectedUserIds.length} đã chọn)
          </h3>

          {/* Multi-select user list */}
          <div className="border rounded-lg max-h-60 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Không còn người dùng nào để gán
              </div>
            ) : (
              availableUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {user.name || "Chưa đặt tên"}
                    </div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-red-100 text-red-700"
                        : user.role === "ORGANIZER"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </label>
              ))
            )}
          </div>

          {/* Role selection and assign button */}
          <div className="flex gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            >
              <option value="VIEWER">Viewer - Chỉ xem</option>
              <option value="EDITOR">Editor - Chỉnh sửa</option>
              <option value="ADMIN">Admin - Quản trị</option>
            </select>

            <Button
              onClick={handleAssignUsers}
              disabled={selectedUserIds.length === 0 || assigning}
              isLoading={assigning}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Gán {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Lưu ý:</strong> Bạn có thể chọn nhiều người dùng cùng
            lúc. Người dùng được gán sẽ có quyền truy cập theo cấp độ được chọn
            (Viewer/Editor/Admin).
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
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {user.name || "Chưa đặt tên"}
                      </div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* System role badge */}
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-red-100 text-red-700"
                          : user.role === "ORGANIZER"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>

                    {/* Event permission - editable */}
                    {editingUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue={user.eventUserRole}
                          onChange={(e) =>
                            handleUpdateRole(user.id, e.target.value)
                          }
                          className="border rounded px-2 py-1 text-sm"
                          autoFocus
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUserId(null)}
                        >
                          Hủy
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.eventUserRole === "ADMIN"
                              ? "bg-purple-100 text-purple-700"
                              : user.eventUserRole === "EDITOR"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {user.eventUserRole}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUserId(user.id)}
                          className="p-1"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Remove button */}
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
            Phân quyền trên sự kiện:
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-medium text-purple-700 min-w-16">
                🟣 ADMIN:
              </span>
              <span className="text-gray-600">
                Toàn quyền quản lý sự kiện này (tạo/sửa/xóa, quản lý users)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-700 min-w-16">
                🔵 EDITOR:
              </span>
              <span className="text-gray-600">
                Chỉnh sửa thông tin sự kiện, quản lý đăng ký
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-700 min-w-16">
                ⚪ VIEWER:
              </span>
              <span className="text-gray-600">
                Chỉ xem thông tin sự kiện và đăng ký
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
