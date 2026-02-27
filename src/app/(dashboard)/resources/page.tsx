"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import { getResourceTypeLabel } from "@/lib/utils";
import { Plus, Box, MapPin, Users as UsersIcon, Clock, Search } from "lucide-react";
import Link from "next/link";

interface Resource {
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

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "ROOM" as string, description: "", location: "", capacity: "",
    requiresApproval: true, maxBookingHours: "4", availableFrom: "08:00", availableTo: "22:00",
  });

  useEffect(() => { fetchResources(); }, [search, typeFilter]);

  async function fetchResources() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/resources?${params}`);
      const data = await res.json();
      if (data.success) setResources(data.data);
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
          name: form.name, type: form.type, description: form.description || undefined,
          location: form.location || undefined, capacity: form.capacity ? Number(form.capacity) : undefined,
          requiresApproval: form.requiresApproval, maxBookingHours: Number(form.maxBookingHours),
          availableFrom: form.availableFrom, availableTo: form.availableTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", "Resource created!");
        setCreateModal(false);
        fetchResources();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to create resource"); } finally { setSubmitting(false); }
  }

  if (!user) return null;

  const canCreate = ["DEPARTMENT_OFFICER", "SUPER_ADMIN"].includes(user.role);

  return (
    <div>
      <Header user={user} title="Resources" />
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text" placeholder="Search resources..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 w-64"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field w-auto">
              <option value="">All Types</option>
              <option value="ROOM">Room</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="ASSET">Asset</option>
            </select>
          </div>
          {canCreate && (
            <button onClick={() => setCreateModal(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Resource
            </button>
          )}
        </div>

        {loading ? <LoadingSpinner /> : resources.length === 0 ? (
          <EmptyState
            title="No resources found"
            description={canCreate ? "Add your first resource to get started." : "No resources are available yet."}
            icon={<Box className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r) => (
              <div key={r.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    <span className="badge bg-gray-100 text-gray-700 mt-1">{getResourceTypeLabel(r.type)}</span>
                  </div>
                  <span className={`badge ${r.requiresApproval ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {r.requiresApproval ? "Approval Required" : "Auto-approve"}
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
                {r.owner && (
                  <p className="mt-3 text-xs text-gray-400">Managed by {r.owner.name}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{r._count.bookings} bookings</span>
                  <Link href={`/calendar?resource=${r.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    View Calendar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {canCreate && (
          <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add New Resource" maxWidth="max-w-xl">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="LHC Room 101" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                    <option value="ROOM">Room</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="ASSET">Asset</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Optional" />
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
                  <input type="number" min={1} max={24} value={form.maxBookingHours} onChange={(e) => setForm({ ...form, maxBookingHours: e.target.value })} className="input-field" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded border-gray-300 text-brand-600 focus:ring-brand-600" />
                <span className="text-sm text-gray-700">Requires approval before booking</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Creating..." : "Create Resource"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
