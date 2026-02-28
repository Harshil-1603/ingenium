"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils";
import { BarChart3, CheckCircle, Clock, AlertCircle, Box, MapPin, User } from "lucide-react";

interface BookingInfo {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  user: { id: string; name: string; email: string };
}

interface ResourceSummary {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string | null;
  owner: { id: string; name: string } | null;
  status: "IN_USE" | "AVAILABLE";
  activeBookings: BookingInfo[];
  pendingBookings: BookingInfo[];
  upcomingBookings: BookingInfo[];
  totalActiveAndUpcoming: number;
  totalPending: number;
}

interface MonitoringData {
  department: { id: string; slug: string; name: string } | null;
  stats: { totalResources: number; inUse: number; available: number; totalPending: number };
  resources: ResourceSummary[];
}

export default function ResourceMonitoringPage() {
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
      const res = await fetch("/api/resource-monitoring", { credentials: "include" });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {} finally { setLoading(false); }
  }

  if (!user) return null;

  return (
    <div>
      <Header user={user} title="Resource Monitoring" />
      <div className="p-6">
        {loading ? <LoadingSpinner /> : !data || data.resources.length === 0 ? (
          <EmptyState
            title="No resources to monitor"
            description="Your department has no resources assigned yet."
            icon={<BarChart3 className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <>
            {data.department && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{data.department.name} Department</h2>
                <p className="text-sm text-gray-500 mt-1">Live resource allocation overview</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Box}
                label="Total Resources"
                value={data.stats.totalResources}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                icon={CheckCircle}
                label="Available Now"
                value={data.stats.available}
                color="bg-green-50 text-green-600"
              />
              <StatCard
                icon={AlertCircle}
                label="In Use"
                value={data.stats.inUse}
                color="bg-amber-50 text-amber-600"
              />
              <StatCard
                icon={Clock}
                label="Pending Requests"
                value={data.stats.totalPending}
                color="bg-purple-50 text-purple-600"
              />
            </div>

            <div className="space-y-3">
              {data.resources.map((r) => {
                const isExpanded = expanded === r.id;
                return (
                  <div key={r.id} className="card">
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : r.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${r.status === "IN_USE" ? "bg-amber-400" : "bg-green-400"}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">{r.name}</h3>
                            {r.location && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> {r.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge ${r.status === "IN_USE" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            {r.status === "IN_USE" ? "In Use" : "Available"}
                          </span>
                          {r.totalPending > 0 && (
                            <span className="badge bg-purple-100 text-purple-700">
                              {r.totalPending} pending
                            </span>
                          )}
                          {r.totalActiveAndUpcoming > 0 && (
                            <span className="badge bg-blue-100 text-blue-700">
                              {r.totalActiveAndUpcoming} booked
                            </span>
                          )}
                          <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                        {r.activeBookings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-amber-700 mb-2">Currently In Use</h4>
                            {r.activeBookings.map((b) => (
                              <BookingRow key={b.id} booking={b} />
                            ))}
                          </div>
                        )}

                        {r.pendingBookings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-purple-700 mb-2">Pending Requests</h4>
                            {r.pendingBookings.map((b) => (
                              <BookingRow key={b.id} booking={b} />
                            ))}
                          </div>
                        )}

                        {r.upcomingBookings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-700 mb-2">Upcoming</h4>
                            {r.upcomingBookings.map((b) => (
                              <BookingRow key={b.id} booking={b} />
                            ))}
                          </div>
                        )}

                        {r.activeBookings.length === 0 && r.pendingBookings.length === 0 && r.upcomingBookings.length === 0 && (
                          <p className="text-sm text-gray-500">No current or upcoming bookings.</p>
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
          <User className="h-3 w-3" /> {booking.user.name} ({booking.user.email})
        </p>
      </div>
      <div className="text-right text-xs text-gray-500">
        <p>{formatDateTime(booking.startTime)}</p>
        <p>to {formatDateTime(booking.endTime)}</p>
      </div>
    </div>
  );
}
