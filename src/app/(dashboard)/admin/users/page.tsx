"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import { getRoleLabel, getRoleBadgeColor, formatDate } from "@/lib/utils";
import { Users, Search, Shield } from "lucide-react";

interface UserEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { bookings: number };
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [roleModal, setRoleModal] = useState<UserEntry | null>(null);
  const [newRole, setNewRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {} finally { setLoading(false); }
  }

  async function handleRoleChange() {
    if (!roleModal || !newRole) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${roleModal.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", `Role updated to ${getRoleLabel(newRole)}`);
        setRoleModal(null);
        fetchUsers();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to update role"); } finally { setSubmitting(false); }
  }

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Manage Users" />
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" placeholder="Search users..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field w-auto">
            <option value="">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="CLUB_ADMIN">Club Admin</option>
            <option value="DEPARTMENT_OFFICER">Department Officer</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>

        {loading ? <LoadingSpinner /> : users.length === 0 ? (
          <EmptyState title="No users found" icon={<Users className="h-8 w-8 text-gray-400" />} />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Bookings</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Joined</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${getRoleBadgeColor(u.role)}`}>{getRoleLabel(u.role)}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{u.department || "—"}</td>
                    <td className="py-3 px-4 text-gray-600">{u._count.bookings}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => { setRoleModal(u); setNewRole(u.role); }}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Shield className="h-3 w-3" /> Change Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {roleModal && (
          <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change User Role">
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">{roleModal.name}</p>
                <p className="text-sm text-gray-500">{roleModal.email}</p>
                <p className="text-sm text-gray-400 mt-1">Current: {getRoleLabel(roleModal.role)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="input-field">
                  <option value="STUDENT">Student</option>
                  <option value="CLUB_ADMIN">Club Admin</option>
                  <option value="DEPARTMENT_OFFICER">Department Officer</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setRoleModal(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleRoleChange} disabled={submitting || newRole === roleModal.role} className="btn-primary">
                  {submitting ? "Updating..." : "Update Role"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
