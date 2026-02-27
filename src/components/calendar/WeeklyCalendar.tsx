"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStatusColor } from "@/lib/utils";

interface CalendarSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  userId: string;
  userName: string;
}

interface WeeklyCalendarProps {
  resourceId: string;
  onSlotClick?: (slot: CalendarSlot) => void;
  onEmptySlotClick?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyCalendar({ resourceId, onSlotClick, onEmptySlotClick }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceName, setResourceName] = useState("");

  const weekStart = getMonday(currentDate);

  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  useEffect(() => {
    fetchCalendar();
  }, [resourceId, currentDate]);

  async function fetchCalendar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/${resourceId}?date=${currentDate.toISOString()}`);
      const data = await res.json();
      if (data.success) {
        setSlots(data.data.slots);
        setResourceName(data.data.resourceName);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function prevWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function getSlotsForCell(dayIndex: number, hour: number): CalendarSlot[] {
    const cellDate = new Date(weekStart);
    cellDate.setDate(cellDate.getDate() + dayIndex);

    return slots.filter((slot) => {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      const cellStart = new Date(cellDate);
      cellStart.setHours(hour, 0, 0, 0);
      const cellEnd = new Date(cellDate);
      cellEnd.setHours(hour + 1, 0, 0, 0);
      return start < cellEnd && end > cellStart;
    });
  }

  function formatWeekRange() {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${weekStart.toLocaleDateString("en-US", opts)} — ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{resourceName || "Calendar"}</h2>
          <p className="text-sm text-gray-500">{formatWeekRange()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="btn-ghost p-2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="btn-secondary text-xs px-3 py-1.5">
            Today
          </button>
          <button onClick={nextWeek} className="btn-ghost p-2">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200">
              <div className="p-2" />
              {DAY_LABELS.map((day, i) => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={day} className="border-l border-gray-200 p-2 text-center">
                    <div className={`text-xs font-medium ${isToday ? "text-brand-600" : "text-gray-500"}`}>{day}</div>
                    <div className={`text-lg font-semibold ${isToday ? "text-brand-600" : "text-gray-900"}`}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-100">
                <div className="p-2 text-right text-xs text-gray-400 font-medium">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {DAY_LABELS.map((_, dayIndex) => {
                  const cellSlots = getSlotsForCell(dayIndex, hour);
                  const cellDate = new Date(weekStart);
                  cellDate.setDate(cellDate.getDate() + dayIndex);

                  return (
                    <div
                      key={dayIndex}
                      className="relative border-l border-gray-100 min-h-[48px] hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => {
                        if (cellSlots.length === 0 && onEmptySlotClick) {
                          onEmptySlotClick(cellDate, hour);
                        }
                      }}
                    >
                      {cellSlots.map((slot) => (
                        <div
                          key={slot.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotClick?.(slot);
                          }}
                          className={`absolute inset-x-0.5 top-0.5 bottom-0.5 rounded-md px-1.5 py-0.5 text-[11px] leading-tight cursor-pointer overflow-hidden ${getStatusColor(slot.status)}`}
                        >
                          <div className="font-medium truncate">{slot.title}</div>
                          <div className="truncate opacity-75">{slot.userName}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
