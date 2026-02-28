/**
 * Role-based access control
 *
 * STUDENT      – sees all resources (dept + club), books resources; no rooms at all.
 * PROFESSOR    – sees/books dept resources only; sees room directory, books rooms.
 * LAB_TECH     – manages (add/edit/delete) and approves their dept resources only;
 *                cannot book resources or rooms; no room directory.
 * DEPT_OFFICER – identical permissions to LAB_TECH (treated as same class).
 * CLUB_HEAD    – sees/books all resources (dept + club); manages their club resources;
 *   (CLUB_ADMIN   approves requests to their club; sees room directory, books rooms.
 *   /CLUB_MANAGER)
 * LHC          – sees room directory, approves/rejects room bookings, edits room
 *                availability; cannot book rooms or resources.
 * ADMIN        – full access to everything.
 * SUPER_ADMIN  – full access to everything.
 */

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const CLUB_HEAD_ROLES = ["CLUB_ADMIN", "CLUB_MANAGER"];
const LAB_ROLES = ["DEPARTMENT_OFFICER", "LAB_TECH"];

// ── Room permissions ──────────────────────────────────────────────────────────

/** Can see the room directory. */
export function canViewRooms(user: { role: string }): boolean {
  return ["PROFESSOR", "CLUB_ADMIN", "CLUB_MANAGER", "LHC", ...ADMIN_ROLES].includes(user.role);
}

/** Can submit a room booking. LHC approves — they don't book. */
export function canBookRoom(user: { role: string }): boolean {
  return ["PROFESSOR", "CLUB_ADMIN", "CLUB_MANAGER", ...ADMIN_ROLES].includes(user.role);
}

/** LHC can approve room bookings. */
export function canApproveRoom(user: { role: string }): boolean {
  return ["LHC", ...ADMIN_ROLES].includes(user.role);
}

/** LHC can edit room details / availability. */
export function canEditRoom(user: { role: string }): boolean {
  return ["LHC", ...ADMIN_ROLES].includes(user.role);
}

// ── Resource permissions ──────────────────────────────────────────────────────

type ResourceForBooking = { type: string; departmentId: string | null; clubId: string | null };
type UserForBooking = { role: string; departmentId: string | null; clubId: string | null };

/**
 * Can this user book this (non-room) resource?
 * – STUDENT:        any resource (dept or club)
 * – PROFESSOR:      dept resources only (not club-only resources)
 * – CLUB_HEAD:      any resource (dept or club)
 * – LAB_TECH /
 *   DEPT_OFFICER:   cannot book resources (manage & approve only)
 * – LHC:            cannot book resources
 * – ADMIN:          all
 */
export function canBookResource(user: UserForBooking, resource: ResourceForBooking): boolean {
  if (resource.type === "ROOM") return canBookRoom(user);
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (LAB_ROLES.includes(user.role)) return false;
  if (user.role === "LHC") return false;
  if (user.role === "STUDENT") return resource.departmentId != null || resource.clubId != null;
  if (user.role === "PROFESSOR") return resource.departmentId != null && resource.clubId == null;
  if (CLUB_HEAD_ROLES.includes(user.role)) return resource.departmentId != null || resource.clubId != null;
  return false;
}

// ── Resource management (CRUD) ────────────────────────────────────────────────

type ResourceForApproval = { type: string; ownerId: string | null; departmentId: string | null; clubId: string | null };
type UserForApproval = { role: string; id: string; departmentId: string | null; clubId: string | null };

/** Can approve this resource's bookings. */
export function canApproveResource(user: UserForApproval, resource: ResourceForApproval): boolean {
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (resource.type === "ROOM") return user.role === "LHC";
  if (resource.clubId && CLUB_HEAD_ROLES.includes(user.role) && user.clubId === resource.clubId) return true;
  if (resource.departmentId && LAB_ROLES.includes(user.role) && user.departmentId === resource.departmentId) return true;
  return false;
}

// ── Visibility helpers ────────────────────────────────────────────────────────

/** Can this user see the resource directory at all? */
export function canViewResourceDirectory(user: { role: string }): boolean {
  return !["LHC"].includes(user.role);
}

/** Can this user see club resources? */
export function canBrowseClubResources(user: { role: string }): boolean {
  return ["STUDENT", "CLUB_ADMIN", "CLUB_MANAGER", ...ADMIN_ROLES].includes(user.role);
}

/** Can this user see department resources? */
export function canBrowseDepartmentResources(_user: { role: string }): boolean {
  return true;
}

// ── Admin panel ───────────────────────────────────────────────────────────────

/** Has access to any admin section (Approvals, Audit, Users). */
export function hasAdminPanel(user: { role: string }): boolean {
  return ["CLUB_ADMIN", "CLUB_MANAGER", "DEPARTMENT_OFFICER", "LAB_TECH", "LHC", ...ADMIN_ROLES].includes(user.role);
}

export function canReopenOrOverride(user: { role: string }): boolean {
  return ADMIN_ROLES.includes(user.role);
}

export function requireRole(user: { role: string } | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/** Can this role book/manage any resource at all? Used for sidebar visibility. */
export function canBookAnyResource(user: { role: string }): boolean {
  return !["LHC", ...LAB_ROLES].includes(user.role);
}
