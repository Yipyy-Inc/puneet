import type { Tables } from "@/types/database";

// ============================================================================
// A task row -> what the board reads.
//
// ── THE ASSIGNEE'S NAME IS JOINED, NOT STORED ─────────────────────────────
//
// `StandaloneTask` carried `assignedToId` AND `assignedToName` side by side,
// which is a copy that goes stale the first time somebody changes their name or
// marries. A task is a live instruction, not a record of what a person was
// called on a Tuesday — so the name comes from the join every time.
//
// That is the opposite of the decision taken for waiver signatures and form
// versions, and the difference is the point: those preserve what somebody was
// SHOWN, and must not move under them.
//
// ── ONE INSTANT, NOT A DATE PLUS A TIME ───────────────────────────────────
//
// The fixture split `dueDate` and an optional `dueTime`, and every consumer
// re-joined them as `new Date(`${dueDate}T${dueTime ?? "23:59"}`)` — which
// reads the browser's offset, so the same task was overdue in one timezone and
// not in another. `dueAt` is a single instant.
// ============================================================================

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskSource =
  | "manual"
  | "call_follow_up"
  | "reputation_escalation"
  | "template";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;

  assignedToId: string | null;
  assignedToName: string | null;

  dueAt: string | null;
  estimatedMinutes: number | null;
  requiresPhoto: boolean;
  requiresSignoff: boolean;
  notes: string | null;

  completedAt: string | null;
  completedByName: string | null;

  source: TaskSource;
  sourceRef: string | null;
  templateId: string | null;
  metadata: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;

  /**
   * Past its due time and not finished.
   *
   * Derived on the SERVER, from one clock. The fixture computed this in the
   * browser against a `new Date()` the server never saw, so a facility on the
   * other side of midnight disagreed with its own reports about which tasks
   * were late. Same rule as `effectiveStatus` on a gift card: a state a clock
   * can change must never be a stored column either.
   */
  overdue: boolean;
}

interface StaffEmbed {
  first_name: string;
  last_name: string;
}

export type TaskRecord = Tables<"facility_tasks"> & {
  // TO-ONE relations, so PostgREST returns an object or null — not an array.
  assignee?: StaffEmbed | StaffEmbed[] | null;
  completer?: StaffEmbed | StaffEmbed[] | null;
};

export const TASK_SELECT =
  "id, title, description, category, priority, status, assigned_to, due_at, estimated_minutes, requires_photo, requires_signoff, notes, completed_at, completed_by, source, source_ref, template_id, metadata, created_at, updated_at, assignee:assigned_to(first_name, last_name), completer:completed_by(first_name, last_name)";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function nameOf(
  embed: StaffEmbed | StaffEmbed[] | null | undefined,
): string | null {
  const row = one(embed);
  if (!row) return null;
  const name = `${row.first_name} ${row.last_name}`.trim();
  return name || null;
}

export function toTaskRow(row: TaskRecord, now: Date = new Date()): TaskRow {
  const status = row.status as TaskStatus;
  const open = status === "pending" || status === "in_progress";

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority as TaskPriority,
    status,

    assignedToId: row.assigned_to,
    assignedToName: nameOf(row.assignee),

    dueAt: row.due_at,
    estimatedMinutes: row.estimated_minutes,
    requiresPhoto: row.requires_photo,
    requiresSignoff: row.requires_signoff,
    notes: row.notes,

    completedAt: row.completed_at,
    completedByName: nameOf(row.completer),

    source: row.source as TaskSource,
    sourceRef: row.source_ref,
    templateId: row.template_id,
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    overdue: open && row.due_at !== null && new Date(row.due_at) < now,
  };
}
