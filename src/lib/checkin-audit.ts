/**
 * Check-in audit log: customer submission (original), staff edits, check-in completion.
 * Stores timestamps + user IDs for compliance and traceability.
 */

import type { CheckInAuditAction, CheckInAuditEntry } from "@/types/yipyygo";

export type { CheckInAuditAction, CheckInAuditEntry };

const auditLog: CheckInAuditEntry[] = [];

function nextId(): string {
  return `cia-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function logCheckInAudit(
  entry: Omit<CheckInAuditEntry, "id" | "timestamp">,
): CheckInAuditEntry {
  const full: CheckInAuditEntry = {
    ...entry,
    id: nextId(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

/** Log when customer submits YipyyGo form (original submission). */
export function logCustomerSubmission(params: {
  facilityId: number;
  bookingId: number;
  petId: number;
  userId: number;
  userName?: string;
  metadata?: Record<string, unknown>;
}): CheckInAuditEntry {
  return logCheckInAudit({
    action: "customer_submission",
    facilityId: params.facilityId,
    bookingId: params.bookingId,
    petId: params.petId,
    userId: params.userId,
    userName: params.userName,
    actorType: "customer",
    details: "YipyyGo form submitted",
    metadata: params.metadata,
  });
}

/** Log when staff edits/approves/requests changes. */
export function logStaffEdit(params: {
  facilityId: number;
  bookingId: number;
  petId?: number;
  staffUserId: number;
  staffUserName?: string;
  details: string;
  metadata?: Record<string, unknown>;
}): CheckInAuditEntry {
  return logCheckInAudit({
    action: "staff_edit",
    facilityId: params.facilityId,
    bookingId: params.bookingId,
    petId: params.petId,
    userId: params.staffUserId,
    userName: params.staffUserName,
    actorType: "staff",
    details: params.details,
    metadata: params.metadata,
  });
}

/** Log when staff marks form manually complete (no customer submission). */
export function logStaffManualComplete(params: {
  facilityId: number;
  bookingId: number;
  petId?: number;
  staffUserId: number;
  staffUserName?: string;
}): CheckInAuditEntry {
  return logCheckInAudit({
    action: "staff_manual_complete",
    facilityId: params.facilityId,
    bookingId: params.bookingId,
    petId: params.petId,
    userId: params.staffUserId,
    userName: params.staffUserName,
    actorType: "staff",
    details: "Form marked complete by staff",
  });
}

/** Log when staff overrides mandatory pre-check and checks in (reason required). */
export function logStaffOverride(params: {
  facilityId: number;
  bookingId: number;
  petId?: number;
  staffUserId: number;
  staffUserName?: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): CheckInAuditEntry {
  return logCheckInAudit({
    action: "staff_override",
    facilityId: params.facilityId,
    bookingId: params.bookingId,
    petId: params.petId,
    userId: params.staffUserId,
    userName: params.staffUserName,
    actorType: "staff",
    details: `Pre-check override: ${params.reason}`,
    metadata: params.metadata,
  });
}

/** Log when check-in is completed (QR or manual at front desk). */
export function logCheckInCompleted(params: {
  facilityId: number;
  bookingId: number;
  petId?: number;
  staffUserId?: number;
  staffUserName?: string;
  source: "qr" | "manual";
  metadata?: Record<string, unknown>;
}): CheckInAuditEntry {
  return logCheckInAudit({
    action: "check_in_completed",
    facilityId: params.facilityId,
    bookingId: params.bookingId,
    petId: params.petId,
    userId: params.staffUserId ?? "system",
    userName: params.staffUserName,
    actorType: params.staffUserId != null ? "staff" : "system",
    details: `Check-in completed via ${params.source}`,
    metadata: params.metadata,
  });
}

export function getCheckInAuditLog(filters?: {
  facilityId?: number;
  bookingId?: number;
  action?: CheckInAuditAction;
}): CheckInAuditEntry[] {
  let list = [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  if (filters?.facilityId != null)
    list = list.filter((e) => e.facilityId === filters.facilityId);
  if (filters?.bookingId != null)
    list = list.filter((e) => e.bookingId === filters.bookingId);
  if (filters?.action != null)
    list = list.filter((e) => e.action === filters.action);
  return list;
}
