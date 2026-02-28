import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type AuditAction =
  | "BOOKING_CREATED"
  | "BOOKING_APPROVED"
  | "BOOKING_REJECTED"
  | "BOOKING_CANCELLED"
  | "BOOKING_WAITLISTED"
  | "BOOKING_OVERRIDDEN"
  | "BOOKING_REOPENED"
  | "WAITLIST_PROMOTED"
  | "RESOURCE_CREATED"
  | "RESOURCE_UPDATED"
  | "RESOURCE_DELETED"
  | "USER_REGISTERED"
  | "USER_ROLE_CHANGED"
  | "USER_LOGIN";

export type { AuditAction };

export async function createAuditLog(params: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  oldState?: string | null;
  newState?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      oldState: params.oldState ?? undefined,
      newState: params.newState ?? undefined,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: params.ipAddress,
    },
  });
}
