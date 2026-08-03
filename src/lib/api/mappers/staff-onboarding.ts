import type {
  EmployeeCustomQuestion,
  EmployeeFieldSpec,
  EmployeeOnboardingTask,
  EmployeeOnboardingTaskType,
  OffboardingTask,
  OffboardingTemplate,
  OnboardingTask,
  OnboardingTaskType,
  OnboardingTemplate,
  StaffHrConfig,
} from "@/data/staff-onboarding";
import type { FacilityStaffRole } from "@/types/facility-staff";
import type { Tables, TablesInsert } from "@/types/database";

// ============================================================================
// Database rows <-> the template objects the app already expects.
//
// The read direction has to rebuild a nested shape from four tables, so the
// selects below are written as one query with embedded resources rather than
// four round trips and a stitch — the same call the client mapper makes for
// `client.pets`.
//
// ORDER IS NOT INCIDENTAL. `position` is what makes a template's steps stable
// (see 20260803140000, Decision 3), so every task list is sorted by it here
// rather than trusting whatever order PostgREST returns an embedded array in.
// Sorting in the mapper rather than only in the query means a caller who
// forgets `.order()` still gets a correct template.
// ============================================================================

type TemplateRow = Tables<"onboarding_templates"> & {
  onboarding_manager_tasks?: Tables<"onboarding_manager_tasks">[] | null;
  onboarding_employee_tasks?: Tables<"onboarding_employee_tasks">[] | null;
};
type OffboardingTemplateRow = Tables<"offboarding_templates"> & {
  offboarding_tasks?: Tables<"offboarding_tasks">[] | null;
};

const byPosition = <T extends { position: number }>(a: T, b: T) =>
  a.position - b.position;

/** The app keys tasks by string id and always has; `legacy_id` preserves the
 *  seeded ones so a stored template survives the move. New rows fall back to
 *  the uuid, which is a perfectly good string id. */
const appId = (row: { id: string; legacy_id: string | null }) =>
  row.legacy_id ?? row.id;

function rowToManagerTask(
  row: Tables<"onboarding_manager_tasks">,
): OnboardingTask {
  return {
    id: appId(row),
    name: row.name,
    description: row.description,
    requiresManager: row.requires_manager,
    type: row.task_type as OnboardingTaskType,
    required: row.required,
    when: row.when_due as OnboardingTask["when"],
    whenDays: row.when_days ?? undefined,
    assignedTo: row.assigned_to as OnboardingTask["assignedTo"],
  };
}

function rowToEmployeeTask(
  row: Tables<"onboarding_employee_tasks">,
): EmployeeOnboardingTask {
  const config = (row.config ?? {}) as {
    fields?: EmployeeFieldSpec[];
    question?: EmployeeCustomQuestion;
  };
  return {
    id: appId(row),
    type: row.task_type as EmployeeOnboardingTaskType,
    name: row.name,
    description: row.description ?? undefined,
    required: row.required,
    fields: config.fields ?? [],
    documentName: row.document_name ?? undefined,
    documentRef: row.document_ref ?? undefined,
    question: config.question,
  };
}

export function rowToOnboardingTemplate(row: TemplateRow): OnboardingTemplate {
  return {
    id: appId(row),
    name: row.name,
    appliesToRoles: row.applies_to_roles as FacilityStaffRole[],
    completionDeadlineDays: row.completion_deadline_days,
    inviteExpiryDays: row.invite_expiry_days,
    welcomeMessage: row.welcome_message,
    status: row.status as OnboardingTemplate["status"],
    managerTasks: [...(row.onboarding_manager_tasks ?? [])]
      .sort(byPosition)
      .map(rowToManagerTask),
    employeeTasks: [...(row.onboarding_employee_tasks ?? [])]
      .sort(byPosition)
      .map(rowToEmployeeTask),
  };
}

export function rowToOffboardingTemplate(
  row: OffboardingTemplateRow,
): OffboardingTemplate {
  return {
    id: appId(row),
    name: row.name,
    appliesToReasons: row.applies_to_reasons,
    managerTasks: [...(row.offboarding_tasks ?? [])].sort(byPosition).map(
      (t): OffboardingTask => ({
        id: appId(t),
        name: t.name,
        description: t.description,
        assignedTo: t.assigned_to as OffboardingTask["assignedTo"],
        due: t.due as OffboardingTask["due"],
        days: t.days ?? undefined,
        required: t.required,
      }),
    ),
  };
}

export function rowToStaffHrConfig(
  row: Tables<"staff_hr_config">,
): StaffHrConfig {
  return {
    employmentTypes: row.employment_types,
    terminationReasons: row.termination_reasons,
    inviteExpiryDays: row.invite_expiry_days,
    completionDeadlineDays: row.completion_deadline_days,
    hrDocRetentionYears: row.hr_doc_retention_years,
    requireClockInConfirm: row.require_clock_in_confirm,
    requireClockOutConfirm: row.require_clock_out_confirm,
    requireRegisterOpenOnLogin: row.require_register_open_on_login,
    registerCloseReminder:
      row.register_close_reminder as StaffHrConfig["registerCloseReminder"],
    // Through `unknown`: the generated `Json` type and the app's
    // Record<StaffNotifTriggerKey, StaffNotifTrigger> describe the same bytes
    // and TypeScript cannot see it. The database has no opinion on the shape of
    // a jsonb column, which is the whole reason this tail is jsonb.
    notificationTriggers: (row.notification_triggers ??
      {}) as unknown as StaffHrConfig["notificationTriggers"],
  };
}

// ── Writing ─────────────────────────────────────────────────────────────────
// `position` is assigned from array index rather than accepted from the client:
// the app models a template's steps as an ordered array, so the array IS the
// order, and letting a caller send both invites the two to disagree.

export function templateToRow(
  input: Partial<OnboardingTemplate>,
  context: { facilityId?: string } = {},
): Partial<TablesInsert<"onboarding_templates">> {
  const row: Partial<TablesInsert<"onboarding_templates">> = {};
  if (context.facilityId) row.facility_id = context.facilityId;
  if (input.name !== undefined) row.name = input.name;
  if (input.status !== undefined) row.status = input.status;
  if (input.appliesToRoles !== undefined) {
    row.applies_to_roles = input.appliesToRoles;
  }
  if (input.completionDeadlineDays !== undefined) {
    row.completion_deadline_days = input.completionDeadlineDays;
  }
  if (input.inviteExpiryDays !== undefined) {
    row.invite_expiry_days = input.inviteExpiryDays;
  }
  if (input.welcomeMessage !== undefined) {
    row.welcome_message = input.welcomeMessage;
  }
  return row;
}

export function managerTasksToRows(
  tasks: OnboardingTask[],
  context: { templateId: string; facilityId: string },
): TablesInsert<"onboarding_manager_tasks">[] {
  return tasks.map((task, index) => ({
    template_id: context.templateId,
    facility_id: context.facilityId,
    legacy_id: task.id || null,
    position: index + 1,
    task_type: task.type,
    name: task.name,
    description: task.description ?? "",
    requires_manager: task.requiresManager,
    required: task.required ?? true,
    when_due: task.when ?? "on_hire",
    // The CHECK constraint requires these to agree: "due in N days" with no N
    // is a task pretending to have a due date.
    when_days: task.when === "within_days" ? (task.whenDays ?? 0) : null,
    assigned_to: task.assignedTo ?? "manager",
  }));
}

export function employeeTasksToRows(
  tasks: EmployeeOnboardingTask[],
  context: { templateId: string; facilityId: string },
): TablesInsert<"onboarding_employee_tasks">[] {
  return tasks.map((task, index) => ({
    template_id: context.templateId,
    facility_id: context.facilityId,
    legacy_id: task.id || null,
    position: index + 1,
    task_type: task.type,
    name: task.name,
    description: task.description ?? null,
    required: task.required,
    document_name: task.documentName ?? null,
    document_ref: task.documentRef ?? null,
    config: {
      fields: task.fields ?? [],
      ...(task.question ? { question: task.question } : {}),
    } as unknown as TablesInsert<"onboarding_employee_tasks">["config"],
  }));
}

export function offboardingTemplateToRow(
  input: Partial<OffboardingTemplate>,
  context: { facilityId?: string } = {},
): Partial<TablesInsert<"offboarding_templates">> {
  const row: Partial<TablesInsert<"offboarding_templates">> = {};
  if (context.facilityId) row.facility_id = context.facilityId;
  if (input.name !== undefined) row.name = input.name;
  if (input.appliesToReasons !== undefined) {
    row.applies_to_reasons = input.appliesToReasons;
  }
  return row;
}

export function offboardingTasksToRows(
  tasks: OffboardingTask[],
  context: { templateId: string; facilityId: string },
): TablesInsert<"offboarding_tasks">[] {
  return tasks.map((task, index) => ({
    template_id: context.templateId,
    facility_id: context.facilityId,
    legacy_id: task.id || null,
    position: index + 1,
    name: task.name,
    description: task.description ?? "",
    assigned_to: task.assignedTo,
    due: task.due,
    days: task.due === "within_days" ? (task.days ?? 0) : null,
    required: task.required,
  }));
}

export function hrConfigToRow(
  input: Partial<StaffHrConfig>,
  facilityId: string,
): TablesInsert<"staff_hr_config"> {
  const row: TablesInsert<"staff_hr_config"> = { facility_id: facilityId };
  if (input.employmentTypes !== undefined) {
    row.employment_types = input.employmentTypes;
  }
  if (input.terminationReasons !== undefined) {
    row.termination_reasons = input.terminationReasons;
  }
  if (input.inviteExpiryDays !== undefined) {
    row.invite_expiry_days = input.inviteExpiryDays;
  }
  if (input.completionDeadlineDays !== undefined) {
    row.completion_deadline_days = input.completionDeadlineDays;
  }
  if (input.hrDocRetentionYears !== undefined) {
    row.hr_doc_retention_years = input.hrDocRetentionYears;
  }
  if (input.requireClockInConfirm !== undefined) {
    row.require_clock_in_confirm = input.requireClockInConfirm;
  }
  if (input.requireClockOutConfirm !== undefined) {
    row.require_clock_out_confirm = input.requireClockOutConfirm;
  }
  if (input.requireRegisterOpenOnLogin !== undefined) {
    row.require_register_open_on_login = input.requireRegisterOpenOnLogin;
  }
  if (input.registerCloseReminder !== undefined) {
    row.register_close_reminder = input.registerCloseReminder;
  }
  if (input.notificationTriggers !== undefined) {
    row.notification_triggers =
      input.notificationTriggers as unknown as TablesInsert<"staff_hr_config">["notification_triggers"];
  }
  return row;
}

/** Selects that satisfy the mappers above. Kept beside them because the two
 *  must agree: a column dropped from the select becomes `undefined` in the
 *  mapped object rather than a type error. */
export const TEMPLATE_SELECT =
  `*, onboarding_manager_tasks ( * ), onboarding_employee_tasks ( * )` as const;
export const OFFBOARDING_TEMPLATE_SELECT =
  `*, offboarding_tasks ( * )` as const;
