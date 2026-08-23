import type { Tables } from "@/types/database";

// ============================================================================
// The chore library and its groups -> what the three tabs read.
//
// ── A DEFINITION IS NOT A TASK ────────────────────────────────────────────
//
// `TaskDefinitionRow` is the reusable chore ("hose down run 3", 15 minutes,
// needs a photo). `TaskRow` in `facility-task.ts` is one instance of somebody
// having to do it, with a status and a due time. Generating COPIES the first
// into the second — editing the chore afterwards leaves finished work alone,
// which is the whole reason they are separate tables.
//
// ── AND NOT A `task_templates` ROW EITHER ─────────────────────────────────
//
// `task_templates` is booking-driven: when a boarding stay begins, create
// these. This is shift-driven: every morning, regardless of who is staying.
// Two schedules, two tables, and they were nearly merged on the strength of
// both being called "templates".
// ============================================================================

export type TaskGroupScope = "shift" | "position";
export type ShiftKey = "morning" | "afternoon" | "night";

export interface TaskDefinitionRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedMinutes: number | null;
  requiresPhoto: boolean;
  requiresSignoff: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** How many groups name this chore. Non-zero means it cannot be deleted. */
  usedByGroups?: number;
}

export interface TaskGroupItemRow {
  definitionId: string;
  sortOrder: number;
  /** Present when the group was read with its chores. */
  definition?: TaskDefinitionRow;
}

export interface TaskGroupRow {
  id: string;
  name: string;
  description: string | null;
  scope: TaskGroupScope;
  /** Set when `scope` is "shift". A daypart, not a row in a `shifts` table. */
  shiftKey: ShiftKey | null;
  /** Set when `scope` is "position". */
  departmentId: string | null;
  departmentName: string | null;
  /** 0=Sunday … 6=Saturday. EMPTY MEANS EVERY DAY, not "never". */
  daysOfWeek: number[];
  isRecurring: boolean;
  specificDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: TaskGroupItemRow[];
}

export const DEFINITION_SELECT =
  "id, title, description, category, priority, estimated_minutes, requires_photo, requires_signoff, is_active, created_at, updated_at";

export const GROUP_SELECT =
  "id, name, description, scope, shift_key, department_id, days_of_week, is_recurring, specific_date, is_active, created_at, updated_at, " +
  "facility_departments:department_id(name), " +
  `facility_task_group_items(sort_order, facility_task_definitions:definition_id(${DEFINITION_SELECT}))`;

interface DepartmentEmbed {
  name: string;
}

interface ItemEmbed {
  sort_order: number;
  facility_task_definitions?:
    | Tables<"facility_task_definitions">
    | Tables<"facility_task_definitions">[]
    | null;
}

export type TaskGroupRecord = Tables<"facility_task_groups"> & {
  // A to-ONE relation, so an object or null.
  facility_departments?: DepartmentEmbed | DepartmentEmbed[] | null;
  // A to-MANY relation, so genuinely an array. The distinction matters: reading
  // a to-one as an array is what emptied the boarding board once, and treating
  // this one as an object would drop every chore but the first.
  facility_task_group_items?: ItemEmbed[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function toDefinitionRow(
  row: Tables<"facility_task_definitions">,
  usedByGroups?: number,
): TaskDefinitionRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority as TaskDefinitionRow["priority"],
    estimatedMinutes: row.estimated_minutes,
    requiresPhoto: row.requires_photo,
    requiresSignoff: row.requires_signoff,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(usedByGroups === undefined ? {} : { usedByGroups }),
  };
}

export function toGroupRow(row: TaskGroupRecord): TaskGroupRow {
  const items = (row.facility_task_group_items ?? [])
    .map((item) => {
      const definition = one(item.facility_task_definitions);
      return {
        definitionId: definition?.id ?? "",
        sortOrder: item.sort_order,
        ...(definition ? { definition: toDefinitionRow(definition) } : {}),
      };
    })
    .filter((item) => item.definitionId !== "")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    scope: row.scope as TaskGroupScope,
    shiftKey: row.shift_key as ShiftKey | null,
    departmentId: row.department_id,
    departmentName: one(row.facility_departments)?.name ?? null,
    daysOfWeek: (row.days_of_week ?? []).map(Number),
    isRecurring: row.is_recurring,
    specificDate: row.specific_date,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}
