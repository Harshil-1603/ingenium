"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { DailyCalendar } from "@/components/calendar/WeeklyCalendar";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";

export default function CalendarPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const resourceIdFromUrl = searchParams.get("resource") || undefined;
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  });
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    title: "",
    description: "",
    resourceId: "",
    resourceName: "",
    date: "",
    startHour: "09",
    endHour: "10",
  });
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleEmptySlotClick(resourceId: string, date: string, hour: number) {
    setBookingForm({
      title: "",
      description: "",
      resourceId,
      resourceName: "",
      date,
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
          resourceId: bookingForm.resourceId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast(
          "success",
          data.data.status === "WAITLISTED" ? "Added to waitlist" : "Booking submitted!"
        );
        setBookingModal(false);
        setRefreshKey((prev) => prev + 1);
      } else {
        toast("error", data.error);
      }
    } catch {
      toast("error", "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  }

  function prevDay() {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
    );
  }

  function nextDay() {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
    );
  }

  function goToday() {
    const now = new Date();
    setSelectedDate(
      `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`
    );
  }

  const displayDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  })();
  const isToday = selectedDate === todayStr;

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Calendar" />

      <div className="p-6">
        {/* Date navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{displayDate}</h2>
            {isToday && <span className="text-xs font-medium text-brand-600">Today</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="btn-ghost p-2" title="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="input-field w-auto text-sm"
            />
            <button
              onClick={goToday}
              className={`btn-secondary text-xs px-3 py-1.5 ${isToday ? "opacity-50" : ""}`}
              disabled={isToday}
            >
              Today
            </button>
            <button onClick={nextDay} className="btn-ghost p-2" title="Next day">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <DailyCalendar
          date={selectedDate}
          onEmptySlotClick={handleEmptySlotClick}
          refreshKey={refreshKey}
          preselectedResourceId={resourceIdFromUrl}
        />

        {/* Booking modal */}
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
                <input
                  type="date"
                  required
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                <select
                  value={bookingForm.startHour}
                  onChange={(e) => setBookingForm({ ...bookingForm, startHour: e.target.value })}
                  className="input-field"
                >
                  {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h.toString().padStart(2, "0")}>
                      {h.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                <select
                  value={bookingForm.endHour}
                  onChange={(e) => setBookingForm({ ...bookingForm, endHour: e.target.value })}
                  className="input-field"
                >
                  {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h.toString().padStart(2, "0")}>
                      {h.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setBookingModal(false)} className="btn-secondary">
                Cancel
              </button>
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
