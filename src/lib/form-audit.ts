/**
 * Form audit & compliance log (non-negotiable).
 * Every change is logged:
 * - Form version publish history
 * - Submission timestamps (submission received)
 * - Staff edits to mapped profile data
 * - Merge decisions + what was overridden
 */

export type FormAuditAction =
  | "form_version_published"
  | "submission_received"
  | "staff_profile_edit"
  | "merge_decision";

export interface FormAuditEntry {
  id: string;
  timestamp: string; // ISO
  action: FormAuditAction;
  facilityId: number;
  /** Form version publish: formId; submission: formId; staff edit / merge: formId from submission */
  formId?: string;
  formName?: string;
  /** Form version publish */
  versionNumber?: number;
  versionId?: string;
  /** Submission received / staff edit / merge */
  submissionId?: string;
  /** Who performed the action (staff user id or "customer" / "system") */
  actorId?: string | number;
  actorName?: string;
  actorType?: "customer" | "staff" | "system";
  /** Staff profile edit: target entity */
  targetType?: "customer" | "pet";
  targetId?: string | number;
  /** Staff edit: field-level changes (field, oldValue, newValue) */
  changes?: { field: string; oldValue: string; newValue: string }[];
  /** Merge: rule applied */
  mergeRule?: "submitted_wins" | "existing_wins" | "ask";
  /** Merge: what was overridden (field, submittedValue, existingValue) */
  overrides?: { field: string; submittedValue: string; existingValue: string }[];
  /** Merge: linked customer/pet */
  relatedCustomerId?: number;
  relatedPetId?: number;
  /** Extra context */
  metadata?: Record<string, unknown>;
}

const auditLog: FormAuditEntry[] = [];

function nextId(): string {
  return `fa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function log(entry: Omit<FormAuditEntry, "id" | "timestamp">): FormAuditEntry {
  const full: FormAuditEntry = {
    ...entry,
    id: nextId(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

/** Log when a form version is published (publish history). */
export function logFormVersionPublish(params: {
  facilityId: number;
  formId: string;
  formName: string;
  versionNumber: number;
  versionId: string;
  publishedBy?: string;
}): FormAuditEntry {
  return log({
    action: "form_version_published",
    facilityId: params.facilityId,
    formId: params.formId,
    formName: params.formName,
    versionNumber: params.versionNumber,
    versionId: params.versionId,
    actorId: params.publishedBy ?? "system",
    actorType: "staff",
    metadata: params.publishedBy ? { publishedBy: params.publishedBy } : undefined,
  });
}

/** Log when a submission is received (submission timestamps; immutable record already has createdAt). */
export function logSubmissionReceived(params: {
  facilityId: number;
  formId: string;
  formName?: string;
  submissionId: string;
  submittedAt: string; // ISO
  customerId?: number;
  petIds?: number[];
}): FormAuditEntry {
  return log({
    action: "submission_received",
    facilityId: params.facilityId,
    formId: params.formId,
    formName: params.formName,
    submissionId: params.submissionId,
    actorType: "customer",
    metadata: {
      submittedAt: params.submittedAt,
      customerId: params.customerId,
      petIds: params.petIds,
    },
  });
}

/**
 * Log when staff edit profile data that was mapped from or related to a form submission.
 * Call this when: applying mapped submission data to customer/pet profile, or when staff
 * edit a customer/pet field that was populated from a form (so every change is logged).
 */
export function logStaffProfileEdit(params: {
  facilityId: number;
  submissionId: string;
  formId: string;
  staffUserId: string | number;
  staffUserName?: string;
  targetType: "customer" | "pet";
  targetId: string | number;
  changes: { field: string; oldValue: string; newValue: string }[];
}): FormAuditEntry {
  return log({
    action: "staff_profile_edit",
    facilityId: params.facilityId,
    formId: params.formId,
    submissionId: params.submissionId,
    actorId: params.staffUserId,
    actorName: params.staffUserName,
    actorType: "staff",
    targetType: params.targetType,
    targetId: params.targetId,
    changes: params.changes,
  });
}

/** Log merge decision when linking submission to existing profile (rule + what was overridden). */
export function logMergeDecision(params: {
  facilityId: number;
  submissionId: string;
  formId: string;
  staffUserId?: string | number;
  staffUserName?: string;
  relatedCustomerId: number;
  relatedPetId?: number;
  mergeRule: "submitted_wins" | "existing_wins" | "ask";
  overrides: { field: string; submittedValue: string; existingValue: string }[];
}): FormAuditEntry {
  return log({
    action: "merge_decision",
    facilityId: params.facilityId,
    formId: params.formId,
    submissionId: params.submissionId,
    actorId: params.staffUserId ?? "system",
    actorName: params.staffUserName,
    actorType: "staff",
    mergeRule: params.mergeRule,
    overrides: params.overrides,
    relatedCustomerId: params.relatedCustomerId,
    relatedPetId: params.relatedPetId,
  });
}

export interface FormAuditFilters {
  facilityId?: number;
  formId?: string;
  submissionId?: string;
  action?: FormAuditAction;
  from?: string; // ISO date
  to?: string;
}

/** Query form audit log for compliance and audit views. */
export function getFormAuditLog(filters?: FormAuditFilters): FormAuditEntry[] {
  let list = [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  if (filters?.facilityId != null)
    list = list.filter((e) => e.facilityId === filters.facilityId);
  if (filters?.formId) list = list.filter((e) => e.formId === filters.formId);
  if (filters?.submissionId)
    list = list.filter((e) => e.submissionId === filters.submissionId);
  if (filters?.action) list = list.filter((e) => e.action === filters.action);
  if (filters?.from)
    list = list.filter((e) => e.timestamp >= filters.from!);
  if (filters?.to)
    list = list.filter((e) => e.timestamp <= filters.to!);
  return list;
}

/** Map form audit entry to tenant audit log shape for facility audit tab. */
export function formAuditEntryToTenantAuditLog(entry: FormAuditEntry): {
  id: string;
  facilityId: number;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  category: "Data";
  entityType: string;
  entityId: string;
  entityName: string;
  changes: { field: string; oldValue: string; newValue: string }[];
  ipAddress: string;
  userAgent: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Success";
  description: string;
} {
  const actionLabels: Record<FormAuditAction, string> = {
    form_version_published: "Form version published",
    submission_received: "Form submission received",
    staff_profile_edit: "Staff edited profile from submission",
    merge_decision: "Merge decision (submission linked to profile)",
  };
  const entityName =
    entry.formName ?? entry.formId ?? entry.submissionId ?? "Form";
  let description = actionLabels[entry.action];
  if (entry.action === "merge_decision" && entry.overrides?.length) {
    description += `; ${entry.overrides.length} override(s)`;
  }
  return {
    id: entry.id,
    facilityId: entry.facilityId,
    timestamp: entry.timestamp,
    userId: String(entry.actorId ?? "system"),
    userName: entry.actorName ?? "System",
    userRole: entry.actorType === "staff" ? "Staff" : entry.actorType === "customer" ? "Customer" : "System",
    action: actionLabels[entry.action],
    category: "Data",
    entityType: "Form",
    entityId: entry.submissionId ?? entry.formId ?? "",
    entityName,
    changes: entry.changes ?? entry.overrides?.map((o) => ({
      field: o.field,
      oldValue: o.existingValue,
      newValue: o.submittedValue,
    })) ?? [],
    ipAddress: "",
    userAgent: "",
    severity: "Low",
    status: "Success",
    description,
  };
}
