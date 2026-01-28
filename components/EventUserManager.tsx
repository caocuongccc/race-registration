"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Edit, Eye } from "lucide-react";

interface EventUserManagerProps {
  eventId: string;
}

export function EventUserManager({ eventId }: EventUserManagerProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("VIEWER");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const [usersRes, allUsersRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/users`),
        fetch("/api/admin/users"), // You'll need to create this
      ]);

      const usersData = await usersRes.json();
      const allUsersData = await allUsersRes.json();

      setUsers(usersData.users || []);
      setAllUsers(allUsersData.users || []);
    } catch (error) {
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) {
      toast.error("Vui lòng chọn người dùng");
      return;
    }

    try {
      const res = await fetch(`/api/admin/events/${eventId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Đã thêm người dùng");
        loadData();
        setSelectedUserId("");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Không thể thêm người dùng");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Xóa quyền truy cập của người dùng này?")) return;

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/users?userId=${userId}`,
        { method: "DELETE" }
      );

      const result = await res.json();

      if (result.success) {
        toast.success("Đã xóa người dùng");
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Không thể xóa người dùng");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-4 h-4 text-red-600" />;
      case "EDITOR":
        return <Edit className="w-4 h-4 text-blue-600" />;
      case "VIEWER":
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Quản trị";
      case "EDITOR":
        return "Chỉnh sửa";
      case "VIEWER":
        return "Xem";
      default:
        return role;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản lý quyền truy cập</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add User Form */}
        <div className="flex gap-3">
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1"
          >
            <option value="">-- Chọn người dùng --</option>
            {allUsers
              .filter((u) => !users.find((eu) => eu.user.id === u.id))
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
          </Select>

          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="VIEWER">Xem</option>
            <option value="EDITOR">Chỉnh sửa</option>
            <option value="ADMIN">Quản trị</option>
          </Select>

          <Button onClick={handleAddUser}>
            <UserPlus className="w-4 h-4 mr-2" />
            Thêm
          </Button>
        </div>

        {/* User List */}
        <div className="space-y-2">
          {users.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getRoleIcon(assignment.role)}
                <div>
                  <div className="font-medium">
                    {assignment.user.name || assignment.user.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getRoleName(assignment.role)}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveUser(assignment.user.id)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Chưa có người dùng nào được gán
            </p>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">
            📋 Phân quyền:
          </p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>
              <strong>Quản trị:</strong> Toàn quyền (sửa sự kiện, quản lý đăng
              ký, gán người dùng)
            </li>
            <li>
              <strong>Chỉnh sửa:</strong> Sửa sự kiện và quản lý đăng ký
            </li>
            <li>
              <strong>Xem:</strong> Chỉ xem dữ liệu, không sửa được
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
