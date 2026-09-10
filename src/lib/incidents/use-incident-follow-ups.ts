"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  taskQueries,
  useCreateTask,
  useUpdateTask,
  type TaskRow,
} from "@/lib/api/facility-tasks";
import type { FollowUpTask } from "@/types/incidents";

// ============================================================================
// An incident's follow-up tasks, as rows on the task board.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// Follow-ups were an array on the FIXTURE incident. The incidents page seeded
// its Tasks tab from that array once and kept every call logged, every
// "completed" and every dismissal in component state — gone on reload, and
// never on the task board where somebody would see it tomorrow.
//
// ── THE SHAPE ─────────────────────────────────────────────────────────────
//
// A follow-up is a `facility_tasks` row with `source = 'manual'` and
// `source_ref = incident:<ref>:<step>`. The columns the board reads — title,
// due date, status, notes, who finished it — are the row's own. What only a
// follow-up has (the protocol step, the call log, attempts, the archive
// reason) rides in `metadata.followUp`, which is what that column is for.
// ============================================================================

const PREFIX = "incident:";

export function followUpSourceRef(incidentRef: string, key: string | number) {
  return `${PREFIX}${incidentRef}:${key}`;
}

function toFollowUp(row: TaskRow): FollowUpTask {
  const extra = (row.metadata?.followUp ?? {}) as Partial<FollowUpTask>;
  const ref = row.sourceRef?.split(":")[1] ?? "";
  return {
    ...extra,
    id: row.id,
    incidentId: ref,
    title: extra.title ?? row.title,
    description: extra.description ?? row.description ?? "",
    assignedTo: row.assignedToName ?? extra.assignedTo ?? "",
    dueDate: row.dueAt ?? extra.dueDate ?? row.createdAt,
    status: row.status === "cancelled" ? "skipped" : row.status,
    completedDate: row.completedAt ?? undefined,
    completedBy: row.completedByName ?? extra.completedBy,
    notes: row.notes ?? extra.notes,
  };
}

/** Every follow-up at the facility, or one incident's when a ref is given. */
export function useIncidentFollowUps(incidentRef?: string) {
  const { data, isPending } = useQuery(
    taskQueries.all({
      source: "manual",
      sourceRefPrefix: incidentRef ? `${PREFIX}${incidentRef}:` : PREFIX,
      status: "all",
    }),
  );
  const create = useCreateTask();
  const update = useUpdateTask();

  const followUps = useMemo(() => (data?.tasks ?? []).map(toFollowUp), [data]);

  /** Save a follow-up the card changed — its status and its own state. */
  const save = async (task: FollowUpTask) => {
    const before = followUps.find((f) => f.id === task.id);
    await update.mutateAsync({
      id: task.id,
      ...(before?.status !== task.status
        ? {
            status: task.status === "skipped" ? "cancelled" : task.status,
          }
        : {}),
      notes: task.notes ?? null,
      metadata: {
        incidentRef: Number(task.incidentId) || null,
        followUp: task,
      },
    });
  };

  /** Put a follow-up on the board for an incident. */
  const add = async (
    incident: { id: string; severity?: string },
    task: Omit<FollowUpTask, "id" | "incidentId" | "status">,
    key: string | number,
  ) =>
    create.mutateAsync({
      title: task.title,
      description: task.description || null,
      category: "follow_up",
      priority:
        incident.severity === "critical"
          ? "urgent"
          : incident.severity === "high"
            ? "high"
            : "medium",
      dueAt: task.dueDate,
      source: "manual",
      sourceRef: followUpSourceRef(incident.id, key),
      metadata: {
        incidentRef: Number(incident.id) || null,
        followUp: { ...task, incidentId: incident.id, status: "pending" },
      },
    });

  return {
    followUps,
    pending: isPending,
    saving: create.isPending || update.isPending,
    save,
    add,
  };
}
