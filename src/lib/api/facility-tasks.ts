"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TaskRow, TaskStatus } from "@/lib/api/mappers/facility-task";
import type { TasksPayload, CreateTaskResult } from "@/app/api/tasks/route";
import type { UpdateTaskResult } from "@/app/api/tasks/[id]/route";

// ============================================================================
// Tasks, from the browser.
//
// ── THERE IS NO `useDeleteTask`, AND THERE CANNOT BE ──────────────────────
//
// `facility_tasks` has no delete policy and `authenticated` holds no DELETE
// privilege, so a mutation for it could only ever return an error. Cancelling
// is the operation: a task somebody created and abandoned is a fact about how
// that week ran, and removing it would make the completion rate look better
// than it was.
//
// ── `useCreateTask` MAY LEGITIMATELY 409 ──────────────────────────────────
//
// The dedup index refuses a second task for the same `sourceRef`. For a call
// follow-up that is the correct outcome, not a failure — somebody else already
// made it — so a caller should treat 409 as "it exists" rather than surfacing
// it as an error.
// ============================================================================

export type { TaskRow, TaskStatus };

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function send<T>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export interface TaskFilters {
  status?: TaskStatus | "all";
  source?: string;
  assignedTo?: string;
  since?: string;
  until?: string;
}

export const taskQueries = {
  all: (filters?: TaskFilters) => ({
    queryKey: ["facility-tasks", "list", filters ?? null] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== "all")
        params.set("status", filters.status);
      if (filters?.source) params.set("source", filters.source);
      if (filters?.assignedTo) params.set("assignedTo", filters.assignedTo);
      if (filters?.since) params.set("since", filters.since);
      if (filters?.until) params.set("until", filters.until);
      const query = params.toString();
      return await get<TasksPayload>(`/api/tasks${query ? `?${query}` : ""}`);
    },
  }),

  detail: (id: string | undefined) => ({
    queryKey: ["facility-tasks", "detail", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await get<{ task: TaskRow }>(
          `/api/tasks/${encodeURIComponent(id ?? "")}`,
        )
      ).task,
  }),
};

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["facility-tasks"] });
}

export interface NewTask {
  title: string;
  description?: string | null;
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  /** A staff id. Assigning to anybody but yourself needs `ops_manage_tasks`. */
  assignedTo?: string | null;
  dueAt?: string | null;
  estimatedMinutes?: number | null;
  requiresPhoto?: boolean;
  requiresSignoff?: boolean;
  notes?: string | null;
  source?: "manual" | "call_follow_up" | "reputation_escalation" | "template";
  /** The producing feature's own id. Unique per facility and source. */
  sourceRef?: string | null;
  templateId?: string | null;
  metadata?: Record<string, unknown>;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTask) =>
      (await send<CreateTaskResult>("/api/tasks", input)).task,
    onSuccess: () => invalidateTasks(queryClient),
  });
}

/**
 * Change a task.
 *
 * `status` is all a person without `ops_manage_tasks` may move — the database
 * refuses the rest, so a screen showing them an edit form would be showing them
 * a form that cannot save.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<NewTask> & { id: string; status?: TaskStatus }) =>
      (
        await send<UpdateTaskResult>(
          `/api/tasks/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).task,
    onSuccess: () => invalidateTasks(queryClient),
  });
}
