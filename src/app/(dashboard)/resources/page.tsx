"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toaster";
import { getResourceTypeLabel } from "@/lib/utils";
import { canBookResource } from "@/lib/rbac";
import {
  Plus, Box, MapPin, Clock, Search, Tag, CalendarPlus,
  Building2, Users, Package, ChevronDown, ChevronRight,
} from "lucide-react";
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
  maxCount: number;
  departmentId: string | null;
  clubId: string | null;
  department?: { id: string; slug: string; name: string } | null;
  club?: { id: string; slug: string; name: string } | null;
  owner: { id: string; name: string; email: string } | null;
  _count: { bookings: number };
}

interface GroupSection {
  key: string;
  label: string;
  icon: "department" | "club" | "general";
  resources: Resource[];
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [createModal, setCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    title: "", description: "", resourceId: "", resourceName: "",
    startDate: "", startTime: "09:00", endDate: "", endTime: "10:00",
  });
  const [form, setForm] = useState({
    name: "", type: "EQUIPMENT" as string, description: "", location: "",
    requiresApproval: true, maxBookingHours: "24", availableFrom: "08:00", availableTo: "22:00",
  });

  useEffect(() => { fetchResources(); }, [search, typeFilter]);

  async function fetchResources() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/resources?${params}`);
      const resData = await res.json();
      if (resData.success) {
        let filtered = resData.data.filter((r: Resource) => r.type === "EQUIPMENT" || r.type === "ASSET");
        if (typeFilter) filtered = filtered.filter((r: Resource) => r.type === typeFilter);
        if (user?.role === "PROFESSOR") {
          filtered = filtered.filter((r: Resource) => r.departmentId != null);
        }
        setResources(filtered);
      }
    } catch {} finally { setLoading(false); }
  }

  const grouped = useMemo<GroupSection[]>(() => {
    const deptMap = new Map<string, { label: string; resources: Resource[] }>();
    const clubMap = new Map<string, { label: string; resources: Resource[] }>();
    const ungrouped: Resource[] = [];

    for (const r of resources) {
      if (r.department) {
        const existing = deptMap.get(r.department.id);
        if (existing) existing.resources.push(r);
        else deptMap.set(r.department.id, { label: r.department.name, resources: [r] });
      } else if (r.club) {
        const existing = clubMap.get(r.club.id);
        if (existing) existing.resources.push(r);
        else clubMap.set(r.club.id, { label: r.club.name, resources: [r] });
      } else {
        ungrouped.push(r);
      }
    }

    const sections: GroupSection[] = [];

    for (const [id, val] of deptMap) {
      sections.push({ key: `dept-${id}`, label: val.label, icon: "department", resources: val.resources });
    }
    for (const [id, val] of clubMap) {
      sections.push({ key: `club-${id}`, label: val.label, icon: "club", resources: val.resources });
    }
    if (ungrouped.length > 0) {
      sections.push({ key: "general", label: "General Resources", icon: "general", resources: ungrouped });
    }

    return sections;
  }, [resources]);

  function toggleSection(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
          location: form.location || undefined,
          requiresApproval: form.requiresApproval, maxBookingHours: Number(form.maxBookingHours),
          availableFrom: form.availableFrom, availableTo: form.availableTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", "Resource added!");
        setCreateModal(false);
        setForm({ name: "", type: "EQUIPMENT", description: "", location: "", requiresApproval: true, maxBookingHours: "24", availableFrom: "08:00", availableTo: "22:00" });
        fetchResources();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to add resource"); } finally { setSubmitting(false); }
  }

  function openBookModal(resource: Resource) {
    const today = new Date().toISOString().split("T")[0];
    setBookingForm({
      title: "", description: "", resourceId: resource.id, resourceName: resource.name,
      startDate: today, startTime: "09:00", endDate: today, endTime: "10:00",
    });
    setBookingModal(true);
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookingForm.title,
          description: bookingForm.description || undefined,
          resourceId: bookingForm.resourceId,
          startTime: `${bookingForm.startDate}T${bookingForm.startTime}:00`,
          endTime: `${bookingForm.endDate}T${bookingForm.endTime}:00`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", data.data.status === "WAITLISTED" ? "Added to waitlist" : "Booking submitted!");
        setBookingModal(false);
        fetchResources();
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
  const canCreate = ["DEPARTMENT_OFFICER", "LAB_TECH", "SUPER_ADMIN", "ADMIN", "CLUB_ADMIN", "CLUB_MANAGER"].includes(user.role);

  const sectionIcon = (type: GroupSection["icon"]) => {
    switch (type) {
      case "department": return <Building2 className="h-5 w-5 text-blue-500" />;
      case "club": return <Users className="h-5 w-5 text-purple-500" />;
      default: return <Box className="h-5 w-5 text-gray-500" />;
    }
  };

  const sectionBadgeColor = (type: GroupSection["icon"]) => {
    switch (type) {
      case "department": return "bg-blue-50 text-blue-700 border-blue-200";
      case "club": return "bg-purple-50 text-purple-700 border-purple-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div>
      <Header user={user} title="Resource Directory" />
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-6">
          Equipment, tools, and shared assets organized by department and club.
        </p>

        {/* Toolbar */}
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

        {/* Summary chips */}
        {!loading && grouped.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {grouped.map((section) => (
              <button
                key={section.key}
                onClick={() => {
                  const el = document.getElementById(section.key);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors hover:shadow-sm ${sectionBadgeColor(section.icon)}`}
              >
                {sectionIcon(section.icon)}
                {section.label}
                <span className="ml-1 opacity-60">({section.resources.length})</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? <LoadingSpinner /> : resources.length === 0 ? (
          <EmptyState
            title="No resources found"
            description={canCreate ? "Add equipment or assets for others to book." : "No equipment or assets are available yet."}
            icon={<Box className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="space-y-6">
            {grouped.map((section) => {
              const isCollapsed = collapsedSections.has(section.key);
              return (
                <div key={section.key} id={section.key} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    }
                    {sectionIcon(section.icon)}
                    <div className="flex-1 text-left">
                      <h2 className="text-base font-semibold text-gray-900">{section.label}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {section.resources.length} resource{section.resources.length !== 1 ? "s" : ""}
                        {" · "}
                        {section.resources.filter((r) => r.type === "EQUIPMENT").length} equipment
                        {section.resources.some((r) => r.type === "ASSET")
                          ? `, ${section.resources.filter((r) => r.type === "ASSET").length} asset${section.resources.filter((r) => r.type === "ASSET").length !== 1 ? "s" : ""}`
                          : ""}
                      </p>
                    </div>
                    <span className={`badge border text-xs ${sectionBadgeColor(section.icon)}`}>
                      {section.icon === "department" ? "Department" : section.icon === "club" ? "Club" : "General"}
                    </span>
                  </button>

                  {/* Section body */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {section.resources.map((r) => (
                          <ResourceCard
                            key={r.id}
                            resource={r}
                            user={user}
                            onBook={() => openBookModal(r)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Book Now modal */}
        <Modal open={bookingModal} onClose={() => setBookingModal(false)} title={`Book: ${bookingForm.resourceName || "Resource"}`} maxWidth="max-w-xl">
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text" required value={bookingForm.title}
                onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                className="input-field" placeholder="Meeting, Event..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={bookingForm.description}
                onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                className="input-field" rows={2} placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" required value={bookingForm.startDate}
                  onChange={(e) => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" required value={bookingForm.startTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" required value={bookingForm.endDate} min={bookingForm.startDate}
                  onChange={(e) => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" required value={bookingForm.endTime}
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

        {/* Create resource modal */}
        {canCreate && (
          <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add New Resource" maxWidth="max-w-xl">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Portable Projector" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="ASSET">Asset</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Details about the resource..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="Equipment Store, Floor 1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Booking Hours</label>
                  <input type="number" min={1} max={720} value={form.maxBookingHours} onChange={(e) => setForm({ ...form, maxBookingHours: e.target.value })} className="input-field" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded border-gray-300 text-brand-600 focus:ring-brand-600" />
                <span className="text-sm text-gray-700">Requires approval before checkout</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Creating..." : "Add Resource"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource: r, user, onBook }: { resource: Resource; user: { role: string; departmentId?: string | null; clubId?: string | null }; onBook: () => void }) {
  const showBook = canBookResource(
    { role: user.role, departmentId: user.departmentId ?? null, clubId: user.clubId ?? null },
    { type: r.type, departmentId: r.departmentId ?? null, clubId: r.clubId ?? null }
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all p-4 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{r.name}</h3>
          <span className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${r.type === "EQUIPMENT" ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"}`}>
            <Tag className="h-2.5 w-2.5" />
            {getResourceTypeLabel(r.type)}
          </span>
        </div>
        <span className={`shrink-0 ml-2 text-[10px] font-semibold px-2 py-1 rounded-md ${r.requiresApproval ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {r.requiresApproval ? "Approval Required" : "Auto-approve"}
        </span>
      </div>

      {r.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{r.description}</p>}

      <div className="flex-1 space-y-1.5 text-xs text-gray-600">
        {r.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="truncate">{r.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-gray-400 shrink-0" />
          <span>{r.availableFrom} — {r.availableTo}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package className="h-3 w-3 text-gray-400 shrink-0" />
          <span>Units: <span className="font-semibold text-gray-900">{r.maxCount}</span></span>
        </div>
      </div>

      {r.owner && <p className="mt-2 text-[10px] text-gray-400">Managed by {r.owner.name}</p>}

      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
        <Link href={`/calendar?resource=${r.id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline">
          View Calendar
        </Link>
        {showBook && (
          <button
            type="button"
            onClick={onBook}
            className="ml-auto inline-flex items-center gap-1.5 bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-brand-700 transition-colors"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Book
          </button>
        )}
      </div>
    </div>
  );
}
