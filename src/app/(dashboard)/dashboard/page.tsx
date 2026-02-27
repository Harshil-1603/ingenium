"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BookOpen, Box, Clock, CheckCircle, Users, TrendingUp } from "lucide-react";
import { getStatusColor, formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  totalResources: number;
  totalUsers: number;
  recentBookings: Array<{
    id: string;
    title: string;
    status: string;
    startTime: string;
    createdAt: string;
    resource: { name: string };
    user: { name: string };
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const isAdmin = ["SUPER_ADMIN", "DEPARTMENT_OFFICER"].includes(user.role);

  return (
    <div>
      <Header user={user} title="Dashboard" />

      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.name.split(" ")[0]}
          </h2>
          <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your bookings.</p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={BookOpen} label="Total Bookings" value={stats.totalBookings} color="blue" />
              <StatCard icon={Clock} label="Pending" value={stats.pendingBookings} color="yellow" />
              <StatCard icon={CheckCircle} label="Approved" value={stats.approvedBookings} color="green" />
              <StatCard icon={Box} label="Resources" value={stats.totalResources} color="purple" />
              {isAdmin && (
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="indigo" />
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Recent Bookings</h3>
                <Link href="/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              </div>

              {stats.recentBookings.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No bookings yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Title</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Resource</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentBookings.map((b) => (
                        <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 px-2 font-medium text-gray-900">{b.title}</td>
                          <td className="py-3 px-2 text-gray-600">{b.resource.name}</td>
                          <td className="py-3 px-2 text-gray-600">{formatDateTime(b.startTime)}</td>
                          <td className="py-3 px-2">
                            <span className={`badge ${getStatusColor(b.status)}`}>{b.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/room-bookings" className="card hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-brand-50 p-3 group-hover:bg-brand-100 transition-colors">
                    <BookOpen className="h-6 w-6 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Book a Room</h3>
                    <p className="text-sm text-gray-500">Reserve a lecture hall or lab</p>
                  </div>
                </div>
              </Link>
              <Link href="/resource-bookings" className="card hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-purple-50 p-3 group-hover:bg-purple-100 transition-colors">
                    <Box className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Reserve Equipment</h3>
                    <p className="text-sm text-gray-500">Borrow projectors, PA systems</p>
                  </div>
                </div>
              </Link>
              <Link href="/calendar" className="card hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-indigo-50 p-3 group-hover:bg-indigo-100 transition-colors">
                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Room Calendar</h3>
                    <p className="text-sm text-gray-500">Check room availability</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Failed to load dashboard data.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${colors[color]}`}>
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
