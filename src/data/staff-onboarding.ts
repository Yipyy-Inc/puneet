"use client";

import { useSyncExternalStore } from "react";
import type { FacilityStaffRole } from "@/types/facility-staff";

// ============================================================================
// Staff onboarding — model + mock store (spec Section 7 / Table 20)
//
// Per-staff onboarding checklist, keyed by the StaffProfile id (fs-*). Auto-
// populated with a role-appropriate default when a staff member is created (C1),
// from a facility-level default template set that is itself configurable.
// TODO: move to a real store/API when a backend exists.
// ============================================================================

export type OnboardingTaskType =
  | "document_sign"
  | "waiver_sign"
  | "training_module"
  | "shadow_shift"
  | "equipment_issue"
  | "system_access_verify"
  | "meet_the_team"
  | "facility_tour"
  | "custom";

export const ONBOARDING_TYPE_LABEL: Record<OnboardingTaskType, string> = {
  document_sign: "Document sign",
  waiver_sign: "Waiver sign",
  training_module: "Training module",
  shadow_shift: "Shadow shift",
  equipment_issue: "Equipment issue",
  system_access_verify: "System access verify",
  meet_the_team: "Meet the team",
  facility_tour: "Facility tour",
  custom: "Custom",
};

export interface OnboardingTask {
  id: string;
  name: string;
  description: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  /** Manager-only tasks — the staff member cannot self-complete these. */
  requiresManager: boolean;
  type: OnboardingTaskType;
}

/** A facility-level default onboarding item, materialised per staff on hire. */
export interface OnboardingTaskTemplate {
  type: OnboardingTaskType;
  name: string;
  description: string;
  requiresManager: boolean;
  /** Days after the start date the task is due (omitted = no due date). */
  dueOffsetDays?: number;
  /** Roles this template applies to. Omitted = all roles. */
  roles?: FacilityStaffRole[];
}

// The facility's default checklist. Common tasks apply to everyone; the training
// module is role-appropriate. Editable at facility level via the setter below.
const DEFAULT_ONBOARDING_TEMPLATES: OnboardingTaskTemplate[] = [
  {
    type: "document_sign",
    name: "Sign employment contract",
    description: "Review and e-sign your employment agreement.",
    requiresManager: false,
    dueOffsetDays: 1,
  },
  {
    type: "waiver_sign",
    name: "Sign liability & confidentiality waivers",
    description: "Acknowledge facility policies and confidentiality terms.",
    requiresManager: false,
    dueOffsetDays: 1,
  },
  {
    type: "system_access_verify",
    name: "Verify system access",
    description: "Confirm your login works and you can see your schedule.",
    requiresManager: true,
    dueOffsetDays: 1,
  },
  {
    type: "facility_tour",
    name: "Facility tour",
    description: "Walk the facility — rooms, exits, and supply areas.",
    requiresManager: true,
    dueOffsetDays: 1,
  },
  {
    type: "meet_the_team",
    name: "Meet the team",
    description: "Get introduced to your coworkers and shift leads.",
    requiresManager: false,
    dueOffsetDays: 2,
  },
  {
    type: "equipment_issue",
    name: "Receive equipment & keys",
    description: "Collect your uniform, key/fob, and any role equipment.",
    requiresManager: true,
    dueOffsetDays: 2,
  },
  // Role-appropriate training module.
  {
    type: "training_module",
    name: "Grooming safety & equipment",
    description: "Complete grooming safety and equipment-handling training.",
    requiresManager: false,
    dueOffsetDays: 5,
    roles: ["groomer"],
  },
  {
    type: "training_module",
    name: "Training methodology certification",
    description: "Complete the positive-reinforcement training certification.",
    requiresManager: false,
    dueOffsetDays: 5,
    roles: ["trainer"],
  },
  {
    type: "training_module",
    name: "Animal handling & care protocols",
    description: "Complete animal handling, feeding, and care-log training.",
    requiresManager: false,
    dueOffsetDays: 5,
    roles: ["caretaker", "daycare_attendant", "boarding_attendant"],
  },
  {
    type: "training_module",
    name: "POS & booking system",
    description: "Complete point-of-sale and booking-system training.",
    requiresManager: false,
    dueOffsetDays: 5,
    roles: ["reception", "retail"],
  },
  {
    type: "training_module",
    name: "Role orientation",
    description: "Complete your role orientation module.",
    requiresManager: false,
    dueOffsetDays: 5,
    roles: [
      "owner",
      "admin",
      "manager",
      "supervisor",
      "accountant",
      "sanitation",
    ],
  },
  {
    type: "shadow_shift",
    name: "Complete a shadow shift",
    description: "Shadow an experienced coworker for one full shift.",
    requiresManager: true,
    dueOffsetDays: 7,
  },
];

// ============================================================================
// Store state
// ============================================================================

let byStaff = new Map<string, OnboardingTask[]>();
let facilityDefaults: OnboardingTaskTemplate[] = DEFAULT_ONBOARDING_TEMPLATES;
let seq = 0;
const EMPTY: OnboardingTask[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function addDays(startDate: string, days: number): string {
  const d = new Date(`${startDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ============================================================================
// Pure builder
// ============================================================================

/** Build a role-appropriate default checklist from the facility defaults. */
export function buildDefaultChecklist(
  role: FacilityStaffRole,
  startDate?: string,
): OnboardingTask[] {
  return facilityDefaults
    .filter((t) => !t.roles || t.roles.includes(role))
    .map((t) => ({
      id: `ob-${++seq}`,
      name: t.name,
      description: t.description,
      requiresManager: t.requiresManager,
      type: t.type,
      dueDate:
        startDate && t.dueOffsetDays != null
          ? addDays(startDate, t.dueOffsetDays)
          : undefined,
    }));
}

// ============================================================================
// Reads
// ============================================================================

export function getOnboarding(staffId: string): OnboardingTask[] {
  return byStaff.get(staffId) ?? EMPTY;
}

export function useOnboarding(
  staffId: string | null | undefined,
): OnboardingTask[] {
  return useSyncExternalStore(
    subscribe,
    () => (staffId ? (byStaff.get(staffId) ?? EMPTY) : EMPTY),
    () => EMPTY,
  );
}

export function getFacilityOnboardingDefaults(): OnboardingTaskTemplate[] {
  return facilityDefaults;
}

export function useFacilityOnboardingDefaults(): OnboardingTaskTemplate[] {
  return useSyncExternalStore(
    subscribe,
    () => facilityDefaults,
    () => facilityDefaults,
  );
}

// ============================================================================
// Writes
// ============================================================================

/**
 * Auto-populate a staff member's checklist from the role default. Idempotent —
 * a no-op if the staff already has a checklist. Called on staff creation (C1).
 */
export function initOnboarding(
  staffId: string,
  role: FacilityStaffRole,
  startDate?: string,
): void {
  if (byStaff.has(staffId)) return;
  const next = new Map(byStaff);
  next.set(staffId, buildDefaultChecklist(role, startDate));
  byStaff = next;
  emit();
}

function replace(staffId: string, tasks: OnboardingTask[]) {
  const next = new Map(byStaff);
  next.set(staffId, tasks);
  byStaff = next;
  emit();
}

export function addOnboardingTask(
  staffId: string,
  task: Omit<OnboardingTask, "id">,
): void {
  const current = byStaff.get(staffId) ?? [];
  replace(staffId, [...current, { ...task, id: `ob-${++seq}` }]);
}

export function removeOnboardingTask(staffId: string, taskId: string): void {
  const current = byStaff.get(staffId);
  if (!current) return;
  replace(
    staffId,
    current.filter((t) => t.id !== taskId),
  );
}

/** Mark a task complete/incomplete. `by` records who completed it. */
export function setOnboardingTaskComplete(
  staffId: string,
  taskId: string,
  complete: boolean,
  by?: string,
): void {
  const current = byStaff.get(staffId);
  if (!current) return;
  replace(
    staffId,
    current.map((t) =>
      t.id === taskId
        ? complete
          ? { ...t, completedAt: new Date().toISOString(), completedBy: by }
          : { ...t, completedAt: undefined, completedBy: undefined }
        : t,
    ),
  );
}

/** Replace the facility-level default templates (configurable defaults). */
export function setFacilityOnboardingDefaults(
  templates: OnboardingTaskTemplate[],
): void {
  facilityDefaults = templates;
  emit();
}
