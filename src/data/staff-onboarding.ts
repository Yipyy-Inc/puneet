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
//
// extends the earlier Section 7 model into the full templated self-serve flow.
// The lower half of this file adds onboarding/offboarding TEMPLATES, a facility
// Staff & HR config, per-hire onboarding INSTANCES (tokenised self-serve
// sections) and per-departure offboarding instances — persisted to localStorage
// and exposed through the same useSyncExternalStore pattern. The original
// per-staff checklist APIs above are unchanged and keep working.
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

/** When a manager task is due — spec Table 0 ("When due"). */
export type OnboardingWhenDue = "on_hire" | "within_days" | "by_first_shift";

/** Who owns a manager task — spec Table 0 ("Assigned to"). A FacilityStaffRole
 * value means "the person in that position". */
export type OnboardingAssignee = "manager" | "owner" | FacilityStaffRole;

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
  // ── spec Table 0 (manager tasks) — optional so existing checklists still
  //    satisfy the interface; templates set them explicitly. ─────────────────
  /** When the task is due. */
  when?: OnboardingWhenDue;
  /** Days after hire, when `when === "within_days"`. */
  whenDays?: number;
  /** Who owns the task (Manager / Owner / a position). */
  assignedTo?: OnboardingAssignee;
  /** Required toggle. Treated as `true` when omitted. */
  required?: boolean;
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

// ============================================================================
// ── Templated self-serve onboarding + offboarding ──────────────────────────
// extends the earlier Section 7 model into the full templated self-serve flow.
// Onboarding/offboarding TEMPLATES, a facility Staff & HR config, per-hire
// tokenised onboarding INSTANCES and per-departure offboarding instances —
// persisted to localStorage, read through the same useSyncExternalStore /
// listeners pattern as the checklist store above.
// ============================================================================

// ── Status / departure reasons (mirrors StaffProfile.statusReason) ──────────
export type StatusReason =
  | "vacation"
  | "medical_leave"
  | "resigned"
  | "terminated_cause"
  | "performance"
  | "rehired"
  | "other";

// ── Employee self-complete task model (spec Table 1) ────────────────────────
export type EmployeeOnboardingTaskType =
  | "personal_info"
  | "contact_details"
  | "banking"
  | "document_upload"
  | "document_sign"
  | "availability"
  | "emergency_contact"
  | "uniform_prefs"
  | "custom_question";

export const EMPLOYEE_TASK_LABEL: Record<EmployeeOnboardingTaskType, string> = {
  personal_info: "Personal information",
  contact_details: "Contact details",
  banking: "Banking / payroll",
  document_upload: "Document upload",
  document_sign: "Document signature",
  availability: "Availability",
  emergency_contact: "Emergency contact",
  uniform_prefs: "Uniform preferences",
  custom_question: "Custom question",
};

export type CustomQuestionFormat = "text" | "multiple_choice" | "file";

/** One field an employee section collects from the new hire. */
export interface EmployeeFieldSpec {
  key: string;
  label: string;
  kind:
    | "text"
    | "email"
    | "phone"
    | "date"
    | "number"
    | "select"
    | "address"
    | "iban"
    | "file"
    | "signature"
    | "availability_grid";
  required?: boolean;
}

export interface EmployeeCustomQuestion {
  format: CustomQuestionFormat;
  prompt: string;
  /** Choices when `format === "multiple_choice"`. */
  options?: string[];
}

export interface EmployeeOnboardingTask {
  id: string;
  type: EmployeeOnboardingTaskType;
  name: string;
  description?: string;
  required: boolean;
  /** The shape of the data this section collects from the employee. */
  fields: EmployeeFieldSpec[];
  /** document_upload / document_sign: the document to collect or sign. */
  documentName?: string;
  /** Facility-uploaded PDF the employee reads/signs (blank template ref). */
  documentRef?: string;
  /** custom_question only. */
  question?: EmployeeCustomQuestion;
}

/** Default collected-field shapes per Table-1 type. */
export const EMPLOYEE_TASK_FIELDS: Record<
  EmployeeOnboardingTaskType,
  EmployeeFieldSpec[]
> = {
  personal_info: [
    {
      key: "legalName",
      label: "Legal full name",
      kind: "text",
      required: true,
    },
    {
      key: "dateOfBirth",
      label: "Date of birth",
      kind: "date",
      required: true,
    },
    { key: "taxId", label: "SIN / tax ID", kind: "text", required: true },
  ],
  contact_details: [
    { key: "email", label: "Email", kind: "email", required: true },
    { key: "phone", label: "Phone", kind: "phone", required: true },
    { key: "address", label: "Home address", kind: "address", required: true },
  ],
  banking: [
    {
      key: "accountHolder",
      label: "Account holder",
      kind: "text",
      required: true,
    },
    { key: "iban", label: "Account / IBAN", kind: "iban", required: true },
    { key: "voidCheque", label: "Void cheque", kind: "file" },
  ],
  document_upload: [
    { key: "file", label: "Upload document", kind: "file", required: true },
  ],
  document_sign: [
    { key: "signature", label: "Signature", kind: "signature", required: true },
  ],
  availability: [
    {
      key: "availability",
      label: "Weekly availability",
      kind: "availability_grid",
      required: true,
    },
  ],
  emergency_contact: [
    { key: "name", label: "Contact name", kind: "text", required: true },
    {
      key: "relationship",
      label: "Relationship",
      kind: "text",
      required: true,
    },
    { key: "phone", label: "Contact phone", kind: "phone", required: true },
  ],
  uniform_prefs: [
    { key: "shirtSize", label: "Shirt size", kind: "select", required: true },
    { key: "notes", label: "Notes", kind: "text" },
  ],
  custom_question: [{ key: "answer", label: "Answer", kind: "text" }],
};

// ── Onboarding template ─────────────────────────────────────────────────────
export interface OnboardingTemplate {
  id: string;
  name: string;
  /** Empty = applies to all roles. */
  appliesToRoles: FacilityStaffRole[];
  completionDeadlineDays: number;
  inviteExpiryDays: number;
  welcomeMessage: string;
  status: "active" | "draft";
  managerTasks: OnboardingTask[];
  employeeTasks: EmployeeOnboardingTask[];
}

// ── Offboarding template ────────────────────────────────────────────────────
export interface OffboardingTask {
  id: string;
  name: string;
  description: string;
  assignedTo: "manager" | "owner" | "hr";
  due: "on_termination" | "within_days" | "before_last_day";
  days?: number;
  required: boolean;
}

export interface OffboardingTemplate {
  id: string;
  name: string;
  /** Termination-reason labels this applies to (from StaffHrConfig.termination
   *  Reasons). Empty = universal (all reasons). */
  appliesToReasons: string[];
  managerTasks: OffboardingTask[];
}

// ── Per-hire onboarding instance ────────────────────────────────────────────
export type SectionStatus = "not_started" | "in_progress" | "complete";

export interface OnboardingSection {
  type: EmployeeOnboardingTaskType;
  /** The employee-task id this section tracks — lets a template carry several
   *  tasks of the same type (e.g. multiple documents / custom questions). */
  taskId?: string;
  status: SectionStatus;
  data?: Record<string, unknown>;
  completedAt?: string;
}

export interface OnboardingChangeRequest {
  sectionType: EmployeeOnboardingTaskType;
  /** The specific task the manager flagged (so the employee fixes just that
   *  item, without redoing the whole flow). */
  taskId?: string;
  note: string;
  resolvedAt?: string;
}

export interface OnboardingInstance {
  staffId: string;
  templateId: string;
  token: string;
  tokenExpiresAt: string;
  /** When the invite was first sent — for "days since invite". */
  invitedAt?: string;
  sections: OnboardingSection[];
  /** Account setup (set-password) step — mock; records when it was completed. */
  account?: { passwordSetAt: string };
  submittedAt?: string;
  reviewedAt?: string;
  changeRequests: OnboardingChangeRequest[];
  /** Dedup — day a deadline-overdue reminder last fired (YYYY-MM-DD). */
  lastDeadlineReminder?: string;
  /** Dedup — set once when the expired-link alert has fired. */
  expiryNotifiedAt?: string;
}

// ── Per-departure offboarding instance ──────────────────────────────────────
export interface OffboardingTaskState extends OffboardingTask {
  /** Concrete due date (YYYY-MM-DD) computed from the departure date. */
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  /** Optional note captured at completion (e.g. "ROE submitted to Service
   *  Canada July 22, ref #XYZ"). */
  completionNote?: string;
}

/** Final HR document attached to an offboarding record — permanent (retained
 *  per StaffHrConfig.hrDocRetentionYears), never deleted. Mock upload. */
export type OffboardingDocumentKind =
  | "roe"
  | "termination_letter"
  | "settlement_agreement"
  | "other";

export interface OffboardingDocument {
  id: string;
  kind: OffboardingDocumentKind;
  name: string;
  /** Mock object URL / stored path. */
  fileUrl: string;
  uploadedAt: string;
  /** YYYY-MM-DD — computed from hrDocRetentionYears at upload time. */
  retainUntil: string;
}

export interface OffboardingInstance {
  staffId: string;
  templateId: string;
  reason: string;
  tasks: OffboardingTaskState[];
  startedAt: string;
  completedAt?: string;
  /** Last day a daily overdue reminder was fired (YYYY-MM-DD) — dedup. */
  lastReminderDate?: string;
  /** Last day the due-today reminder fired (YYYY-MM-DD) — dedup. */
  dueTodayNotifiedDate?: string;
  /** Set once when the "offboarding complete" notification has fired — dedup. */
  completeNotifiedAt?: string;
  /** Permanent final documents (ROE, termination letter, settlement). */
  finalDocuments?: OffboardingDocument[];
}

// ── Staff lifecycle notification triggers (Table 5) ─────────────────────────
// Per-facility, each toggleable on/off with per-channel (in-app feed / email
// mock) and timing where relevant. Gated by lib/staff-notifications.ts.
export type StaffNotifTriggerKey =
  | "staff_invited"
  | "onboarding_submitted"
  | "onboarding_link_expired"
  | "onboarding_not_started"
  | "onboarding_overdue"
  | "account_activated"
  | "onboarding_change_requested"
  | "offboarding_started"
  | "offboarding_task_due"
  | "offboarding_overdue"
  | "offboarding_complete"
  | "hr_doc_added";

export interface StaffNotifTrigger {
  enabled: boolean;
  /** In-app facility feed (manager) or staff-card alert. */
  inApp: boolean;
  /** Mock email (recorded in the onboarding outbox). */
  email: boolean;
  /** Timing threshold in days, for triggers that need one. */
  days?: number;
}

/** Static metadata (not persisted) describing each trigger for the settings UI
 *  and the firing helper: recipient + which channels apply + timing. */
export const STAFF_NOTIF_TRIGGERS: {
  key: StaffNotifTriggerKey;
  label: string;
  description: string;
  recipient: "manager" | "employee" | "staff_card";
  channels: ("inApp" | "email")[];
  timingLabel?: string;
}[] = [
  {
    key: "staff_invited",
    label: "Staff invited",
    description: "Email the new hire their onboarding link when created.",
    recipient: "employee",
    channels: ["email"],
  },
  {
    key: "onboarding_submitted",
    label: "Onboarding submitted",
    description: "Notify the manager when an employee finishes onboarding.",
    recipient: "manager",
    channels: ["inApp", "email"],
  },
  {
    key: "onboarding_link_expired",
    label: "Onboarding link expired",
    description: "Alert the manager when an invite link expires unused.",
    recipient: "manager",
    channels: ["inApp", "email"],
  },
  {
    key: "onboarding_not_started",
    label: "Onboarding not started",
    description:
      "Show a staff-card alert when an invite sits untouched too long.",
    recipient: "staff_card",
    channels: ["inApp"],
    timingLabel: "Days before alerting",
  },
  {
    key: "onboarding_overdue",
    label: "Onboarding past deadline",
    description:
      "Remind the manager daily when onboarding misses its completion deadline.",
    recipient: "manager",
    channels: ["inApp", "email"],
  },
  {
    key: "account_activated",
    label: "Account activated",
    description: "Email the employee when their account is activated.",
    recipient: "employee",
    channels: ["email"],
  },
  {
    key: "onboarding_change_requested",
    label: "Change requested",
    description:
      "Email the employee the flagged item and note when a change is requested.",
    recipient: "employee",
    channels: ["email"],
  },
  {
    key: "offboarding_started",
    label: "Offboarding started",
    description: "Notify the manager when a termination creates offboarding tasks.",
    recipient: "manager",
    channels: ["inApp", "email"],
  },
  {
    key: "offboarding_task_due",
    label: "Offboarding task due today",
    description: "Notify the manager when an offboarding task is due today.",
    recipient: "manager",
    channels: ["inApp"],
  },
  {
    key: "offboarding_overdue",
    label: "Offboarding task overdue",
    description: "Remind the manager daily while required offboarding tasks are overdue.",
    recipient: "manager",
    channels: ["inApp", "email"],
  },
  {
    key: "offboarding_complete",
    label: "Offboarding complete",
    description: "Notify the manager when all offboarding tasks are done.",
    recipient: "manager",
    channels: ["inApp", "email"],
  },
  {
    key: "hr_doc_added",
    label: "HR document added",
    description:
      "Notify the employee when a manager adds an HR document or note (optional).",
    recipient: "employee",
    channels: ["email"],
  },
];

function seedNotificationTriggers(): Record<
  StaffNotifTriggerKey,
  StaffNotifTrigger
> {
  return {
    staff_invited: { enabled: true, inApp: false, email: true },
    onboarding_submitted: { enabled: true, inApp: true, email: true },
    onboarding_link_expired: { enabled: true, inApp: true, email: false },
    onboarding_not_started: { enabled: true, inApp: true, email: false, days: 3 },
    onboarding_overdue: { enabled: true, inApp: true, email: true },
    account_activated: { enabled: true, inApp: false, email: true },
    onboarding_change_requested: { enabled: true, inApp: false, email: true },
    offboarding_started: { enabled: true, inApp: true, email: false },
    offboarding_task_due: { enabled: true, inApp: true, email: false },
    offboarding_overdue: { enabled: true, inApp: true, email: false },
    offboarding_complete: { enabled: true, inApp: true, email: true },
    // Optional by default — off until the facility opts in.
    hr_doc_added: { enabled: false, inApp: false, email: true },
  };
}

// ── Facility Staff & HR config ──────────────────────────────────────────────
export interface StaffHrConfig {
  /** Employment-type slugs (displayed humanized). Feeds the Add-staff dropdown. */
  employmentTypes: string[];
  /** Editable termination-reason labels. Feeds the status-change dialog. */
  terminationReasons: string[];
  inviteExpiryDays: number;
  completionDeadlineDays: number;
  hrDocRetentionYears: number;
  /** Per-facility staff-lifecycle notification triggers (Table 5). */
  notificationTriggers: Record<StaffNotifTriggerKey, StaffNotifTrigger>;
}

// ============================================================================
// Seeds (deterministic ids so SSR and client agree — no hydration drift)
// ============================================================================

let hrSeq = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(hrSeq++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

/** Manager tasks (Table 0), derived from the facility default checklist. */
function seedManagerTasks(): OnboardingTask[] {
  return DEFAULT_ONBOARDING_TEMPLATES.filter((t) => t.requiresManager).map(
    (t, i) => ({
      id: `mt-${t.type}-${i}`,
      name: t.name,
      description: t.description,
      requiresManager: true,
      type: t.type,
      when:
        t.dueOffsetDays == null || t.dueOffsetDays <= 0
          ? "on_hire"
          : "within_days",
      whenDays: t.dueOffsetDays,
      assignedTo: "manager",
      required: true,
    }),
  );
}

function seedEmployeeTasks(): EmployeeOnboardingTask[] {
  const mk = (
    type: EmployeeOnboardingTaskType,
    name: string,
    extra: Partial<EmployeeOnboardingTask> = {},
  ): EmployeeOnboardingTask => ({
    id: `et-${type}`,
    type,
    name,
    required: true,
    fields: EMPLOYEE_TASK_FIELDS[type],
    ...extra,
  });
  return [
    mk("personal_info", "Personal information"),
    mk("contact_details", "Contact details"),
    mk("emergency_contact", "Emergency contact"),
    mk("banking", "Banking & payroll"),
    mk("document_sign", "Sign employment contract", {
      documentName: "Employment contract",
      documentRef: "",
    }),
    mk("availability", "Set your availability"),
    mk("uniform_prefs", "Uniform preferences", { required: false }),
  ];
}

/** Full-time Groomer onboarding — role-specific. Adds a required certification
 *  upload, a safety policy to sign, and a grooming-experience question; banking
 *  is optional (skippable). */
function seedGroomerEmployeeTasks(): EmployeeOnboardingTask[] {
  const mk = (
    type: EmployeeOnboardingTaskType,
    name: string,
    extra: Partial<EmployeeOnboardingTask> = {},
  ): EmployeeOnboardingTask => ({
    id: `etg-${type}`,
    type,
    name,
    required: true,
    fields: EMPLOYEE_TASK_FIELDS[type],
    ...extra,
  });
  return [
    mk("personal_info", "Personal information"),
    mk("contact_details", "Contact details"),
    mk("emergency_contact", "Emergency contact"),
    mk("document_upload", "Upload grooming certification", {
      documentName: "Grooming certification",
    }),
    mk("document_sign", "Sign grooming safety policy", {
      documentName: "Grooming safety & handling policy",
      documentRef: "",
    }),
    mk("banking", "Banking & payroll (optional)", { required: false }),
    mk("availability", "Set your weekly availability"),
    mk("custom_question", "Grooming experience", {
      question: {
        format: "multiple_choice",
        prompt: "Do you have hand-stripping experience?",
        options: ["Yes, extensive", "Some", "None yet"],
      },
    }),
    mk("uniform_prefs", "Uniform preferences", { required: false }),
  ];
}

function seedOnboardingTemplates(): OnboardingTemplate[] {
  return [
    {
      id: "tmpl-standard",
      name: "Standard onboarding",
      appliesToRoles: [],
      completionDeadlineDays: 14,
      inviteExpiryDays: 7,
      welcomeMessage:
        "Welcome to the team! Please complete the steps below so we can get you set up before your first shift.",
      status: "active",
      managerTasks: seedManagerTasks(),
      employeeTasks: seedEmployeeTasks(),
    },
    {
      id: "tmpl-groomer-ft",
      name: "Full-time Groomer Onboarding",
      appliesToRoles: ["groomer"],
      completionDeadlineDays: 14,
      inviteExpiryDays: 7,
      welcomeMessage:
        "Welcome to the grooming team! Complete the steps below — including your certification and our safety policy — before your first shift.",
      status: "active",
      managerTasks: seedManagerTasks(),
      employeeTasks: seedGroomerEmployeeTasks(),
    },
  ];
}

// Default offboarding task set (spec Table 3) — 8 required tasks so a fully
// worked departure reaches the "8 of 8" complete badge. Seeded on the universal
// template; the facility can add or remove any of them.
function seedOffboardingTasks(): OffboardingTask[] {
  return [
    {
      id: "off-revoke-access",
      name: "Revoke system & building access",
      description: "Disable logins, door codes, alarm codes and building entry.",
      assignedTo: "manager",
      due: "on_termination",
      required: true,
    },
    {
      id: "off-remove-scheduling",
      name: "Remove from scheduling",
      description: "Remove the staffer from future shifts and the rota.",
      assignedTo: "manager",
      due: "on_termination",
      required: true,
    },
    {
      id: "off-collect-keys",
      name: "Collect keys & access items",
      description: "Recover keys, fobs, badges and any facility equipment.",
      assignedTo: "manager",
      due: "before_last_day",
      required: true,
    },
    {
      id: "off-transfer-clients",
      name: "Transfer client relationships",
      description: "Reassign the staffer's clients and pets to other staff.",
      assignedTo: "manager",
      due: "before_last_day",
      required: true,
    },
    {
      id: "off-final-pay",
      name: "Prepare final pay",
      description:
        "Calculate final pay, accrued vacation and outstanding amounts.",
      assignedTo: "owner",
      due: "before_last_day",
      required: true,
    },
    {
      id: "off-return-equipment",
      name: "Return uniform & equipment",
      description: "Collect uniform, grooming tools and company property.",
      assignedTo: "manager",
      due: "before_last_day",
      required: true,
    },
    {
      id: "off-roe",
      name: "Issue ROE",
      description: "Issue the Record of Employment to the departing staffer.",
      assignedTo: "hr",
      due: "within_days",
      days: 5,
      required: true,
    },
    {
      id: "off-exit-interview",
      name: "Conduct exit interview",
      description: "Hold an exit interview and record the notes.",
      assignedTo: "hr",
      due: "before_last_day",
      required: true,
    },
  ];
}

function seedOffboardingTemplates(): OffboardingTemplate[] {
  return [
    {
      id: "offtmpl-standard",
      name: "Standard offboarding",
      appliesToReasons: [],
      managerTasks: seedOffboardingTasks(),
    },
  ];
}

function seedConfig(): StaffHrConfig {
  return {
    employmentTypes: [
      "full_time",
      "part_time",
      "contract",
      "seasonal",
      "volunteer",
      "intern",
    ],
    terminationReasons: [
      "Resignation",
      "Termination without cause",
      "Termination with cause",
      "End of contract",
      "Abandonment",
      "Retirement",
      "Mutual agreement",
      "Other",
    ],
    inviteExpiryDays: 7,
    completionDeadlineDays: 14,
    hrDocRetentionYears: 7,
    notificationTriggers: seedNotificationTriggers(),
  };
}

interface OnboardingStoreState {
  templates: OnboardingTemplate[];
  offboardingTemplates: OffboardingTemplate[];
  config: StaffHrConfig;
  instances: Record<string, OnboardingInstance>;
  offboardingInstances: Record<string, OffboardingInstance>;
}

function defaultState(): OnboardingStoreState {
  return {
    templates: seedOnboardingTemplates(),
    offboardingTemplates: seedOffboardingTemplates(),
    config: seedConfig(),
    instances: {},
    offboardingInstances: {},
  };
}

// ============================================================================
// Persisted store (localStorage) — reuses the checklist store's emit/subscribe
// ============================================================================

// v2 — re-seeds the template catalog (adds the Full-time Groomer Onboarding
// template + the 8-task offboarding set). Bumping discards any prior in-memory
// test instances so the seeded templates load for everyone.
const STORAGE_KEY = "yipyy-staff-onboarding-v2";
const isBrowser = typeof window !== "undefined";

// Stable snapshot for SSR + first hydration. Deterministic seeds mean the
// server render matches a fresh client (empty localStorage) exactly.
const SERVER_STATE: OnboardingStoreState = defaultState();

function loadState(): OnboardingStoreState {
  if (!isBrowser) return SERVER_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<OnboardingStoreState>;
    const base = defaultState();
    // Deep-merge config so newly-added fields (e.g. notificationTriggers) fall
    // back to defaults for older persisted blobs.
    return {
      ...base,
      ...parsed,
      config: {
        ...base.config,
        ...parsed.config,
        notificationTriggers: {
          ...base.config.notificationTriggers,
          ...(parsed.config?.notificationTriggers ?? {}),
        },
      },
    };
  } catch {
    return defaultState();
  }
}

let hrStore: OnboardingStoreState = loadState();

function persist(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hrStore));
  } catch {
    /* ignore quota / serialization errors */
  }
}

function commit(next: OnboardingStoreState): void {
  hrStore = next;
  persist();
  emit();
}

function generateToken(): string {
  return `sob_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ============================================================================
// Reads
// ============================================================================

export function getOnboardingTemplates(): OnboardingTemplate[] {
  return hrStore.templates;
}
export function useOnboardingTemplates(): OnboardingTemplate[] {
  return useSyncExternalStore(
    subscribe,
    () => hrStore.templates,
    () => SERVER_STATE.templates,
  );
}

export function getOffboardingTemplates(): OffboardingTemplate[] {
  return hrStore.offboardingTemplates;
}
export function useOffboardingTemplates(): OffboardingTemplate[] {
  return useSyncExternalStore(
    subscribe,
    () => hrStore.offboardingTemplates,
    () => SERVER_STATE.offboardingTemplates,
  );
}

export function getStaffHrConfig(): StaffHrConfig {
  return hrStore.config;
}
export function useStaffHrConfig(): StaffHrConfig {
  return useSyncExternalStore(
    subscribe,
    () => hrStore.config,
    () => SERVER_STATE.config,
  );
}

export function getOnboardingInstance(
  staffId: string,
): OnboardingInstance | undefined {
  return hrStore.instances[staffId];
}
export function useOnboardingInstance(
  staffId: string | null | undefined,
): OnboardingInstance | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (staffId ? hrStore.instances[staffId] : undefined),
    () => undefined,
  );
}
export function getOnboardingInstanceByToken(
  token: string,
): OnboardingInstance | undefined {
  return Object.values(hrStore.instances).find((i) => i.token === token);
}

export function getOffboardingInstance(
  staffId: string,
): OffboardingInstance | undefined {
  return hrStore.offboardingInstances[staffId];
}
export function useOffboardingInstance(
  staffId: string | null | undefined,
): OffboardingInstance | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (staffId ? hrStore.offboardingInstances[staffId] : undefined),
    () => undefined,
  );
}

// ============================================================================
// Template + config CRUD
// ============================================================================

export function saveOnboardingTemplate(template: OnboardingTemplate): void {
  const exists = hrStore.templates.some((t) => t.id === template.id);
  const templates = exists
    ? hrStore.templates.map((t) => (t.id === template.id ? template : t))
    : [...hrStore.templates, template];
  commit({ ...hrStore, templates });
}

export function createOnboardingTemplate(
  partial: Partial<OnboardingTemplate> = {},
): OnboardingTemplate {
  const template: OnboardingTemplate = {
    id: uid("tmpl"),
    name: partial.name ?? "New onboarding template",
    appliesToRoles: partial.appliesToRoles ?? [],
    completionDeadlineDays: partial.completionDeadlineDays ?? 14,
    inviteExpiryDays: partial.inviteExpiryDays ?? 7,
    welcomeMessage: partial.welcomeMessage ?? "",
    status: partial.status ?? "draft",
    managerTasks: partial.managerTasks ?? [],
    employeeTasks: partial.employeeTasks ?? [],
  };
  commit({ ...hrStore, templates: [...hrStore.templates, template] });
  return template;
}

export function deleteOnboardingTemplate(id: string): void {
  commit({
    ...hrStore,
    templates: hrStore.templates.filter((t) => t.id !== id),
  });
}

export function saveOffboardingTemplate(template: OffboardingTemplate): void {
  const exists = hrStore.offboardingTemplates.some((t) => t.id === template.id);
  const offboardingTemplates = exists
    ? hrStore.offboardingTemplates.map((t) =>
        t.id === template.id ? template : t,
      )
    : [...hrStore.offboardingTemplates, template];
  commit({ ...hrStore, offboardingTemplates });
}

export function createOffboardingTemplate(
  partial: Partial<OffboardingTemplate> = {},
): OffboardingTemplate {
  const template: OffboardingTemplate = {
    id: uid("offtmpl"),
    name: partial.name ?? "New offboarding template",
    appliesToReasons: partial.appliesToReasons ?? [],
    managerTasks: partial.managerTasks ?? [],
  };
  commit({
    ...hrStore,
    offboardingTemplates: [...hrStore.offboardingTemplates, template],
  });
  return template;
}

export function deleteOffboardingTemplate(id: string): void {
  commit({
    ...hrStore,
    offboardingTemplates: hrStore.offboardingTemplates.filter(
      (t) => t.id !== id,
    ),
  });
}

export function saveStaffHrConfig(patch: Partial<StaffHrConfig>): void {
  commit({ ...hrStore, config: { ...hrStore.config, ...patch } });
}

// ============================================================================
// Template resolution + instance lifecycle
// ============================================================================

/** The active onboarding template for a role: role-specific first, then a
 * catch-all (empty appliesToRoles), then any active template. */
export function resolveTemplateForRole(
  role: FacilityStaffRole,
): OnboardingTemplate | undefined {
  const active = hrStore.templates.filter((t) => t.status === "active");
  return (
    active.find((t) => t.appliesToRoles.includes(role)) ??
    active.find((t) => t.appliesToRoles.length === 0) ??
    active[0]
  );
}

/** Materialise a tokenised onboarding instance for a hire from a template. */
export function createOnboardingInstance(
  staffId: string,
  templateId: string,
): OnboardingInstance {
  const template =
    hrStore.templates.find((t) => t.id === templateId) ??
    hrStore.templates.find((t) => t.status === "active");
  const inviteDays =
    template?.inviteExpiryDays ?? hrStore.config.inviteExpiryDays;
  const instance: OnboardingInstance = {
    staffId,
    templateId: template?.id ?? templateId,
    token: generateToken(),
    tokenExpiresAt: addDaysISO(inviteDays),
    invitedAt: new Date().toISOString(),
    sections: (template?.employeeTasks ?? []).map((t) => ({
      type: t.type,
      taskId: t.id,
      status: "not_started" as SectionStatus,
    })),
    changeRequests: [],
  };
  commit({
    ...hrStore,
    instances: { ...hrStore.instances, [staffId]: instance },
  });
  return instance;
}

/** Save a section keyed by employee-task id (the public onboarding flow, where a
 *  template may carry several tasks of the same type). Silent save-and-resume. */
export function saveOnboardingSectionByTask(
  staffId: string,
  taskId: string,
  type: EmployeeOnboardingTaskType,
  data: Record<string, unknown>,
  status: SectionStatus = "in_progress",
): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  const completedAt =
    status === "complete" ? new Date().toISOString() : undefined;
  const has = inst.sections.some((s) => s.taskId === taskId);
  const sections = has
    ? inst.sections.map((s) =>
        s.taskId === taskId
          ? {
              ...s,
              data: { ...s.data, ...data },
              status,
              completedAt: completedAt ?? s.completedAt,
            }
          : s,
      )
    : [...inst.sections, { type, taskId, status, data, completedAt }];
  // Completing a flagged item resolves the manager's open change request for it.
  const changeRequests =
    status === "complete"
      ? inst.changeRequests.map((c) =>
          c.taskId === taskId && !c.resolvedAt
            ? { ...c, resolvedAt: completedAt }
            : c,
        )
      : inst.changeRequests;
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: { ...inst, sections, changeRequests },
    },
  });
}

/** Mark the set-password / account-setup step complete (mock). */
export function setOnboardingAccountComplete(staffId: string): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: {
        ...inst,
        account: { passwordSetAt: new Date().toISOString() },
      },
    },
  });
}

/** Resend the invite: issue a fresh token + expiry on the existing instance
 *  (invalidating the old link). Returns null if no instance exists yet. */
export function regenerateOnboardingToken(
  staffId: string,
): OnboardingInstance | null {
  const inst = hrStore.instances[staffId];
  if (!inst) return null;
  const template = hrStore.templates.find((t) => t.id === inst.templateId);
  const inviteDays =
    template?.inviteExpiryDays ?? hrStore.config.inviteExpiryDays;
  const next: OnboardingInstance = {
    ...inst,
    token: generateToken(),
    tokenExpiresAt: addDaysISO(inviteDays),
  };
  commit({
    ...hrStore,
    instances: { ...hrStore.instances, [staffId]: next },
  });
  return next;
}

/** Save (merge) a section's collected data and advance its status. */
export function saveOnboardingSection(
  staffId: string,
  sectionType: EmployeeOnboardingTaskType,
  data: Record<string, unknown>,
  status: SectionStatus = "in_progress",
): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  const completedAt =
    status === "complete" ? new Date().toISOString() : undefined;
  const has = inst.sections.some((s) => s.type === sectionType);
  const sections = has
    ? inst.sections.map((s) =>
        s.type === sectionType
          ? {
              ...s,
              data: { ...s.data, ...data },
              status,
              completedAt: completedAt ?? s.completedAt,
            }
          : s,
      )
    : [...inst.sections, { type: sectionType, status, data, completedAt }];
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: { ...inst, sections },
    },
  });
}

/** Employee submits the completed onboarding for manager review. */
export function submitOnboarding(staffId: string): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: { ...inst, submittedAt: new Date().toISOString() },
    },
  });
}

/** Derived status — onboarding submitted but not yet reviewed / activated
 *  ("Onboarding complete — pending review"). */
export function isOnboardingPendingReview(staffId: string): boolean {
  const inst = hrStore.instances[staffId];
  return Boolean(inst?.submittedAt && !inst.reviewedAt);
}

/** Section progress for a self-serve onboarding instance — the account step
 *  counts as one, plus every employee-task section. Drives the "3 of 8" labels
 *  and progress bars. */
export function onboardingProgress(inst: OnboardingInstance | undefined): {
  done: number;
  total: number;
} {
  if (!inst) return { done: 0, total: 0 };
  const sectionsDone = inst.sections.filter(
    (s) => s.status === "complete",
  ).length;
  return {
    done: sectionsDone + (inst.account ? 1 : 0),
    total: inst.sections.length + 1,
  };
}

// ── Mock onboarding-email outbox (no real send) — manager review notice,
//    account-activation, and change-request emails all land here. ────────────
export type OnboardingEmailKind =
  | "review"
  | "activation"
  | "change"
  | "reminder"
  | "invite"
  | "deadline"
  | "link_expired"
  | "offboarding_complete"
  | "hr_doc";
export interface OnboardingMockEmail {
  kind: OnboardingEmailKind;
  staffId: string;
  staffName: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}
let onboardingEmails: OnboardingMockEmail[] = [];
export function recordOnboardingEmail(
  e: Omit<OnboardingMockEmail, "sentAt">,
): OnboardingMockEmail {
  const item = { ...e, sentAt: new Date().toISOString() };
  onboardingEmails = [item, ...onboardingEmails];
  return item;
}
export function getOnboardingEmails(): OnboardingMockEmail[] {
  return onboardingEmails;
}

/** Manager reviews + activates: stamps reviewedAt and marks all sections done. */
export function reviewActivate(staffId: string): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  const now = new Date().toISOString();
  const sections = inst.sections.map((s) => ({
    ...s,
    status: "complete" as SectionStatus,
    completedAt: s.completedAt ?? now,
  }));
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: { ...inst, reviewedAt: now, sections },
    },
  });
}

/** Manager requests changes to a section — reopens it and clears the submit. */
export function requestOnboardingChange(
  staffId: string,
  sectionType: EmployeeOnboardingTaskType,
  note: string,
): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  const sections = inst.sections.map((s) =>
    s.type === sectionType
      ? { ...s, status: "in_progress" as SectionStatus }
      : s,
  );
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: {
        ...inst,
        sections,
        submittedAt: undefined,
        changeRequests: [...inst.changeRequests, { sectionType, note }],
      },
    },
  });
}

/** Manager flags one specific task for a fix — reopens that section, records the
 *  note, and returns the hire to the employee (clears submit) so they fix just
 *  that item via their link without redoing the flow. */
export function requestOnboardingChangeByTask(
  staffId: string,
  taskId: string,
  sectionType: EmployeeOnboardingTaskType,
  note: string,
): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  const sections = inst.sections.map((s) =>
    s.taskId === taskId ? { ...s, status: "in_progress" as SectionStatus } : s,
  );
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: {
        ...inst,
        sections,
        submittedAt: undefined,
        changeRequests: [...inst.changeRequests, { sectionType, taskId, note }],
      },
    },
  });
}

export function resolveOnboardingChange(
  staffId: string,
  sectionType: EmployeeOnboardingTaskType,
): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  const now = new Date().toISOString();
  const changeRequests = inst.changeRequests.map((c) =>
    c.sectionType === sectionType && !c.resolvedAt
      ? { ...c, resolvedAt: now }
      : c,
  );
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: { ...inst, changeRequests },
    },
  });
}

// ============================================================================
// Offboarding lifecycle
// ============================================================================

/** The offboarding template for a departure reason: reason-specific first,
 * then a catch-all (empty appliesToReasons), then the first template. */
/** Templates whose reasons match (reason-specific first, then universal). Used
 *  to prompt the manager when more than one applies. */
export function getOffboardingTemplatesForReason(
  reason: string,
): OffboardingTemplate[] {
  const specific = hrStore.offboardingTemplates.filter((t) =>
    t.appliesToReasons.includes(reason),
  );
  const universal = hrStore.offboardingTemplates.filter(
    (t) => t.appliesToReasons.length === 0,
  );
  return specific.length ? specific : universal;
}

export function resolveOffboardingTemplateForReason(
  reason: string,
): OffboardingTemplate | undefined {
  return getOffboardingTemplatesForReason(reason)[0];
}

/** Due date (YYYY-MM-DD) for an offboarding task, computed from today. */
function offboardingDueDate(task: OffboardingTask): string {
  const d = new Date();
  if (task.due === "within_days") d.setDate(d.getDate() + (task.days ?? 0));
  // on_termination / before_last_day → the termination date (today) in the mock.
  return d.toISOString().split("T")[0];
}

export function createOffboardingInstance(
  staffId: string,
  reason: string,
  templateId?: string,
): OffboardingInstance {
  const template =
    (templateId
      ? hrStore.offboardingTemplates.find((t) => t.id === templateId)
      : undefined) ?? resolveOffboardingTemplateForReason(reason);
  const instance: OffboardingInstance = {
    staffId,
    templateId: template?.id ?? "",
    reason,
    tasks: (template?.managerTasks ?? []).map((t) => ({
      ...t,
      dueDate: offboardingDueDate(t),
    })),
    startedAt: new Date().toISOString(),
  };
  commit({
    ...hrStore,
    offboardingInstances: {
      ...hrStore.offboardingInstances,
      [staffId]: instance,
    },
  });
  return instance;
}

/** All offboarding instances (for the manager task list). */
export function getOffboardingInstances(): OffboardingInstance[] {
  return Object.values(hrStore.offboardingInstances);
}
export function useOffboardingInstances(): OffboardingInstance[] {
  const record = useSyncExternalStore(
    subscribe,
    () => hrStore.offboardingInstances,
    () => SERVER_STATE.offboardingInstances,
  );
  return Object.values(record);
}

export function setOffboardingTaskComplete(
  staffId: string,
  taskId: string,
  complete: boolean,
  by?: string,
  note?: string,
): void {
  const inst = hrStore.offboardingInstances[staffId];
  if (!inst) return;
  const tasks = inst.tasks.map((t) =>
    t.id === taskId
      ? complete
        ? {
            ...t,
            completedAt: new Date().toISOString(),
            completedBy: by,
            completionNote: note?.trim() || undefined,
          }
        : {
            ...t,
            completedAt: undefined,
            completedBy: undefined,
            completionNote: undefined,
          }
      : t,
  );
  const allRequiredDone = tasks
    .filter((t) => t.required)
    .every((t) => t.completedAt);
  commit({
    ...hrStore,
    offboardingInstances: {
      ...hrStore.offboardingInstances,
      [staffId]: {
        ...inst,
        tasks,
        completedAt: allRequiredDone ? new Date().toISOString() : undefined,
      },
    },
  });
}

/** Offboarding instances with an OVERDUE required task not yet reminded today —
 *  drives the daily overdue reminder. The caller fires the notification (keeps
 *  this store free of a facility-notifications import) then marks it reminded. */
export function getOverdueOffboardingReminders(
  today: string,
): OffboardingInstance[] {
  return Object.values(hrStore.offboardingInstances).filter((inst) => {
    if (inst.completedAt || inst.lastReminderDate === today) return false;
    return inst.tasks.some(
      (t) =>
        t.required && !t.completedAt && t.dueDate != null && t.dueDate < today,
    );
  });
}
export function markOffboardingReminded(staffId: string, today: string): void {
  const inst = hrStore.offboardingInstances[staffId];
  if (!inst) return;
  commit({
    ...hrStore,
    offboardingInstances: {
      ...hrStore.offboardingInstances,
      [staffId]: { ...inst, lastReminderDate: today },
    },
  });
}

/** Attach a permanent final document (ROE / termination letter / settlement) to
 *  the offboarding record. `retainUntil` is derived from the HR retention config
 *  by the caller. There is deliberately no remove counterpart — final documents
 *  are permanent. */
export function addOffboardingDocument(
  staffId: string,
  doc: OffboardingDocument,
): void {
  const inst = hrStore.offboardingInstances[staffId];
  if (!inst) return;
  commit({
    ...hrStore,
    offboardingInstances: {
      ...hrStore.offboardingInstances,
      [staffId]: {
        ...inst,
        finalDocuments: [doc, ...(inst.finalDocuments ?? [])],
      },
    },
  });
}

// ── Lifecycle notification selectors (Table 5) ──────────────────────────────
// Detection + dedup for the polling-style triggers. The FIRING (in-app feed +
// email) is done by the caller via lib/staff-notifications.ts — this store
// stays free of a facility-notifications import.

/** True once the employee has begun onboarding (account created or any section
 *  touched). Drives the "not started" staff-card alert. */
export function isOnboardingStarted(inst: OnboardingInstance): boolean {
  return (
    Boolean(inst.account) ||
    inst.sections.some((s) => s.status !== "not_started")
  );
}

/** Whole days elapsed since the invite was sent (0 if unknown). */
export function daysSinceInvite(inst: OnboardingInstance, today = new Date()): number {
  if (!inst.invitedAt) return 0;
  const ms = today.getTime() - new Date(inst.invitedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/** Invites whose link has expired unused, not yet alerted. */
export function getExpiredOnboardingInvites(now = new Date()): OnboardingInstance[] {
  return Object.values(hrStore.instances).filter(
    (i) =>
      !i.submittedAt &&
      !i.reviewedAt &&
      !i.expiryNotifiedAt &&
      new Date(i.tokenExpiresAt).getTime() < now.getTime(),
  );
}
export function markOnboardingInviteExpiredNotified(staffId: string): void {
  const inst = hrStore.instances[staffId];
  if (!inst || inst.expiryNotifiedAt) return;
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: { ...inst, expiryNotifiedAt: new Date().toISOString() },
    },
  });
}

/** Onboarding past its completion deadline, still unsubmitted, not reminded
 *  today (drives the manager daily reminder). */
export function getOverdueOnboarding(today: string): OnboardingInstance[] {
  const deadlineDays = hrStore.config.completionDeadlineDays;
  return Object.values(hrStore.instances).filter((i) => {
    if (i.submittedAt || i.reviewedAt || !i.invitedAt) return false;
    if (i.lastDeadlineReminder === today) return false;
    const deadline = new Date(i.invitedAt);
    deadline.setDate(deadline.getDate() + deadlineDays);
    return deadline.toISOString().split("T")[0] < today;
  });
}
export function markOnboardingDeadlineReminded(staffId: string, today: string): void {
  const inst = hrStore.instances[staffId];
  if (!inst) return;
  commit({
    ...hrStore,
    instances: {
      ...hrStore.instances,
      [staffId]: { ...inst, lastDeadlineReminder: today },
    },
  });
}

/** Offboarding instances with a required task due exactly today, not yet
 *  notified today. */
export function getOffboardingDueToday(today: string): OffboardingInstance[] {
  return Object.values(hrStore.offboardingInstances).filter((inst) => {
    if (inst.completedAt || inst.dueTodayNotifiedDate === today) return false;
    return inst.tasks.some(
      (t) => t.required && !t.completedAt && t.dueDate === today,
    );
  });
}
export function markOffboardingDueTodayNotified(staffId: string, today: string): void {
  const inst = hrStore.offboardingInstances[staffId];
  if (!inst) return;
  commit({
    ...hrStore,
    offboardingInstances: {
      ...hrStore.offboardingInstances,
      [staffId]: { ...inst, dueTodayNotifiedDate: today },
    },
  });
}

/** True when offboarding just reached fully-complete and hasn't been announced
 *  yet — caller fires the "offboarding complete" notification then marks it. */
export function isOffboardingNewlyComplete(staffId: string): boolean {
  const inst = hrStore.offboardingInstances[staffId];
  return Boolean(inst?.completedAt) && !inst?.completeNotifiedAt;
}
export function markOffboardingCompleteNotified(staffId: string): void {
  const inst = hrStore.offboardingInstances[staffId];
  if (!inst || inst.completeNotifiedAt) return;
  commit({
    ...hrStore,
    offboardingInstances: {
      ...hrStore.offboardingInstances,
      [staffId]: { ...inst, completeNotifiedAt: new Date().toISOString() },
    },
  });
}
