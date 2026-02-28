"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils";
import { DoorOpen, CheckCircle, Clock, AlertCircle, CalendarCheck, Users, MapPin, User } from "lucide-react";

interface BookingInfo {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  user: { id: string; name: string; email: string; role: string };
}

interface RoomSummary {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  owner: { id: string; name: string } | null;
  status: "OCCUPIED" | "ALLOCATED" | "FREE";
  nextBooking: BookingInfo | null;
  currentUser: { id: string; name: string; email: string; role: string } | null;
  currentBooking: BookingInfo | null;
  activeBookings: BookingInfo[];
  pendingBookings: BookingInfo[];
  upcomingBookings: BookingInfo[];
  totalActiveAndUpcoming: number;
  totalPending: number;
}

interface MonitoringData {
  stats: { totalRooms: number; occupied: number; allocated: number; free: number; totalPending: number };
  rooms: RoomSummary[];
}

export default function RoomMonitoringPage() {
  const { user } = useAuth();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/room-monitoring", { credentials: "include" });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {} finally { setLoading(false); }
  }

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Room Monitoring" />
      <div className="p-6">
        {loading ? <LoadingSpinner /> : !data || data.rooms.length === 0 ? (
          <EmptyState
            title="No rooms to monitor"
            description="There are no rooms in the system yet."
            icon={<DoorOpen className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">LHC Room Overview</h2>
              <p className="text-sm text-gray-500 mt-1">Live room allocation and occupancy status</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard
                icon={DoorOpen}
                label="Total Rooms"
                value={data.stats.totalRooms}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                icon={CheckCircle}
                label="Free Now"
                value={data.stats.free}
                color="bg-green-50 text-green-600"
              />
              <StatCard
                icon={AlertCircle}
                label="Occupied"
                value={data.stats.occupied}
                color="bg-amber-50 text-amber-600"
              />
              <StatCard
                icon={CalendarCheck}
                label="Allocated"
                value={data.stats.allocated}
                color="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                icon={Clock}
                label="Pending Requests"
                value={data.stats.totalPending}
                color="bg-purple-50 text-purple-600"
              />
            </div>

            <div className="space-y-3">
              {data.rooms.map((room) => {
                const isExpanded = expanded === room.id;
                return (
                  <div key={room.id} className="card">
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : room.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${room.status === "OCCUPIED" ? "bg-amber-400" : room.status === "ALLOCATED" ? "bg-indigo-400" : "bg-green-400"}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">{room.name}</h3>
                            <div className="flex items-center gap-3 mt-0.5">
                              {room.location && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {room.location}
                                </p>
                              )}
                              {room.capacity && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Users className="h-3 w-3" /> {room.capacity} seats
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge ${room.status === "OCCUPIED" ? "bg-amber-100 text-amber-700" : room.status === "ALLOCATED" ? "bg-indigo-100 text-indigo-700" : "bg-green-100 text-green-700"}`}>
                            {room.status === "OCCUPIED" ? "Occupied" : room.status === "ALLOCATED" ? "Allocated" : "Free"}
                          </span>
                          {room.currentUser && (
                            <span className="text-xs text-gray-500">
                              {room.currentUser.name}
                            </span>
                          )}
                          {room.status === "ALLOCATED" && room.nextBooking && (
                            <span className="text-xs text-gray-500">
                              Next: {room.nextBooking.user.name}
                            </span>
                          )}
                          {room.totalPending > 0 && (
                            <span className="badge bg-purple-100 text-purple-700">
                              {room.totalPending} pending
                            </span>
                          )}
                          {room.totalActiveAndUpcoming > 0 && (
                            <span className="badge bg-blue-100 text-blue-700">
                              {room.totalActiveAndUpcoming} booked
                            </span>
                          )}
                          <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                        {room.activeBookings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-amber-700 mb-2">Currently Occupied</h4>
                            {room.activeBookings.map((b) => (
                              <BookingRow key={b.id} booking={b} />
                            ))}
                          </div>
                        )}

                        {room.pendingBookings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-purple-700 mb-2">Pending Approval</h4>
                            {room.pendingBookings.map((b) => (
                              <BookingRow key={b.id} booking={b} />
                            ))}
                          </div>
                        )}

                        {room.upcomingBookings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-700 mb-2">Upcoming Bookings</h4>
                            {room.upcomingBookings.map((b) => (
                              <BookingRow key={b.id} booking={b} />
                            ))}
                          </div>
                        )}

                        {room.activeBookings.length === 0 && room.pendingBookings.length === 0 && room.upcomingBookings.length === 0 && (
                          <p className="text-sm text-gray-500">No current or upcoming bookings for this room.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingInfo }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm mb-1.5">
      <div>
        <p className="font-medium text-gray-900">{booking.title}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <User className="h-3 w-3" /> {booking.user.name} ({booking.user.email}) &middot; {booking.user.role}
        </p>
      </div>
      <div className="text-right text-xs text-gray-500">
        <p>{formatDateTime(booking.startTime)}</p>
        <p>to {formatDateTime(booking.endTime)}</p>
      </div>
    </div>
  );
}
