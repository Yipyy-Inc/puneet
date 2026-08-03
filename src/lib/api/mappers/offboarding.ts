import type {
  OffboardingInstance,
  OffboardingTaskState,
} from "@/data/staff-onboarding";

// ============================================================================
// offboarding_instances + offboarding_task_states → OffboardingInstance.
//
// The UI type is kept EXACTLY as the mock store defined it, so the screens
// swap over without a rewrite. Two consequences worth stating rather than
// discovering:
//
//   * `staffId` is the staff row's `legacy_id`, not its uuid. Every offboarding
//     screen is keyed by StaffProfile.id, which is the legacy id, and the
//     instance is looked up by it. Returning the uuid here would typecheck and
//     silently match nothing.
//
//   * `tasks[].id` is `task_key`, not the state row's uuid. The mock's
//     setOffboardingTaskComplete(staffId, taskId) addressed template task ids,
//     and task_key IS that id (offboarding_tasks.legacy_id, falling back to its
//     uuid). Using the state row's own id would work today and break the moment
//     a task is re-materialised.
//
// Absent optional fields are LEFT OFF rather than defaulted. `completedAt`
// undefined means "not done"; `completedAt: ""` would be a falsy string that
// reads as done to anything doing a presence check less carefully.
// ============================================================================

export const OFFBOARDING_SELECT = `
  id, reason, last_day, started_at, completed_at,
  last_reminder_date, due_today_notified_date, complete_notified_at,
  staff:staff_id ( legacy_id ),
  template:template_id ( legacy_id ),
  tasks:offboarding_task_states (
    task_key, name, description, required, assigned_to, position,
    due_date, completed_at, completed_by, completion_note
  )
` as const;

interface TaskRow {
  task_key: string;
  name: string;
  description: string;
  required: boolean;
  assigned_to: string;
  position: number;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
}

export interface InstanceRow {
  id: string;
  reason: string;
  last_day: string | null;
  started_at: string;
  completed_at: string | null;
  last_reminder_date: string | null;
  due_today_notified_date: string | null;
  complete_notified_at: string | null;
  staff: { legacy_id: string | null } | null;
  template: { legacy_id: string | null } | null;
  tasks: TaskRow[] | null;
}

/**
 * Who completed a task, as a NAME rather than a uuid.
 *
 * `completed_by` references auth.users, which PostgREST cannot embed — and the
 * same is true of staff_documents.uploaded_by and staff_signatures.signed_by,
 * so this is the schema's convention rather than an oversight to route around.
 * The caller resolves the ids against `profiles` in one batched query and
 * passes the result here.
 *
 * A uuid with no entry falls back to UNDEFINED, not to the uuid itself: the UI
 * renders `by ${completedBy}`, and "by 3f2a91c4-…" is worse than "by" nothing.
 * An unreadable profile is a legitimate outcome — RLS decides who can see whom.
 */
export type ActorNames = Record<string, string | undefined>;

function rowToTask(row: TaskRow, names: ActorNames): OffboardingTaskState {
  const completedBy = row.completed_by ? names[row.completed_by] : undefined;
  return {
    id: row.task_key,
    name: row.name,
    description: row.description,
    assignedTo: row.assigned_to as OffboardingTaskState["assignedTo"],
    // `due`/`days` are the template's RULE and are not stored per-instance —
    // materialising resolved them into due_date (20260804180000). The type
    // requires `due`, so it reports what the resolved date already is rather
    // than inventing a rule the row does not carry.
    due: "on_termination",
    required: row.required,
    ...(row.due_date ? { dueDate: row.due_date } : {}),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    ...(completedBy ? { completedBy } : {}),
    ...(row.completion_note ? { completionNote: row.completion_note } : {}),
  };
}

/** Every actor id referenced by a batch of rows, for the one profiles lookup. */
export function actorIdsOf(rows: InstanceRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const task of row.tasks ?? []) {
      if (task.completed_by) ids.add(task.completed_by);
    }
  }
  return [...ids];
}

export function rowToOffboardingInstance(
  row: InstanceRow,
  names: ActorNames = {},
): OffboardingInstance {
  return {
    staffId: row.staff?.legacy_id ?? "",
    templateId: row.template?.legacy_id ?? "",
    reason: row.reason,
    startedAt: row.started_at,
    // Ordered here rather than trusted from the embed: PostgREST does not
    // guarantee the order of an embedded collection, and `position` is the one
    // thing a checklist cannot get wrong.
    tasks: [...(row.tasks ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((task) => rowToTask(task, names)),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    ...(row.last_reminder_date
      ? { lastReminderDate: row.last_reminder_date }
      : {}),
    ...(row.due_today_notified_date
      ? { dueTodayNotifiedDate: row.due_today_notified_date }
      : {}),
    ...(row.complete_notified_at
      ? { completeNotifiedAt: row.complete_notified_at }
      : {}),
  };
}
