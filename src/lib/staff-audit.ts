/**
 * Staff audit trail — tracks every change to staff profiles, status,
 * permissions, payroll, and invitations.
 *
 * Only owner and manager roles may read the audit log (enforced in the UI
 * via useFacilityRbac). All writes happen automatically via the loggers below.
 */

import type { FacilityStaffRole, StaffProfile } from "@/types/facility-staff";
import { ROLE_META } from "@/types/facility-staff";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffAuditAction =
  | "staff_created"
  | "staff_updated"
  | "staff_deleted"
  | "status_changed"
  | "permissions_changed"
  | "payroll_changed"
  | "invitation_sent";

export interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface StaffAuditEntry {
  id: string;
  timestamp: string;
  action: StaffAuditAction;
  /** The staff member whose record changed */
  subjectId: string;
  subjectName: string;
  /** Who made the change */
  actorId: string;
  actorName: string;
  actorRole: FacilityStaffRole;
  /** Field-level diffs (profile / payroll updates) */
  changes?: FieldChange[];
  /** Structured context — status codes, counts, etc. */
  metadata?: Record<string, string | number | boolean | null>;
  /** Free-text note recorded at change time */
  note?: string;
}

// ─── In-memory log + seed data ────────────────────────────────────────────────

const auditLog: StaffAuditEntry[] = [
  {
    id: "staf-seed-001",
    timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    action: "staff_created",
    subjectId: "fs-groom-01",
    subjectName: "Olivia Beaumont",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
    metadata: { role: "groomer" },
  },
  {
    id: "staf-seed-002",
    timestamp: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString(),
    action: "invitation_sent",
    subjectId: "fs-groom-01",
    subjectName: "Olivia Beaumont",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
  },
  {
    id: "staf-seed-003",
    timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    action: "staff_updated",
    subjectId: "fs-mgr-01",
    subjectName: "Nathalie Côté",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
    changes: [
      { field: "Hourly rate", oldValue: "$28/hr", newValue: "$34/hr" },
      { field: "Service commission", oldValue: "6%", newValue: "8%" },
    ],
    note: "Annual compensation review — Q1 increase approved.",
  },
  {
    id: "staf-seed-004",
    timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    action: "staff_created",
    subjectId: "fs-rec-01",
    subjectName: "Yasmine Tremblay",
    actorId: "fs-mgr-01",
    actorName: "Nathalie Côté",
    actorRole: "manager",
    metadata: { role: "reception" },
  },
  {
    id: "staf-seed-005",
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    action: "permissions_changed",
    subjectId: "fs-rec-01",
    subjectName: "Yasmine Tremblay",
    actorId: "fs-mgr-01",
    actorName: "Nathalie Côté",
    actorRole: "manager",
    metadata: { permissionsChanged: 3 },
    note: "Granted view_revenue, apply_discount, and communicate_clients for Plateau.",
  },
  {
    id: "staf-seed-006",
    timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    action: "staff_updated",
    subjectId: "fs-rec-01",
    subjectName: "Yasmine Tremblay",
    actorId: "fs-mgr-01",
    actorName: "Nathalie Côté",
    actorRole: "manager",
    changes: [
      { field: "Additional roles", oldValue: "—", newValue: "Daycare Attendant" },
      { field: "Services", oldValue: "Reception", newValue: "Reception, Daycare" },
    ],
  },
  {
    id: "staf-seed-007",
    timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    action: "status_changed",
    subjectId: "fs-groom-01",
    subjectName: "Olivia Beaumont",
    actorId: "fs-mgr-01",
    actorName: "Nathalie Côté",
    actorRole: "manager",
    metadata: {
      previousStatus: "active",
      newStatus: "inactive",
      reason: "medical_leave",
    },
    note: "Scheduled leave for knee surgery recovery — expected 3 weeks.",
  },
  {
    id: "staf-seed-008",
    timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
    action: "staff_updated",
    subjectId: "fs-groom-01",
    subjectName: "Olivia Beaumont",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
    changes: [
      { field: "Job title", oldValue: "—", newValue: "Senior Groomer" },
      {
        field: "Locations",
        oldValue: "Plateau Flagship",
        newValue: "Plateau Flagship, Westmount Suites",
      },
    ],
  },
  {
    id: "staf-seed-009",
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    action: "payroll_changed",
    subjectId: "fs-groom-01",
    subjectName: "Olivia Beaumont",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
    changes: [
      { field: "Hourly rate", oldValue: "$19/hr", newValue: "$22/hr" },
      { field: "Tips rate", oldValue: "None", newValue: "100% retained" },
    ],
    note: "Annual review pay increase. Approved in board meeting Apr 2.",
  },
  {
    id: "staf-seed-010",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    action: "status_changed",
    subjectId: "fs-groom-01",
    subjectName: "Olivia Beaumont",
    actorId: "fs-mgr-01",
    actorName: "Nathalie Côté",
    actorRole: "manager",
    metadata: {
      previousStatus: "inactive",
      newStatus: "active",
      reason: "rehired",
    },
    note: "Cleared by physiotherapist — back to full grooming duties.",
  },
  {
    id: "staf-seed-011",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    action: "permissions_changed",
    subjectId: "fs-mgr-01",
    subjectName: "Nathalie Côté",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
    metadata: { permissionsChanged: 2 },
    note: "Enabled edit_payroll and export_financials for Q2 payroll cycle.",
  },
  {
    id: "staf-seed-012",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    action: "invitation_sent",
    subjectId: "fs-rec-01",
    subjectName: "Yasmine Tremblay",
    actorId: "fs-mgr-01",
    actorName: "Nathalie Côté",
    actorRole: "manager",
    note: "Resent — original link expired after 48 hours.",
  },
  {
    id: "staf-seed-013",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    action: "staff_updated",
    subjectId: "fs-rec-01",
    subjectName: "Yasmine Tremblay",
    actorId: "fs-mgr-01",
    actorName: "Nathalie Côté",
    actorRole: "manager",
    changes: [
      { field: "Employment type", oldValue: "Part time", newValue: "Full time" },
      { field: "Hourly rate", oldValue: "$18/hr", newValue: "$22/hr" },
    ],
    note: "Converted from part-time to full-time effective May 1.",
  },
  {
    id: "staf-seed-014",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    action: "staff_updated",
    subjectId: "fs-owner-01",
    subjectName: "Émilie Laurent",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
    changes: [
      { field: "Phone", oldValue: "+1-514-555-0101", newValue: "+1-514-555-0199" },
    ],
  },
  {
    id: "staf-seed-015",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    action: "permissions_changed",
    subjectId: "fs-groom-01",
    subjectName: "Olivia Beaumont",
    actorId: "fs-owner-01",
    actorName: "Émilie Laurent",
    actorRole: "owner",
    metadata: { permissionsChanged: 1 },
    note: "Granted manage_supplies override for Westmount location.",
  },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

function nextId(): string {
  return `staf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function append(
  entry: Omit<StaffAuditEntry, "id" | "timestamp">,
): StaffAuditEntry {
  const full: StaffAuditEntry = {
    ...entry,
    id: nextId(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

// ─── Profile diff ─────────────────────────────────────────────────────────────

/**
 * Compares two StaffProfile snapshots and returns a list of human-readable
 * field changes. Only non-trivial fields are compared (not internal counters
 * like upcomingAppointments).
 */
export function diffProfile(
  prev: StaffProfile,
  next: StaffProfile,
): FieldChange[] {
  const changes: FieldChange[] = [];

  const push = (field: string, oldVal: string, newVal: string) => {
    if (oldVal !== newVal) changes.push({ field, oldValue: oldVal, newValue: newVal });
  };

  // Identity
  const fullName = (p: StaffProfile) => `${p.firstName} ${p.lastName}`.trim();
  if (fullName(prev) !== fullName(next)) {
    push("Full name", fullName(prev), fullName(next));
  }
  push("Email", prev.email, next.email);
  push("Phone", prev.phone, next.phone);
  push("Job title", prev.jobTitle ?? "—", next.jobTitle ?? "—");

  // Role
  push(
    "Primary role",
    ROLE_META[prev.primaryRole].label,
    ROLE_META[next.primaryRole].label,
  );
  const fmtRoles = (p: StaffProfile) =>
    p.additionalRoles.map((r) => ROLE_META[r].label).join(", ") || "—";
  push("Additional roles", fmtRoles(prev), fmtRoles(next));

  // Services
  const fmtServices = (p: StaffProfile) =>
    p.serviceAssignments
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(", ") || "—";
  push("Services", fmtServices(prev), fmtServices(next));

  // Locations (compare sorted id lists, show count label)
  const locKey = (p: StaffProfile) => [...p.assignedLocations].sort().join(",");
  if (locKey(prev) !== locKey(next)) {
    push(
      "Locations",
      `${prev.assignedLocations.length} location(s)`,
      `${next.assignedLocations.length} location(s)`,
    );
  }

  // Calendar
  push(
    "Show on calendar",
    prev.showOnCalendar ? "Yes" : "No",
    next.showOnCalendar ? "Yes" : "No",
  );

  // Employment
  push(
    "Employment type",
    prev.employment.employmentType.replace(/_/g, " "),
    next.employment.employmentType.replace(/_/g, " "),
  );
  push("Hire date", prev.employment.hireDate, next.employment.hireDate);

  // Payroll
  if (prev.payroll.hourlyRate !== next.payroll.hourlyRate) {
    push(
      "Hourly rate",
      prev.payroll.hourlyRate > 0 ? `$${prev.payroll.hourlyRate}/hr` : "—",
      next.payroll.hourlyRate > 0 ? `$${next.payroll.hourlyRate}/hr` : "—",
    );
  }
  if (prev.payroll.generalServiceCommission !== next.payroll.generalServiceCommission) {
    push(
      "Service commission",
      prev.payroll.generalServiceCommission > 0
        ? `${prev.payroll.generalServiceCommission}%`
        : "—",
      next.payroll.generalServiceCommission > 0
        ? `${next.payroll.generalServiceCommission}%`
        : "—",
    );
  }
  if (prev.payroll.tipsRate !== next.payroll.tipsRate) {
    push(
      "Tips rate",
      prev.payroll.tipsRate > 0 ? `${prev.payroll.tipsRate}% retained` : "None",
      next.payroll.tipsRate > 0 ? `${next.payroll.tipsRate}% retained` : "None",
    );
  }

  return changes;
}

// ─── Loggers ──────────────────────────────────────────────────────────────────

export interface AuditActor {
  actorId: string;
  actorName: string;
  actorRole: FacilityStaffRole;
}

export interface AuditSubject {
  subjectId: string;
  subjectName: string;
}

export function logStaffCreated(
  subject: AuditSubject,
  actor: AuditActor,
  role: FacilityStaffRole,
): StaffAuditEntry {
  return append({
    action: "staff_created",
    ...subject,
    ...actor,
    metadata: { role },
  });
}

export function logStaffUpdated(
  subject: AuditSubject,
  actor: AuditActor,
  changes: FieldChange[],
  note?: string,
): StaffAuditEntry {
  return append({ action: "staff_updated", ...subject, ...actor, changes, note });
}

export function logStatusChanged(
  subject: AuditSubject,
  actor: AuditActor,
  previousStatus: string,
  newStatus: string,
  reason: string,
  note?: string,
): StaffAuditEntry {
  return append({
    action: "status_changed",
    ...subject,
    ...actor,
    metadata: { previousStatus, newStatus, reason },
    note,
  });
}

export function logStaffDeleted(
  subject: AuditSubject,
  actor: AuditActor,
): StaffAuditEntry {
  return append({ action: "staff_deleted", ...subject, ...actor });
}

export function logInvitationSent(
  subject: AuditSubject,
  actor: AuditActor,
  note?: string,
): StaffAuditEntry {
  return append({ action: "invitation_sent", ...subject, ...actor, note });
}

export function logPermissionsChanged(
  subject: AuditSubject,
  actor: AuditActor,
  count: number,
  note?: string,
): StaffAuditEntry {
  return append({
    action: "permissions_changed",
    ...subject,
    ...actor,
    metadata: { permissionsChanged: count },
    note,
  });
}

export function logPayrollChanged(
  subject: AuditSubject,
  actor: AuditActor,
  changes: FieldChange[],
  note?: string,
): StaffAuditEntry {
  return append({ action: "payroll_changed", ...subject, ...actor, changes, note });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface StaffAuditFilters {
  subjectId?: string;
  actorId?: string;
  action?: StaffAuditAction;
  from?: string;
  to?: string;
}

export function getStaffAuditLog(filters?: StaffAuditFilters): StaffAuditEntry[] {
  let list = [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  if (filters?.subjectId)
    list = list.filter((e) => e.subjectId === filters.subjectId);
  if (filters?.actorId)
    list = list.filter((e) => e.actorId === filters.actorId);
  if (filters?.action)
    list = list.filter((e) => e.action === filters.action);
  if (filters?.from)
    list = list.filter((e) => e.timestamp >= filters.from!);
  if (filters?.to)
    list = list.filter((e) => e.timestamp <= filters.to!);
  return list;
}

/** Returns the single most-recent entry for a staff member, or null. */
export function getLatestStaffAuditEntry(
  subjectId: string,
): StaffAuditEntry | null {
  return getStaffAuditLog({ subjectId })[0] ?? null;
}
