"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Resource {
  id: string;
  name: string;
  type: string;
  location: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ title: "", description: "", date: "", startHour: "09", endHour: "10" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    try {
      const res = await fetch("/api/resources?pageSize=50");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setResources(data.data);
        setSelectedResource(data.data[0].id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function handleEmptySlotClick(date: Date, hour: number) {
    const dateStr = date.toISOString().split("T")[0];
    setBookingForm({
      title: "",
      description: "",
      date: dateStr,
      startHour: hour.toString().padStart(2, "0"),
      endHour: (hour + 1).toString().padStart(2, "0"),
    });
    setBookingModal(true);
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startTime = new Date(`${bookingForm.date}T${bookingForm.startHour}:00:00`);
      const endTime = new Date(`${bookingForm.date}T${bookingForm.endHour}:00:00`);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookingForm.title,
          description: bookingForm.description,
          resourceId: selectedResource,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast("success", data.data.status === "WAITLISTED" ? "Added to waitlist" : "Booking submitted!");
        setBookingModal(false);
      } else {
        toast("error", data.error);
      }
    } catch {
      toast("error", "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Calendar" />

      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : resources.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-500">No resources available. Ask an admin to create resources.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Resource:</label>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="input-field w-auto min-w-[250px]"
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.location ? `(${r.location})` : ""} — {r.type}
                  </option>
                ))}
              </select>
            </div>

            {selectedResource && (
              <WeeklyCalendar
                resourceId={selectedResource}
                onEmptySlotClick={handleEmptySlotClick}
              />
            )}
          </>
        )}

        <Modal open={bookingModal} onClose={() => setBookingModal(false)} title="Quick Book">
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                <select value={bookingForm.startHour} onChange={(e) => setBookingForm({ ...bookingForm, startHour: e.target.value })} className="input-field">
                  {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h.toString().padStart(2, "0")}>{h.toString().padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                <select value={bookingForm.endHour} onChange={(e) => setBookingForm({ ...bookingForm, endHour: e.target.value })} className="input-field">
                  {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h.toString().padStart(2, "0")}>{h.toString().padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setBookingModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Submitting..." : "Book Now"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
