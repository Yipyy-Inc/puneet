import type { Tables } from "@/types/database";
import { DELIVERABLE_TRIGGERS } from "@/types/automations";
import type {
  Audience,
  Workflow,
  WorkflowKind,
  WorkflowStatus,
  WorkflowStep,
  Frequency,
} from "@/types/workflows";

export const WORKFLOW_SELECT =
  "id, name, description, kind, status, trigger, audience, location_ids, frequency, day_of_week, day_of_month, send_at_local, min_days_between_sends, stop_on, last_estimate, last_run_at, created_at, updated_at";

export const STEP_SELECT =
  "id, step_index, delay_minutes, email_template_id, sms_template_id";

export interface WorkflowUsage {
  activeEnrollments: number;
  totalEnrollments: number;
  messagesSent: number;
  stoppedEarly: number;
}

export function toStep(row: Tables<"workflow_steps">): WorkflowStep {
  return {
    id: row.id,
    stepIndex: row.step_index,
    delayMinutes: row.delay_minutes,
    emailTemplateId: row.email_template_id,
    smsTemplateId: row.sms_template_id,
  };
}

export function toWorkflow(
  row: Tables<"workflows">,
  steps: WorkflowStep[],
  usage?: WorkflowUsage,
): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind as WorkflowKind,
    status: row.status as WorkflowStatus,
    trigger: row.trigger,
    audience: (row.audience as Audience | null) ?? null,
    locationIds: row.location_ids ?? [],
    frequency: (row.frequency as Frequency | null) ?? null,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    // Postgres hands back `time` as "HH:MM:SS"; the picker speaks "HH:mm".
    sendAtLocal: row.send_at_local ? row.send_at_local.slice(0, 5) : null,
    minDaysBetweenSends: row.min_days_between_sends,
    stopOn: Array.isArray(row.stop_on) ? (row.stop_on as string[]) : [],
    lastEstimate: row.last_estimate,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    steps: steps.sort((a, b) => a.stepIndex - b.stepIndex),

    activeEnrollments: usage?.activeEnrollments ?? 0,
    totalEnrollments: usage?.totalEnrollments ?? 0,
    messagesSent: usage?.messagesSent ?? 0,
    stoppedEarly: usage?.stoppedEarly ?? 0,

    // An audience workflow is always deliverable: its trigger is the clock, and
    // the clock always runs. An event workflow is only deliverable if something
    // actually emits its trigger — the same honest list the rules use.
    deliverable:
      row.kind === "audience"
        ? true
        : DELIVERABLE_TRIGGERS.has(row.trigger ?? ""),
  };
}

/**
 * Fold enrolments and sends into per-workflow counts.
 *
 * Counted here rather than with a PostgREST aggregate for the same reason the
 * rules count their sends here: a workflow that has enrolled NOBODY must come
 * back as 0 rather than vanish from the list, and an inner join loses exactly
 * those.
 */
export function foldWorkflowUsage(
  enrollments: { workflow_id: string; status: string }[],
  sends: { source_id: string | null; status: string }[],
): Map<string, WorkflowUsage> {
  const usage = new Map<string, WorkflowUsage>();
  const get = (id: string) => {
    const existing = usage.get(id);
    if (existing) return existing;
    const fresh: WorkflowUsage = {
      activeEnrollments: 0,
      totalEnrollments: 0,
      messagesSent: 0,
      stoppedEarly: 0,
    };
    usage.set(id, fresh);
    return fresh;
  };

  for (const row of enrollments) {
    const u = get(row.workflow_id);
    u.totalEnrollments += 1;
    if (row.status === "active") u.activeEnrollments += 1;
    if (row.status === "stopped") u.stoppedEarly += 1;
  }

  for (const row of sends) {
    if (!row.source_id) continue;
    // Only `sent` counts. Queued or skipped is not a message anybody received,
    // and this number replaces one that claimed 1,392 sends for a system that
    // had never sent anything.
    if (row.status === "sent") get(row.source_id).messagesSent += 1;
  }

  return usage;
}
