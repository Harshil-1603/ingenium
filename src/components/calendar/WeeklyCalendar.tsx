"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "lucide-react";
import { getStatusColor } from "@/lib/utils";

interface Resource {
  id: string;
  name: string;
  type: string;
  location: string;
  capacity: number | null;
}

interface BookingSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  resourceId: string;
  userId: string;
  userName: string;
}

interface MergedBlock {
  key: string;
  ids: string[];
  title: string;
  startTime: Date;
  endTime: Date;
  status: string;
  resourceId: string;
  userId: string;
  userName: string;
}

interface DailyCalendarProps {
  date: string;
  onEmptySlotClick?: (resourceId: string, date: string, hour: number) => void;
  onSlotClick?: (slot: BookingSlot) => void;
  refreshKey?: number;
  preselectedResourceId?: string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const FIRST_HOUR = 8;
const CELL_HEIGHT = 48;

export function DailyCalendar({ date, onEmptySlotClick, onSlotClick, refreshKey, preselectedResourceId }: DailyCalendarProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchCalendar();
  }, [date, refreshKey]);

  async function fetchCalendar() {
    setLoading(true);
    try {
      // Send local-time date bounds as plain ISO strings (no UTC conversion) to avoid day-shift
      const res = await fetch(
        `/api/calendar/daily?start=${date}T00:00:00&end=${date}T23:59:59.999&t=${Date.now()}`
      );
      const data = await res.json();
      if (data.success) {
        setResources(data.data.resources);
        setBookings(data.data.bookings);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const filteredResources = preselectedResourceId
    ? resources.filter((r) => r.id === preselectedResourceId)
    : typeFilter === "ALL"
      ? resources
      : resources.filter((r) => r.type === typeFilter);

  const resourceTypes = [...new Set(resources.map((r) => r.type))];

  const mergedByResource = useMemo(() => {
    const dayRef = new Date(`${date}T00:00:00`);
    const map = new Map<string, MergedBlock[]>();

    for (const resource of resources) {
      const resourceBookings = bookings
        .filter((b) => b.resourceId === resource.id)
        .map((b) => ({ ...b, start: new Date(b.startTime), end: new Date(b.endTime) }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      const merged: MergedBlock[] = [];
      for (const b of resourceBookings) {
        const last = merged[merged.length - 1];
        if (
          last &&
          last.userId === b.userId &&
          last.endTime.getTime() >= b.start.getTime()
        ) {
          if (b.end > last.endTime) last.endTime = b.end;
          last.ids.push(b.id);
          if (!last.title.includes(b.title)) last.title += ` + ${b.title}`;
          if (b.status === "PENDING") last.status = "PENDING";
        } else {
          merged.push({
            key: b.id,
            ids: [b.id],
            title: b.title,
            startTime: b.start,
            endTime: b.end,
            status: b.status,
            resourceId: b.resourceId,
            userId: b.userId,
            userName: b.userName,
          });
        }
      }
      map.set(resource.id, merged);
    }
    return map;
  }, [bookings, resources, date]);

  function getBlockStyle(block: MergedBlock): React.CSSProperties {
    const dayRef = new Date(`${date}T00:00:00`);
    const startH = (block.startTime.getTime() - dayRef.getTime()) / 3_600_000;
    const endH = (block.endTime.getTime() - dayRef.getTime()) / 3_600_000;
    const clampedStart = Math.max(startH, FIRST_HOUR);
    const clampedEnd = Math.min(endH, FIRST_HOUR + HOURS.length);
    const top = (clampedStart - FIRST_HOUR) * CELL_HEIGHT + 2;
    const height = Math.max((clampedEnd - clampedStart) * CELL_HEIGHT - 4, 20);
    return { top: `${top}px`, height: `${height}px` };
  }

  function isCellOccupied(resourceId: string, hour: number): boolean {
    const cellStart = new Date(`${date}T${hour.toString().padStart(2, "0")}:00:00`);
    const cellEnd = new Date(`${date}T${(hour + 1).toString().padStart(2, "0")}:00:00`);
    return bookings.some(
      (b) =>
        b.resourceId === resourceId &&
        new Date(b.startTime) < cellEnd &&
        new Date(b.endTime) > cellStart
    );
  }

  const colTemplate = `80px repeat(${filteredResources.length}, minmax(140px, 1fr))`;

  return (
    <div className="card overflow-hidden">
      {resourceTypes.length > 1 && !preselectedResourceId && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              typeFilter === "ALL"
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {resourceTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                typeFilter === type
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type.charAt(0) + type.slice(1).toLowerCase() + "s"}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No resources available.</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <div style={{ minWidth: `${80 + filteredResources.length * 150}px` }}>
            {/* Column headers */}
            <div
              className="grid border-b border-gray-200 sticky top-0 bg-white z-10"
              style={{ gridTemplateColumns: colTemplate }}
            >
              <div className="p-2 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              {filteredResources.map((resource) => (
                <div key={resource.id} className="border-l border-gray-200 p-2 text-center">
                  <div className="text-xs font-semibold text-gray-900 truncate">{resource.name}</div>
                  {resource.location && (
                    <div className="text-[10px] text-gray-500 truncate">{resource.location}</div>
                  )}
                  <div className="text-[10px] text-gray-400">
                    {resource.type.charAt(0) + resource.type.slice(1).toLowerCase()}
                    {resource.capacity ? ` · ${resource.capacity} seats` : ""}
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar body: time labels + resource columns with absolute booking blocks */}
            <div className="grid" style={{ gridTemplateColumns: colTemplate }}>
              {/* Time labels */}
              <div>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-gray-100 p-2 text-right text-xs text-gray-400 font-medium"
                    style={{ height: `${CELL_HEIGHT}px` }}
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Resource columns */}
              {filteredResources.map((resource) => {
                const blocks = mergedByResource.get(resource.id) || [];
                return (
                  <div
                    key={resource.id}
                    className="relative border-l border-gray-100"
                    style={{ height: `${HOURS.length * CELL_HEIGHT}px` }}
                  >
                    {/* Hour grid lines (also serve as click targets for empty slots) */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        style={{ height: `${CELL_HEIGHT}px` }}
                        onClick={() => {
                          if (!isCellOccupied(resource.id, hour) && onEmptySlotClick) {
                            onEmptySlotClick(resource.id, date, hour);
                          }
                        }}
                      />
                    ))}

                    {/* Merged booking blocks positioned absolutely */}
                    {blocks.map((block) => {
                      const startLabel = `${block.startTime.getHours().toString().padStart(2, "0")}:${block.startTime.getMinutes().toString().padStart(2, "0")}`;
                      const endLabel = `${block.endTime.getHours().toString().padStart(2, "0")}:${block.endTime.getMinutes().toString().padStart(2, "0")}`;
                      const durationH = (block.endTime.getTime() - block.startTime.getTime()) / 3_600_000;
                      const isTall = durationH >= 1.5;
                      return (
                        <div
                          key={block.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotClick?.({
                              id: block.ids[0],
                              title: block.title,
                              startTime: block.startTime.toISOString(),
                              endTime: block.endTime.toISOString(),
                              status: block.status,
                              resourceId: block.resourceId,
                              userId: block.userId,
                              userName: block.userName,
                            });
                          }}
                          title={`${block.title} — ${block.userName} (${startLabel}–${endLabel})`}
                          className={`absolute left-0.5 right-0.5 rounded-md px-2 py-1 text-[11px] leading-tight cursor-pointer overflow-hidden z-[5] flex flex-col justify-start border ${getStatusColor(block.status)}`}
                          style={getBlockStyle(block)}
                        >
                          <div className="font-semibold truncate">{block.title}</div>
                          <div className="font-medium opacity-90">{startLabel}–{endLabel}</div>
                          {isTall && <div className="truncate opacity-70 text-[10px]">{block.userName}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer: booking count + legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {bookings.length === 0
            ? "No bookings for this date"
            : `${bookings.length} booking${bookings.length !== 1 ? "s" : ""} on this date`}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
            <span className="text-xs text-gray-500">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            <span className="text-xs text-gray-500">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />
            <span className="text-xs text-gray-500">Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
