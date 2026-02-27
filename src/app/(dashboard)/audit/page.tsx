"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string };
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  BOOKING_CREATED: { label: "Booking Created", color: "bg-blue-100 text-blue-700" },
  BOOKING_APPROVED: { label: "Booking Approved", color: "bg-green-100 text-green-700" },
  BOOKING_REJECTED: { label: "Booking Rejected", color: "bg-red-100 text-red-700" },
  BOOKING_CANCELLED: { label: "Booking Cancelled", color: "bg-gray-100 text-gray-700" },
  BOOKING_WAITLISTED: { label: "Booking Waitlisted", color: "bg-purple-100 text-purple-700" },
  WAITLIST_PROMOTED: { label: "Waitlist Promoted", color: "bg-indigo-100 text-indigo-700" },
  RESOURCE_CREATED: { label: "Resource Created", color: "bg-teal-100 text-teal-700" },
  RESOURCE_UPDATED: { label: "Resource Updated", color: "bg-amber-100 text-amber-700" },
  RESOURCE_DELETED: { label: "Resource Deleted", color: "bg-red-100 text-red-700" },
  USER_REGISTERED: { label: "User Registered", color: "bg-blue-100 text-blue-700" },
  USER_ROLE_CHANGED: { label: "Role Changed", color: "bg-orange-100 text-orange-700" },
  USER_LOGIN: { label: "User Login", color: "bg-gray-100 text-gray-600" },
};

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchLogs(); }, [actionFilter, page]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: "30" });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.totalPages);
      }
    } catch {} finally { setLoading(false); }
  }

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Audit Logs" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="input-field w-auto"
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? <LoadingSpinner /> : logs.length === 0 ? (
          <EmptyState
            title="No audit logs"
            description="System activity will appear here."
            icon={<ScrollText className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Entity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700" };
                    return (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`badge ${actionInfo.color}`}>{actionInfo.label}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{log.user.name}</div>
                          <div className="text-xs text-gray-400">{log.user.email}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {log.entityType}
                        </td>
                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                          {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary text-xs">
                    Previous
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn-secondary text-xs">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
