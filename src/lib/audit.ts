import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type AuditAction =
  | "BOOKING_CREATED"
  | "BOOKING_APPROVED"
  | "BOOKING_REJECTED"
  | "BOOKING_CANCELLED"
  | "BOOKING_WAITLISTED"
  | "WAITLIST_PROMOTED"
  | "RESOURCE_CREATED"
  | "RESOURCE_UPDATED"
  | "RESOURCE_DELETED"
  | "USER_REGISTERED"
  | "USER_ROLE_CHANGED"
  | "USER_LOGIN";

export async function createAuditLog(params: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: params.ipAddress,
    },
  });
}
