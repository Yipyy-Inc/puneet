"use client";

import { useSyncExternalStore } from "react";
import type { FacilityStaffRole } from "@/types/facility-staff";
import { facilityStaff } from "@/data/facility-staff";

// ============================================================================
// Staff write-ups & disciplinary actions — model + mock store (spec Section 8)
//
// Keyed by the StaffProfile id (fs-*). HIGHLY SENSITIVE:
//  - Write-ups are PERMANENT: there is deliberately no delete. Managers cannot
//    remove them; only an Admin can ARCHIVE (hidden from the default view but
//    retained in the store).
//  - Visibility is restricted to the staff member, their managers, and admins
//    (see `canReadWriteUps`). Enforce it at every read site.
// TODO: enforce these rules server-side (RLS/JWT) when a backend exists.
// ============================================================================

export type WriteUpCategory =
  | "verbal_warning"
  | "written_warning"
  | "final_warning"
  | "pip"
  | "termination_notice"
  | "positive_recognition"
  | "other";

export const WRITEUP_CATEGORY_LABEL: Record<WriteUpCategory, string> = {
  verbal_warning: "Verbal Warning",
  written_warning: "Written Warning",
  final_warning: "Final Warning",
  pip: "Performance Improvement Plan",
  termination_notice: "Termination Notice",
  positive_recognition: "Positive Recognition",
  other: "Other",
};

/** Ordered list for category pickers. */
export const WRITEUP_CATEGORIES: WriteUpCategory[] = [
  "verbal_warning",
  "written_warning",
  "final_warning",
  "pip",
  "termination_notice",
  "positive_recognition",
  "other",
];

export interface StaffWriteUp {
  id: string;
  /** StaffProfile id (fs-*) the record belongs to. */
  staffId: string;
  /** Name (or id) of the manager/admin who issued it. */
  issuedBy: string;
  /** ISO date the write-up was issued. */
  date: string;
  category: WriteUpCategory;
  /** Rich-text (HTML) body. */
  description: string;
  /** Optional link to a related incident record. */
  incidentRef?: string;
  attachmentUrl?: string;
  /** Set when the staff member acknowledges the record. */
  acknowledgedAt?: string;
  /** Admin-archived — hidden from the default view but retained. */
  archived?: boolean;
}

// ============================================================================
// Visibility & role helpers
// ============================================================================

const MANAGEMENT_ROLES: FacilityStaffRole[] = ["owner", "admin", "manager"];
const ADMIN_ROLES: FacilityStaffRole[] = ["owner", "admin"];

/** Only owners/admins may archive write-ups. */
export function isAdminRole(role: FacilityStaffRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * A viewer may read a staff member's write-ups only if they are that staff
 * member, or a manager / admin. Enforce at every read site (spec SECURITY).
 */
export function canReadWriteUps(
  viewer: { id: string; role: FacilityStaffRole },
  staffId: string,
): boolean {
  return viewer.id === staffId || MANAGEMENT_ROLES.includes(viewer.role);
}

// ============================================================================
// Store state
// ============================================================================

let byStaff = new Map<string, StaffWriteUp[]>();
let seq = 0;
const EMPTY: StaffWriteUp[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function replace(staffId: string, records: StaffWriteUp[]) {
  const next = new Map(byStaff);
  next.set(staffId, records);
  byStaff = next;
  emit();
}

// ----------------------------------------------------------------------------
// Seed a couple of records so the UI (G2/G3) has data to show. Static dates keep
// the module deterministic.
// ----------------------------------------------------------------------------
(() => {
  const groomer = facilityStaff.find((s) => s.primaryRole === "groomer");
  const attendant = facilityStaff.find(
    (s) =>
      s.primaryRole === "daycare_attendant" ||
      s.primaryRole === "boarding_attendant",
  );
  const seed = new Map<string, StaffWriteUp[]>();
  if (groomer) {
    seed.set(groomer.id, [
      {
        id: `wu-${++seq}`,
        staffId: groomer.id,
        issuedBy: "Manager One",
        date: "2026-06-18",
        category: "written_warning",
        description:
          "<p>Arrived more than 30 minutes late for two opening shifts this week without prior notice. Please review the attendance policy and coordinate schedule changes in advance.</p>",
        incidentRef: "INC-2043",
      },
      {
        id: `wu-${++seq}`,
        staffId: groomer.id,
        issuedBy: "Owner",
        date: "2026-05-02",
        category: "positive_recognition",
        description:
          "<p>Recognized by three clients this month for exceptional grooming results and a calm, caring handling style. Great work!</p>",
        acknowledgedAt: "2026-05-03T14:20:00.000Z",
      },
    ]);
  }
  if (attendant) {
    seed.set(attendant.id, [
      {
        id: `wu-${++seq}`,
        staffId: attendant.id,
        issuedBy: "Manager One",
        date: "2026-06-30",
        category: "verbal_warning",
        description:
          "<p>Reminder to complete the end-of-shift cleaning checklist before clocking out. Discussed verbally; no further action needed if consistent going forward.</p>",
      },
    ]);
  }
  byStaff = seed;
})();

// ============================================================================
// Reads (enforce `canReadWriteUps` at the call site)
// ============================================================================

/** One-shot read. Excludes archived records unless `includeArchived`. */
export function getWriteUps(
  staffId: string,
  includeArchived = false,
): StaffWriteUp[] {
  const all = byStaff.get(staffId) ?? EMPTY;
  return includeArchived ? all : all.filter((w) => !w.archived);
}

/**
 * Reactive read — returns the raw stored array (stable reference, includes
 * archived). Filter/sort in the component (e.g. `useMemo`) so the external-store
 * snapshot stays referentially stable.
 */
export function useWriteUps(
  staffId: string | null | undefined,
): StaffWriteUp[] {
  return useSyncExternalStore(
    subscribe,
    () => (staffId ? (byStaff.get(staffId) ?? EMPTY) : EMPTY),
    () => EMPTY,
  );
}

// ============================================================================
// Writes
// ============================================================================

/** Create a write-up. Returns the stored record so the caller can select it. */
export function addWriteUp(
  input: Omit<StaffWriteUp, "id" | "archived">,
): StaffWriteUp {
  const record: StaffWriteUp = { ...input, id: `wu-${++seq}` };
  const current = byStaff.get(record.staffId) ?? [];
  replace(record.staffId, [record, ...current]);
  return record;
}

/** Staff acknowledgement — records the timestamp. */
export function acknowledgeWriteUp(staffId: string, id: string): void {
  const current = byStaff.get(staffId);
  if (!current) return;
  replace(
    staffId,
    current.map((w) =>
      w.id === id && !w.acknowledgedAt
        ? { ...w, acknowledgedAt: new Date().toISOString() }
        : w,
    ),
  );
}

/**
 * Archive (or restore) a write-up. Admin-only — returns `false` and does nothing
 * for non-admins. Archived records are retained, never deleted.
 */
export function archiveWriteUp(
  staffId: string,
  id: string,
  actorRole: FacilityStaffRole,
  archived = true,
): boolean {
  if (!isAdminRole(actorRole)) return false;
  const current = byStaff.get(staffId);
  if (!current) return false;
  replace(
    staffId,
    current.map((w) => (w.id === id ? { ...w, archived } : w)),
  );
  return true;
}
