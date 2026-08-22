import type {
  PersistedTaskTemplate,
  NewTaskTemplate,
  TaskTemplatePatch,
} from "@/types/task-template";
import type { TaskTemplate } from "@/types/task";
import type { Database } from "@/types/database";

// ============================================================================
// task_templates row <-> TaskTemplate.
//
// The table stores timing and recurrence FLAT — `timing_type`,
// `recurring_frequency` — because those values are switched on by the
// scheduler and belong where a check constraint can hold them. The screens
// speak the nested shape. This is the only place that knows both.
// ============================================================================

export const TASK_TEMPLATE_SELECT = `
  id, facility_id, module_id, name, description, category,
  timing_type, timing_offset_minutes, timing_custom_time,
  duration_minutes, assign_to, required_role,
  is_required, auto_create,
  recurring_frequency, recurring_times, sort_order
`;

export interface TaskTemplateRow {
  id: string;
  facility_id: string;
  module_id: string;
  name: string;
  description: string | null;
  category: string;
  timing_type: string;
  timing_offset_minutes: number | null;
  timing_custom_time: string | null;
  duration_minutes: number | null;
  assign_to: string | null;
  required_role: string | null;
  is_required: boolean;
  auto_create: boolean;
  recurring_frequency: string | null;
  recurring_times: string[] | null;
  sort_order: number;
}

export function rowToTaskTemplate(row: TaskTemplateRow): PersistedTaskTemplate {
  return {
    id: row.id,
    facilityId: row.facility_id,
    moduleId: row.module_id,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category as PersistedTaskTemplate["category"],
    timing: {
      type: row.timing_type as PersistedTaskTemplate["timing"]["type"],
      offsetMinutes: row.timing_offset_minutes ?? undefined,
      customTime: row.timing_custom_time ?? undefined,
    },
    durationMinutes: row.duration_minutes ?? undefined,
    assignTo: (row.assign_to ?? undefined) as PersistedTaskTemplate["assignTo"],
    requiredRole: row.required_role ?? undefined,
    isRequired: row.is_required,
    autoCreate: row.auto_create,
    // A frequency is what makes the times mean anything, and the table refuses
    // times without one — so the absence of a frequency is the absence of a
    // recurrence, not a recurrence with a missing field.
    recurring: row.recurring_frequency
      ? {
          frequency: row.recurring_frequency as NonNullable<
            PersistedTaskTemplate["recurring"]
          >["frequency"],
          times: row.recurring_times ?? undefined,
        }
      : undefined,
    sortOrder: row.sort_order,
  };
}

/** The screens' own shape. Identical minus the row's bookkeeping. */
export function toScreenTemplate(t: PersistedTaskTemplate): TaskTemplate {
  return {
    id: t.id,
    moduleId: t.moduleId,
    name: t.name,
    description: t.description,
    category: t.category,
    timing: t.timing,
    durationMinutes: t.durationMinutes,
    assignTo: t.assignTo,
    requiredRole: t.requiredRole,
    isRequired: t.isRequired,
    autoCreate: t.autoCreate,
    recurring: t.recurring,
  };
}

type TaskTemplateInsert =
  Database["public"]["Tables"]["task_templates"]["Insert"];
type TaskTemplateUpdate =
  Database["public"]["Tables"]["task_templates"]["Update"];

/**
 * A new template's columns.
 *
 * The facility and the author are arguments rather than fields on the input,
 * because a caller does not get to say which facility it is writing to —
 * that comes from the session (`check:facility-from-session`).
 */
export function newTemplateToInsert(
  input: NewTaskTemplate,
  facilityId: string,
  createdBy: string,
): TaskTemplateInsert {
  return {
    facility_id: facilityId,
    created_by: createdBy,
    module_id: input.moduleId,
    name: input.name,
    description: input.description ?? null,
    category: input.category,
    timing_type: input.timing.type,
    timing_offset_minutes: input.timing.offsetMinutes ?? null,
    timing_custom_time: input.timing.customTime ?? null,
    duration_minutes: input.durationMinutes ?? null,
    assign_to: input.assignTo ?? null,
    required_role: input.requiredRole ?? null,
    is_required: input.isRequired,
    auto_create: input.autoCreate,
    recurring_frequency: input.recurring?.frequency ?? null,
    recurring_times: input.recurring?.times ?? null,
    sort_order: input.sortOrder ?? 0,
  };
}

/**
 * An edit's columns.
 *
 * A key the caller did not send is left out entirely rather than nulled: a
 * PATCH that mentions nothing must change nothing. `timing` and `recurring`
 * are all-or-nothing — the form sends the whole object — so when either key is
 * present its absent sub-fields ARE meant to clear.
 */
export function patchToUpdate(patch: TaskTemplatePatch): TaskTemplateUpdate {
  const cols: TaskTemplateUpdate = {};

  if (patch.name !== undefined) cols.name = patch.name;
  if (patch.description !== undefined)
    cols.description = patch.description ?? null;
  if (patch.category !== undefined) cols.category = patch.category;

  if (patch.timing !== undefined) {
    cols.timing_type = patch.timing.type;
    cols.timing_offset_minutes = patch.timing.offsetMinutes ?? null;
    cols.timing_custom_time = patch.timing.customTime ?? null;
  }

  if (patch.durationMinutes !== undefined)
    cols.duration_minutes = patch.durationMinutes ?? null;
  if (patch.assignTo !== undefined) cols.assign_to = patch.assignTo ?? null;
  if (patch.requiredRole !== undefined)
    cols.required_role = patch.requiredRole ?? null;
  if (patch.isRequired !== undefined) cols.is_required = patch.isRequired;
  if (patch.autoCreate !== undefined) cols.auto_create = patch.autoCreate;
  if (patch.sortOrder !== undefined) cols.sort_order = patch.sortOrder;

  if ("recurring" in patch) {
    cols.recurring_frequency = patch.recurring?.frequency ?? null;
    cols.recurring_times = patch.recurring?.times ?? null;
  }

  return cols;
}
