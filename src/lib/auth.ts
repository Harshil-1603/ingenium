import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import prisma from "./prisma";
import type { SafeUser, JWTPayload } from "@/types";

const TOKEN_NAME = "campus-grid-token";

export async function getTokenPayload(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const payload = await getTokenPayload();
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      rollNumber: true,
      department: true,
      departmentId: true,
      clubId: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || !user.isActive) return null;
  return user as SafeUser;
}

export function setTokenCookie(token: string) {
  return {
    "Set-Cookie": `${TOKEN_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  };
}

export function clearTokenCookie() {
  return {
    "Set-Cookie": `${TOKEN_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  };
}

export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

export function canManageResource(userRole: string, resourceOwnerId: string | null, userId: string): boolean {
  if (userRole === "SUPER_ADMIN") return true;
  if (userRole === "DEPARTMENT_OFFICER" && resourceOwnerId === userId) return true;
  return false;
}

export function canApproveBooking(userRole: string, resourceOwnerId: string | null, userId: string): boolean {
  if (["SUPER_ADMIN", "ADMIN"].includes(userRole)) return true;
  if (["DEPARTMENT_OFFICER", "LAB_TECH"].includes(userRole) && resourceOwnerId === userId) return true;
  if (["CLUB_ADMIN", "CLUB_MANAGER"].includes(userRole) && resourceOwnerId === userId) return true;
  if (userRole === "LHC") return true; // LHC approves room bookings (resource owner is LHC)
  return false;
}
