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
  Pencil, Trash2,
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
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
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
    requiresApproval: true, maxBookingHours: "24", availableFrom: "08:00", availableTo: "22:00", maxCount: "1",
    assignTo: "", // "dept-{id}" | "club-{id}" | "" (unassigned)
  });
  const [editModal, setEditModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", type: "EQUIPMENT" as string, description: "", location: "",
    requiresApproval: true, maxBookingHours: "24", availableFrom: "08:00", availableTo: "22:00", maxCount: "1",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<Resource | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => { fetchResources(); }, [search, typeFilter]);

  useEffect(() => {
    if (!createModal) return;
    Promise.all([fetch("/api/departments"), fetch("/api/clubs")])
      .then(async ([dr, cr]) => {
        const dd = await dr.json();
        const cd = await cr.json();
        if (dd.success) setDepartments(dd.data);
        if (cd.success) setClubs(cd.data);
      })
      .catch(() => {});
  }, [createModal]);

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
        // Professor sees only dept resources (not club-only resources)
        if (user?.role === "PROFESSOR") {
          filtered = filtered.filter((r: Resource) => r.departmentId != null);
        }
        // Lab Tech / Dept Officer see only their own dept's resources
        if (["LAB_TECH", "DEPARTMENT_OFFICER"].includes(user?.role ?? "")) {
          filtered = filtered.filter((r: Resource) => r.departmentId != null && r.departmentId === (user as { departmentId?: string | null }).departmentId);
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
      const departmentId = form.assignTo.startsWith("dept-") ? form.assignTo.slice(5) : undefined;
      const clubId       = form.assignTo.startsWith("club-") ? form.assignTo.slice(5) : undefined;
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, type: form.type, description: form.description || undefined,
          location: form.location || undefined,
          requiresApproval: form.requiresApproval, maxBookingHours: Number(form.maxBookingHours),
          availableFrom: form.availableFrom, availableTo: form.availableTo,
          maxCount: Number(form.maxCount),
          departmentId,
          clubId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", "Resource added!");
        setCreateModal(false);
        setForm({ name: "", type: "EQUIPMENT", description: "", location: "", requiresApproval: true, maxBookingHours: "24", availableFrom: "08:00", availableTo: "22:00", maxCount: "1", assignTo: "" });
        fetchResources();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to add resource"); } finally { setSubmitting(false); }
  }

  function openEditModal(r: Resource) {
    setEditingResource(r);
    setEditForm({
      name: r.name, type: r.type, description: r.description ?? "",
      location: r.location ?? "", requiresApproval: r.requiresApproval,
      maxBookingHours: String(r.maxBookingHours), availableFrom: r.availableFrom,
      availableTo: r.availableTo, maxCount: String(r.maxCount),
    });
    setEditModal(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingResource) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/resources/${editingResource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name, type: editForm.type,
          description: editForm.description || undefined,
          location: editForm.location || undefined,
          requiresApproval: editForm.requiresApproval,
          maxBookingHours: Number(editForm.maxBookingHours),
          availableFrom: editForm.availableFrom, availableTo: editForm.availableTo,
          maxCount: Number(editForm.maxCount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("success", "Resource updated!");
        setEditModal(false);
        setEditingResource(null);
        fetchResources();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to update resource"); } finally { setEditSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/resources/${deleteConfirm.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast("success", "Resource removed.");
        setDeleteConfirm(null);
        fetchResources();
      } else {
        toast("error", data.error);
      }
    } catch { toast("error", "Failed to delete resource"); } finally { setDeleteSubmitting(false); }
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

  const currentUser = user;
  function canManage(r: Resource): boolean {
    if (["ADMIN", "SUPER_ADMIN"].includes(currentUser.role)) return true;
    if (["CLUB_ADMIN", "CLUB_MANAGER"].includes(currentUser.role)) return r.clubId != null && r.clubId === (currentUser as { clubId?: string | null }).clubId;
    if (["DEPARTMENT_OFFICER", "LAB_TECH"].includes(currentUser.role)) return r.departmentId != null && r.departmentId === (currentUser as { departmentId?: string | null }).departmentId;
    return false;
  }

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
                            onEdit={canManage(r) ? () => openEditModal(r) : undefined}
                            onDelete={canManage(r) ? () => setDeleteConfirm(r) : undefined}
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

              {/* Assign To — locked for lab tech / club head, full picker for admin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                {["LAB_TECH", "DEPARTMENT_OFFICER"].includes(currentUser.role) ? (
                  <div className="input-field bg-gray-50 text-gray-500 cursor-not-allowed select-none">
                    {departments.find(d => d.id === (currentUser as { departmentId?: string | null }).departmentId)?.name ?? "Your Department"} (auto-assigned)
                  </div>
                ) : ["CLUB_ADMIN", "CLUB_MANAGER"].includes(currentUser.role) ? (
                  <div className="input-field bg-gray-50 text-gray-500 cursor-not-allowed select-none">
                    {clubs.find(c => c.id === (currentUser as { clubId?: string | null }).clubId)?.name ?? "Your Club"} (auto-assigned)
                  </div>
                ) : (
                  <select
                    value={form.assignTo}
                    onChange={(e) => setForm({ ...form, assignTo: e.target.value })}
                    className="input-field"
                  >
                    <option value="">— General (no assignment) —</option>
                    {departments.length > 0 && (
                      <optgroup label="Departments">
                        {departments.map(d => (
                          <option key={d.id} value={`dept-${d.id}`}>{d.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {clubs.length > 0 && (
                      <optgroup label="Clubs">
                        {clubs.map(c => (
                          <option key={c.id} value={`club-${c.id}`}>{c.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Units Available</label>
                  <input type="number" min={1} max={999} required value={form.maxCount} onChange={(e) => setForm({ ...form, maxCount: e.target.value })} className="input-field" placeholder="1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                  <input type="time" value={form.availableFrom} onChange={(e) => setForm({ ...form, availableFrom: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available To</label>
                  <input type="time" value={form.availableTo} onChange={(e) => setForm({ ...form, availableTo: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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

        {/* Edit resource modal */}
        <Modal open={editModal} onClose={() => { setEditModal(false); setEditingResource(null); }} title="Edit Resource" maxWidth="max-w-xl">
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="input-field">
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="ASSET">Asset</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input-field" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Units Available</label>
                <input type="number" min={1} max={999} required value={editForm.maxCount} onChange={(e) => setEditForm({ ...editForm, maxCount: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                <input type="time" value={editForm.availableFrom} onChange={(e) => setEditForm({ ...editForm, availableFrom: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available To</label>
                <input type="time" value={editForm.availableTo} onChange={(e) => setEditForm({ ...editForm, availableTo: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Booking Hours</label>
                <input type="number" min={1} max={720} value={editForm.maxBookingHours} onChange={(e) => setEditForm({ ...editForm, maxBookingHours: e.target.value })} className="input-field" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.requiresApproval} onChange={(e) => setEditForm({ ...editForm, requiresApproval: e.target.checked })} className="rounded border-gray-300 text-brand-600 focus:ring-brand-600" />
              <span className="text-sm text-gray-700">Requires approval before checkout</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setEditModal(false); setEditingResource(null); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={editSubmitting} className="btn-primary">
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete confirmation modal */}
        <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove Resource" maxWidth="max-w-sm">
          <p className="text-sm text-gray-600 mb-1">
            Are you sure you want to remove <span className="font-semibold text-gray-900">{deleteConfirm?.name}</span>?
          </p>
          <p className="text-xs text-gray-400 mb-5">This will deactivate the resource and hide it from the directory.</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
            <button type="button" disabled={deleteSubmitting} onClick={handleDelete} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
              {deleteSubmitting ? "Removing..." : "Remove"}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function ResourceCard({ resource: r, user, onBook, onEdit, onDelete }: {
  resource: Resource;
  user: { role: string; departmentId?: string | null; clubId?: string | null };
  onBook: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
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
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {onEdit && (
            <button type="button" onClick={onEdit} className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit resource">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove resource">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${r.requiresApproval ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
            {r.requiresApproval ? "Approval" : "Auto"}
          </span>
        </div>
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
