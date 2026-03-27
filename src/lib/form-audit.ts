/**
 * Form audit & compliance log (non-negotiable).
 * Every change is logged:
 * - Form version publish history
 * - Submission timestamps (submission received)
 * - Staff edits to mapped profile data
 * - Merge decisions + what was overridden
 */

import type { FormAuditAction, FormAuditEntry } from "@/types/forms";

export type { FormAuditAction, FormAuditEntry } from "@/types/forms";

const auditLog: FormAuditEntry[] = [
  // Seed data — realistic audit trail entries for demo
  {
    id: "fa-seed-001",
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    action: "form_version_published",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    versionNumber: 1,
    versionId: "ver-intake-v1",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "fa-seed-002",
    timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    action: "form_version_published",
    facilityId: 11,
    formId: "form-pet-profile",
    formName: "Pet Profile Form",
    versionNumber: 1,
    versionId: "ver-pet-v1",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "fa-seed-003",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    action: "submission_received",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-001",
    actorType: "customer",
    actorName: "Alice Johnson",
    metadata: {
      submittedAt: new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      customerId: 201,
    },
  },
  {
    id: "fa-seed-004",
    timestamp: new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
    ).toISOString(),
    action: "merge_decision",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-001",
    actorId: "user-102",
    actorName: "James Park",
    actorType: "staff",
    mergeRule: "submitted_wins",
    overrides: [
      {
        field: "Phone Number",
        submittedValue: "(555) 234-5678",
        existingValue: "(555) 111-2222",
      },
      {
        field: "Emergency Contact",
        submittedValue: "Bob Johnson",
        existingValue: "",
      },
    ],
    relatedCustomerId: 201,
  },
  {
    id: "fa-seed-005",
    timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    action: "submission_received",
    facilityId: 11,
    formId: "form-pet-profile",
    formName: "Pet Profile Form",
    submissionId: "sub-002",
    actorType: "customer",
    actorName: "Alice Johnson",
    metadata: {
      submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      customerId: 201,
      petIds: [301],
    },
  },
  {
    id: "fa-seed-006",
    timestamp: new Date(
      Date.now() - 9 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000,
    ).toISOString(),
    action: "staff_profile_edit",
    facilityId: 11,
    formId: "form-pet-profile",
    formName: "Pet Profile Form",
    submissionId: "sub-002",
    actorId: "user-102",
    actorName: "James Park",
    actorType: "staff",
    targetType: "pet",
    targetId: 301,
    changes: [
      {
        field: "Breed",
        oldValue: "Golden Retreiver",
        newValue: "Golden Retriever",
      },
      { field: "Weight", oldValue: "65 lbs", newValue: "72 lbs" },
    ],
  },
  {
    id: "fa-seed-007",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    action: "form_version_published",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    versionNumber: 2,
    versionId: "ver-intake-v2",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "fa-seed-008",
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    action: "submission_received",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-003",
    actorType: "customer",
    actorName: "Michael Torres",
    metadata: {
      submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      customerId: 202,
    },
  },
  {
    id: "fa-seed-009",
    timestamp: new Date(
      Date.now() - 6 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000,
    ).toISOString(),
    action: "merge_decision",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-003",
    actorId: "user-103",
    actorName: "Emily Chen",
    actorType: "staff",
    mergeRule: "existing_wins",
    overrides: [
      {
        field: "Address",
        submittedValue: "456 Oak Ave",
        existingValue: "123 Main St",
      },
    ],
    relatedCustomerId: 202,
  },
  {
    id: "fa-seed-010",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    action: "submission_received",
    facilityId: 11,
    formId: "form-pet-profile",
    formName: "Pet Profile Form",
    submissionId: "sub-004",
    actorType: "customer",
    actorName: "Michael Torres",
    metadata: {
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      customerId: 202,
      petIds: [302],
    },
  },
  {
    id: "fa-seed-011",
    timestamp: new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000,
    ).toISOString(),
    action: "staff_profile_edit",
    facilityId: 11,
    formId: "form-pet-profile",
    formName: "Pet Profile Form",
    submissionId: "sub-004",
    actorId: "user-103",
    actorName: "Emily Chen",
    actorType: "staff",
    targetType: "pet",
    targetId: 302,
    changes: [
      {
        field: "Vaccination Status",
        oldValue: "Unknown",
        newValue: "Up to date",
      },
      {
        field: "Special Needs",
        oldValue: "",
        newValue: "Requires grain-free diet",
      },
    ],
  },
  {
    id: "fa-seed-012",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    action: "submission_received",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-005",
    actorType: "customer",
    actorName: "Rachel Kim",
    metadata: {
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      customerId: 203,
    },
  },
  {
    id: "fa-seed-013",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    action: "merge_decision",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-005",
    actorId: "user-102",
    actorName: "James Park",
    actorType: "staff",
    mergeRule: "ask",
    overrides: [
      {
        field: "Email",
        submittedValue: "rachel.new@email.com",
        existingValue: "rachel.old@email.com",
      },
      {
        field: "Phone Number",
        submittedValue: "(555) 999-8888",
        existingValue: "(555) 777-6666",
      },
    ],
    relatedCustomerId: 203,
  },
  {
    id: "fa-seed-014",
    timestamp: new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000,
    ).toISOString(),
    action: "staff_profile_edit",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-005",
    actorId: "user-102",
    actorName: "James Park",
    actorType: "staff",
    targetType: "customer",
    targetId: 203,
    changes: [
      {
        field: "Email",
        oldValue: "rachel.old@email.com",
        newValue: "rachel.new@email.com",
      },
      {
        field: "Phone Number",
        oldValue: "(555) 777-6666",
        newValue: "(555) 999-8888",
      },
      { field: "Preferred Contact", oldValue: "Phone", newValue: "Email" },
    ],
  },
  {
    id: "fa-seed-015",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    action: "form_version_published",
    facilityId: 11,
    formId: "form-boarding-agreement",
    formName: "Boarding Agreement",
    versionNumber: 1,
    versionId: "ver-boarding-v1",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
  },
  {
    id: "fa-seed-016",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    action: "submission_received",
    facilityId: 11,
    formId: "form-boarding-agreement",
    formName: "Boarding Agreement",
    submissionId: "sub-006",
    actorType: "customer",
    actorName: "Alice Johnson",
    metadata: {
      submittedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      customerId: 201,
      petIds: [301],
    },
  },
  {
    id: "fa-seed-017",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    action: "submission_received",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-007",
    actorType: "customer",
    actorName: "David Nguyen",
    metadata: {
      submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      customerId: 204,
    },
  },
  {
    id: "fa-seed-018",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    action: "merge_decision",
    facilityId: 11,
    formId: "form-intake-demo",
    formName: "New Client Intake Form",
    submissionId: "sub-007",
    actorId: "user-101",
    actorName: "Sarah Mitchell",
    actorType: "staff",
    mergeRule: "submitted_wins",
    overrides: [],
    relatedCustomerId: 204,
  },
];

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
    metadata: params.publishedBy
      ? { publishedBy: params.publishedBy }
      : undefined,
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
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  if (filters?.facilityId != null)
    list = list.filter((e) => e.facilityId === filters.facilityId);
  if (filters?.formId) list = list.filter((e) => e.formId === filters.formId);
  if (filters?.submissionId)
    list = list.filter((e) => e.submissionId === filters.submissionId);
  if (filters?.action) list = list.filter((e) => e.action === filters.action);
  if (filters?.from) list = list.filter((e) => e.timestamp >= filters.from!);
  if (filters?.to) list = list.filter((e) => e.timestamp <= filters.to!);
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
    userRole:
      entry.actorType === "staff"
        ? "Staff"
        : entry.actorType === "customer"
          ? "Customer"
          : "System",
    action: actionLabels[entry.action],
    category: "Data",
    entityType: "Form",
    entityId: entry.submissionId ?? entry.formId ?? "",
    entityName,
    changes:
      entry.changes ??
      entry.overrides?.map((o) => ({
        field: o.field,
        oldValue: o.existingValue,
        newValue: o.submittedValue,
      })) ??
      [],
    ipAddress: "",
    userAgent: "",
    severity: "Low",
    status: "Success",
    description,
  };
}
