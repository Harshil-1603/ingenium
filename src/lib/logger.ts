/**
 * Structured logger for audit: who, action, entity, oldState, newState, timestamp.
 * Used for approve, reject, cancel, override, reopen, add/remove resource.
 */
import { createAuditLog, type AuditAction } from "./audit";

export async function logAction(params: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldState?: string | null;
  newState?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return createAuditLog({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    userId: params.userId,
    oldState: params.oldState,
    newState: params.newState,
    metadata: params.metadata,
  });
}
