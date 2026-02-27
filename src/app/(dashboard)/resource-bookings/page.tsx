"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import { getStatusColor, formatDateTime, getResourceTypeLabel } from "@/lib/utils";
import { Plus, PackageSearch, X } from "lucide-react";

interface Booking {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  approvalComment: string | null;
  createdAt: string;
  resource: { id: string; name: string; type: string };
  user: { id: string; name: string };
  approvedBy: { name: string } | null;
  waitlistEntry: { position: number; status: string } | null;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  location: string;
}

export default function ResourceBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", resourceId: "", date: "", startHour: "09", endHour: "17",
  });

  useEffect(() => { fetchBookings(); fetchResources(); }, [statusFilter]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: "own", pageSize: "50" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/bookings?${params}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.data.filter((b: Booking) => b.resource.type === "EQUIPMENT" || b.resource.type === "ASSET"));
      }
    } catch {} finally { setLoading(false); }
  }

  async function fetchResources() {
    try {
      const res = await fetch("/api/resources?pageSize=50");
      const data = await res.json();
      if (data.success) {
        setResources(data.data.filter((r: Resource) => r.type === "EQUIPMENT" || r.type === "ASSET"));
      }
    } catch {}
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startTime = new Date(`${form.date}T${form.startHour}:00:00`);
      const endTime = new Date(`${form.date}T${form.endHour}:00:00`);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, description: form.description, resourceId: form.resourceId,
          startTime: startTime.toISOString(), endTime: endTime.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", data.data.status === "WAITLISTED" ? "Added to waitlist" : "Resource reserved!");
        setCreateModal(false);
        setForm({ title: "", description: "", resourceId: "", date: "", startHour: "09", endHour: "17" });
        fetchBookings();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to reserve resource"); } finally { setSubmitting(false); }
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this resource reservation?")) return;
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) { toast("success", "Reservation cancelled"); fetchBookings(); }
      else toast("error", data.error);
    } catch { toast("error", "Failed to cancel"); }
  }

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Resource Bookings" />
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-6">Your equipment and asset reservations.</p>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <button onClick={() => setCreateModal(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" /> Reserve Resource
          </button>
        </div>

        {loading ? <LoadingSpinner /> : bookings.length === 0 ? (
          <EmptyState
            title="No resource reservations"
            description="Reserve equipment or assets for your events and projects."
            icon={<PackageSearch className="h-8 w-8 text-gray-400" />}
            action={<button onClick={() => setCreateModal(true)} className="btn-primary">Reserve Resource</button>}
          />
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{b.title}</h3>
                      <span className={`badge ${getStatusColor(b.status)}`}>{b.status}</span>
                      <span className="badge bg-indigo-50 text-indigo-700">{getResourceTypeLabel(b.resource.type)}</span>
                      {b.waitlistEntry && b.waitlistEntry.status === "WAITING" && (
                        <span className="badge bg-purple-100 text-purple-800">Waitlist #{b.waitlistEntry.position}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{b.resource.name}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(b.startTime)} — {formatDateTime(b.endTime)}</p>
                    {b.description && <p className="mt-2 text-sm text-gray-500">{b.description}</p>}
                    {b.approvalComment && (
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium">Comment:</span> {b.approvalComment}
                        {b.approvedBy && <span className="text-gray-400"> — {b.approvedBy.name}</span>}
                      </p>
                    )}
                  </div>
                  {!["CANCELLED", "REJECTED"].includes(b.status) && (
                    <button onClick={() => cancelBooking(b.id)} className="btn-ghost text-red-600 hover:bg-red-50 p-2" title="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal open={createModal} onClose={() => setCreateModal(false)} title="Reserve a Resource" maxWidth="max-w-xl">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
              <select required value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} className="input-field">
                <option value="">Select equipment or asset</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({getResourceTypeLabel(r.type)}){r.location ? ` — ${r.location}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Title</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Hackathon Setup, Event..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="What you need it for..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
                <select value={form.startHour} onChange={(e) => setForm({ ...form, startHour: e.target.value })} className="input-field">
                  {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h.toString().padStart(2, "0")}>{h.toString().padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Time</label>
                <select value={form.endHour} onChange={(e) => setForm({ ...form, endHour: e.target.value })} className="input-field">
                  {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h.toString().padStart(2, "0")}>{h.toString().padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Submitting..." : "Reserve"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
