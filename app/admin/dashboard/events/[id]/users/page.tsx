"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface EventUser {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function EventUsersPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [eventUsers, setEventUsers] = useState<EventUser[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEventUsers();
    loadAllUsers();
  }, [eventId]);

  const loadEventUsers = async () => {
    const res = await fetch(`/api/events/${eventId}/users`);
    const data = await res.json();
    if (data.success) {
      setEventUsers(data.data);
    }
  };

  const loadAllUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.success) {
      setAllUsers(data.data);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadEventUsers();
        setSelectedUserId("");
        setSelectedRole("VIEWER");
        alert("Đã thêm người dùng thành công!");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    try {
      const res = await fetch(`/api/events/${eventId}/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        await loadEventUsers();
        alert("Đã xóa người dùng thành công!");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Có lỗi xảy ra");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (data.success) {
        await loadEventUsers();
        alert("Đã cập nhật quyền thành công!");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Có lỗi xảy ra");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Quản lý người dùng sự kiện</h1>

      {/* Form thêm user */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Thêm người dùng</h2>
        <div className="flex gap-4">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          >
            <option value="">-- Chọn người dùng --</option>
            {allUsers
              .filter((u) => !eventUsers.find((eu) => eu.user.id === u.id))
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email}) - {user.role}
                </option>
              ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="VIEWER">Viewer (Xem)</option>
            <option value="EDITOR">Editor (Chỉnh sửa)</option>
            <option value="ADMIN">Admin (Quản trị)</option>
          </select>

          <button
            onClick={handleAddUser}
            disabled={loading || !selectedUserId}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            Thêm
          </button>
        </div>
      </div>

      {/* Danh sách users */}
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Tên</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Vai trò hệ thống</th>
              <th className="px-6 py-3 text-left">Quyền trên sự kiện</th>
              <th className="px-6 py-3 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {eventUsers.map((eu) => (
              <tr key={eu.id}>
                <td className="px-6 py-4">{eu.user.name}</td>
                <td className="px-6 py-4">{eu.user.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {eu.user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={eu.role}
                    onChange={(e) =>
                      handleUpdateRole(eu.user.id, e.target.value)
                    }
                    className="border rounded px-2 py-1"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleRemoveUser(eu.user.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
