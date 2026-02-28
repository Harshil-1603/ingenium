"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import { Plus, DoorOpen, MapPin, Users as UsersIcon, Clock, Search, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { canBookRoom } from "@/lib/rbac";

interface Room {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  requiresApproval: boolean;
  maxBookingHours: number;
  availableFrom: string;
  availableTo: string;
  owner: { id: string; name: string; email: string } | null;
  _count: { bookings: number };
}

export default function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    title: "",
    description: "",
    resourceId: "",
    resourceName: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
  });
  const [form, setForm] = useState({
    name: "", description: "", location: "", capacity: "",
    requiresApproval: true, maxBookingHours: "4", availableFrom: "08:00", availableTo: "22:00",
  });

  useEffect(() => { fetchRooms(); }, [search]);

  async function fetchRooms() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50", type: "ROOM" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/resources?${params}`);
      const data = await res.json();
      if (data.success) setRooms(data.data);
    } catch {} finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, type: "ROOM", description: form.description || undefined,
          location: form.location || undefined, capacity: form.capacity ? Number(form.capacity) : undefined,
          requiresApproval: form.requiresApproval, maxBookingHours: Number(form.maxBookingHours),
          availableFrom: form.availableFrom, availableTo: form.availableTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", "Room added!");
        setCreateModal(false);
        setForm({ name: "", description: "", location: "", capacity: "", requiresApproval: true, maxBookingHours: "4", availableFrom: "08:00", availableTo: "22:00" });
        fetchRooms();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to add room"); } finally { setSubmitting(false); }
  }

  function openBookModal(room: Room) {
    const today = new Date().toISOString().split("T")[0];
    setBookingForm({
      title: "",
      description: "",
      resourceId: room.id,
      resourceName: room.name,
      startDate: today,
      startTime: "09:00",
      endDate: today,
      endTime: "10:00",
    });
    setBookingModal(true);
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingSubmitting(true);
    try {
      const startTime = new Date(`${bookingForm.startDate}T${bookingForm.startTime}:00`);
      const endTime = new Date(`${bookingForm.endDate}T${bookingForm.endTime}:00`);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookingForm.title,
          description: bookingForm.description || undefined,
          resourceId: bookingForm.resourceId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", data.data.status === "WAITLISTED" ? "Added to waitlist" : "Booking submitted!");
        setBookingModal(false);
        fetchRooms();
      } else {
        toast("error", data.error);
      }
    } catch {
      toast("error", "Failed to create booking");
    } finally {
      setBookingSubmitting(false);
    }
  }

  if (!user) return null;
  const canCreate = ["DEPARTMENT_OFFICER", "LAB_TECH", "SUPER_ADMIN", "ADMIN"].includes(user.role);
  const canBook = canBookRoom({ role: user.role });

  return (
    <div>
      <Header user={user} title="Room Directory" />
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" placeholder="Search rooms..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
          {canCreate && (
            <button onClick={() => setCreateModal(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Room
            </button>
          )}
        </div>

        {loading ? <LoadingSpinner /> : rooms.length === 0 ? (
          <EmptyState
            title="No rooms found"
            description={canCreate ? "Add your first room to get started." : "No rooms are available yet."}
            icon={<DoorOpen className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r) => (
              <div key={r.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <span className={`badge ${r.requiresApproval ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {r.requiresApproval ? "Needs Approval" : "Auto-approve"}
                  </span>
                </div>
                {r.description && <p className="text-sm text-gray-500 mb-3">{r.description}</p>}
                <div className="space-y-1.5 text-sm text-gray-600">
                  {r.location && (
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-400" />{r.location}</div>
                  )}
                  {r.capacity && (
                    <div className="flex items-center gap-2"><UsersIcon className="h-3.5 w-3.5 text-gray-400" />Capacity: {r.capacity}</div>
                  )}
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-gray-400" />{r.availableFrom} — {r.availableTo}</div>
                </div>
                {r.owner && <p className="mt-3 text-xs text-gray-400">Managed by {r.owner.name}</p>}
                <div className="mt-4 flex flex-col gap-3">
                  <Link href={`/calendar?resource=${r.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    View Calendar
                  </Link>
                  {canBook && (
                    <button
                      type="button"
                      onClick={() => openBookModal(r)}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Book Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Book Now modal */}
        <Modal open={bookingModal} onClose={() => setBookingModal(false)} title={`Book: ${bookingForm.resourceName || "Room"}`} maxWidth="max-w-xl">
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={bookingForm.title}
                onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                className="input-field"
                placeholder="Meeting, Study Session..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={bookingForm.description}
                onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                className="input-field"
                rows={2}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={bookingForm.startDate}
                  onChange={(e) => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={bookingForm.endDate}
                  min={bookingForm.startDate}
                  onChange={(e) => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={bookingForm.endTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setBookingModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={bookingSubmitting} className="btn-primary">
                {bookingSubmitting ? "Submitting..." : "Book Now"}
              </button>
            </div>
          </form>
        </Modal>

        {canCreate && (
          <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add New Room" maxWidth="max-w-xl">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="LHC Room 301" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Room details..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="Building A, Floor 2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="input-field" placeholder="50" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                  <input type="time" value={form.availableFrom} onChange={(e) => setForm({ ...form, availableFrom: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available To</label>
                  <input type="time" value={form.availableTo} onChange={(e) => setForm({ ...form, availableTo: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Hours</label>
                  <input type="number" min={1} max={12} value={form.maxBookingHours} onChange={(e) => setForm({ ...form, maxBookingHours: e.target.value })} className="input-field" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded border-gray-300 text-brand-600 focus:ring-brand-600" />
                <span className="text-sm text-gray-700">Requires approval before booking</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Creating..." : "Add Room"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
