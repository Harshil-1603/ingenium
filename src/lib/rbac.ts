/**
 * Role-based access control: clubs & departments.
 * - Admin: full access.
 * - Professor: book room + department resources only; no admin panel.
 * - Student: no room; book club + department resources; no admin panel.
 * - LHC: approve room allocation only; no booking, no resource approval.
 * - Club (CLUB_ADMIN/CLUB_MANAGER): book room + club resources; approve only their club's resources.
 * - Department (DEPARTMENT_OFFICER/LAB_TECH): book room + department resources; approve only their department's resources.
 */

import type { Resource, User } from "@prisma/client";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const LHC_ROLES = ["LHC", ...ADMIN_ROLES];
const CLUB_MANAGER_ROLES = ["CLUB_ADMIN", "CLUB_MANAGER", ...ADMIN_ROLES];
const DEPT_OFFICER_ROLES = ["DEPARTMENT_OFFICER", "LAB_TECH", ...ADMIN_ROLES];

/** Can book a room (any LHC-owned room). LHC and Student cannot. */
export function canBookRoom(user: { role: string }): boolean {
  if (["LHC", "STUDENT"].includes(user.role)) return false;
  return ["PROFESSOR", "CLUB_ADMIN", "CLUB_MANAGER", "DEPARTMENT_OFFICER", "LAB_TECH", ...ADMIN_ROLES].includes(user.role);
}

/** LHC can approve only room bookings. */
export function canApproveRoom(user: { role: string; id: string }): boolean {
  return LHC_ROLES.includes(user.role);
}

type ResourceForApproval = { type: string; ownerId: string | null; departmentId: string | null; clubId: string | null };
type UserForApproval = { role: string; id: string; departmentId: string | null; clubId: string | null };

/** Who can approve this resource's bookings: Admin; LHC only for ROOM; club for their club; dept for their dept. */
export function canApproveResource(
  user: UserForApproval,
  resource: ResourceForApproval
): boolean {
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (resource.type === "ROOM") return user.role === "LHC" || ADMIN_ROLES.includes(user.role);
  if (resource.clubId && CLUB_MANAGER_ROLES.includes(user.role) && user.clubId === resource.clubId) return true;
  if (resource.departmentId && DEPT_OFFICER_ROLES.includes(user.role) && user.departmentId === resource.departmentId) return true;
  return false;
}

type ResourceForBooking = { type: string; departmentId: string | null; clubId: string | null };
type UserForBooking = { role: string; departmentId: string | null; clubId: string | null };

/** Can this user book this (non-room) resource? Student: club + dept. Professor: dept only. Club: their club. Dept: their dept. Admin: all. */
export function canBookResource(
  user: UserForBooking,
  resource: ResourceForBooking
): boolean {
  if (resource.type === "ROOM") return canBookRoom(user);
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (user.role === "STUDENT") {
    return resource.departmentId != null || resource.clubId != null;
  }
  if (user.role === "PROFESSOR") {
    return resource.departmentId != null;
  }
  if (CLUB_MANAGER_ROLES.includes(user.role) && resource.clubId != null) {
    return user.clubId === resource.clubId;
  }
  if (DEPT_OFFICER_ROLES.includes(user.role) && resource.departmentId != null) {
    return user.departmentId === resource.departmentId;
  }
  return false;
}

export function requireRole(user: { role: string } | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function canBrowseClubResources(user: { role: string }): boolean {
  return ["STUDENT", "CLUB_ADMIN", "CLUB_MANAGER", ...ADMIN_ROLES].includes(user.role);
}

export function canBrowseDepartmentResources(_user: { role: string }): boolean {
  return true;
}

export function canReopenOrOverride(user: { role: string }): boolean {
  return ADMIN_ROLES.includes(user.role);
}

/** Has access to any admin section (Approvals, Audit, Users). Professor and Student do not. */
export function hasAdminPanel(user: { role: string }): boolean {
  return ["CLUB_ADMIN", "CLUB_MANAGER", "DEPARTMENT_OFFICER", "LAB_TECH", "LHC", ...ADMIN_ROLES].includes(user.role);
}
