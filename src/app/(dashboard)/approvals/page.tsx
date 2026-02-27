"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import { getStatusColor, formatDateTime } from "@/lib/utils";
import { ClipboardCheck, Check, X } from "lucide-react";

interface Booking {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  resource: { id: string; name: string; type: string };
  user: { id: string; name: string; email: string; department: string | null };
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ type: "approve" | "reject"; booking: Booking } | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchPending(); }, []);

  async function fetchPending() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings?scope=pending-approval&pageSize=50");
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch {} finally { setLoading(false); }
  }

  async function handleAction() {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      const endpoint = actionModal.type === "approve" ? "approve" : "reject";
      const res = await fetch(`/api/bookings/${actionModal.booking.id}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", `Booking ${actionModal.type === "approve" ? "approved" : "rejected"}`);
        setActionModal(null);
        setComment("");
        fetchPending();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Action failed"); } finally { setSubmitting(false); }
  }

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Approvals" />
      <div className="p-6">
        {loading ? <LoadingSpinner /> : bookings.length === 0 ? (
          <EmptyState
            title="No pending approvals"
            description="All booking requests have been reviewed."
            icon={<ClipboardCheck className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">{bookings.length} pending request(s)</p>
            {bookings.map((b) => (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{b.title}</h3>
                      <span className={`badge ${getStatusColor(b.status)}`}>{b.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">{b.user.name}</span>
                      {b.user.department && <span className="text-gray-400"> — {b.user.department}</span>}
                    </p>
                    <p className="text-sm text-gray-600">{b.resource.name} ({b.resource.type})</p>
                    <p className="text-sm text-gray-500">{formatDateTime(b.startTime)} — {formatDateTime(b.endTime)}</p>
                    {b.description && <p className="mt-2 text-sm text-gray-500">{b.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setActionModal({ type: "approve", booking: b }); setComment(""); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => { setActionModal({ type: "reject", booking: b }); setComment(""); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {actionModal && (
          <Modal
            open={!!actionModal}
            onClose={() => setActionModal(null)}
            title={`${actionModal.type === "approve" ? "Approve" : "Reject"} Booking`}
          >
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">{actionModal.booking.title}</p>
                <p className="text-sm text-gray-600">by {actionModal.booking.user.name}</p>
                <p className="text-sm text-gray-500">
                  {actionModal.booking.resource.name} — {formatDateTime(actionModal.booking.startTime)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment {actionModal.type === "reject" ? "(recommended)" : "(optional)"}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder={actionModal.type === "reject" ? "Reason for rejection..." : "Optional comment..."}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setActionModal(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleAction}
                  disabled={submitting}
                  className={actionModal.type === "approve" ? "btn-primary" : "btn-danger"}
                >
                  {submitting ? "Processing..." : actionModal.type === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
