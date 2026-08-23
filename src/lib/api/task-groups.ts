"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ShiftKey,
  TaskDefinitionRow,
  TaskGroupRow,
  TaskGroupScope,
} from "@/lib/api/mappers/task-group";
import type {
  CreateDefinitionResult,
  DefinitionsPayload,
} from "@/app/api/task-definitions/route";
import type { UpdateDefinitionResult } from "@/app/api/task-definitions/[id]/route";
import type {
  CreateGroupResult,
  GroupsPayload,
} from "@/app/api/task-groups/route";
import type { UpdateGroupResult } from "@/app/api/task-groups/[id]/route";
import type { GenerateTasksResult } from "@/app/api/task-groups/[id]/generate/route";

// ============================================================================
// The chore library and its groups, from the browser.
//
// ── THERE IS NO `useDeleteDefinition` ─────────────────────────────────────
//
// A chore a group names is `on delete restrict`, so a delete mutation would
// work for the chores nobody uses and fail for exactly the ones people care
// about — a control that works until it matters. `useRetireDefinition` is the
// operation, and `usedByGroups` on each row is how the screen knows to offer it
// before anybody clicks.
//
// ── GENERATING INVALIDATES THE TASK BOARD, NOT JUST THE GROUPS ────────────
//
// It writes `facility_tasks`, so the standalone board is stale afterwards. That
// is the kind of cross-key invalidation that is invisible until somebody
// generates a morning list and wonders why the board still says nothing is due.
// ============================================================================

export type { TaskDefinitionRow, TaskGroupRow, TaskGroupScope, ShiftKey };

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

export const chorelistQueries = {
  /** The chore library. Retired chores are hidden unless asked for. */
  definitions: (opts?: { includeRetired?: boolean }) => ({
    queryKey: [
      "chore-list",
      "definitions",
      opts?.includeRetired ?? false,
    ] as const,
    queryFn: async () =>
      (
        await get<DefinitionsPayload>(
          `/api/task-definitions${opts?.includeRetired ? "?includeRetired=1" : ""}`,
        )
      ).definitions,
  }),

  groups: (scope?: TaskGroupScope) => ({
    queryKey: ["chore-list", "groups", scope ?? "all"] as const,
    queryFn: async () =>
      (
        await get<GroupsPayload>(
          `/api/task-groups${scope ? `?scope=${scope}` : ""}`,
        )
      ).groups,
  }),

  group: (id: string | undefined) => ({
    queryKey: ["chore-list", "group", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await get<{ group: TaskGroupRow }>(
          `/api/task-groups/${encodeURIComponent(id ?? "")}`,
        )
      ).group,
  }),
};

function invalidateChoreList(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["chore-list"] });
}

export interface NewDefinition {
  title: string;
  description?: string | null;
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  estimatedMinutes?: number | null;
  requiresPhoto?: boolean;
  requiresSignoff?: boolean;
}

export function useCreateDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewDefinition) =>
      (await send<CreateDefinitionResult>("/api/task-definitions", input))
        .definition,
    onSuccess: () => invalidateChoreList(queryClient),
  });
}

/** Edit a chore, or retire it with `isActive: false`. */
export function useUpdateDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<NewDefinition> & { id: string; isActive?: boolean }) =>
      (
        await send<UpdateDefinitionResult>(
          `/api/task-definitions/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).definition,
    onSuccess: () => invalidateChoreList(queryClient),
  });
}

export interface NewGroup {
  name: string;
  description?: string | null;
  scope: TaskGroupScope;
  shiftKey?: ShiftKey | null;
  departmentId?: string | null;
  /** 0=Sunday … 6=Saturday. EMPTY MEANS EVERY DAY. */
  daysOfWeek?: number[];
  isRecurring?: boolean;
  specificDate?: string | null;
  definitionIds?: string[];
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewGroup) =>
      (await send<CreateGroupResult>("/api/task-groups", input)).group,
    onSuccess: () => invalidateChoreList(queryClient),
  });
}

/**
 * Rename a group, change its rhythm, retire it, or replace its chores.
 *
 * `definitionIds` is the WHOLE list when present. There is no add-one or
 * remove-one: a group's contents are re-ordered as often as they are added to,
 * and three endpoints over a join table is three ways for two people editing at
 * once to disagree.
 *
 * `scope`, `shiftKey` and `departmentId` cannot be changed. What a group is FOR
 * is not an edit — it is a different group, and changing it in place would
 * silently re-point every future generation.
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      description?: string | null;
      daysOfWeek?: number[];
      isActive?: boolean;
      definitionIds?: string[];
    }) =>
      (
        await send<UpdateGroupResult>(
          `/api/task-groups/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).group,
    onSuccess: () => invalidateChoreList(queryClient),
  });
}

/**
 * Create the day's tasks from a group.
 *
 * Safe to call twice: the dedup index refuses a second task for the same
 * group, date and chore, and `created` comes back empty rather than erroring.
 */
export function useGenerateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      forDate?: string;
      assignTo?: string | null;
    }) =>
      await send<GenerateTasksResult>(
        `/api/task-groups/${encodeURIComponent(id)}/generate`,
        input,
      ),
    onSuccess: (_result, _vars, _ctx) => {
      // BOTH keys. This writes `facility_tasks`, so the standalone board is
      // stale too — and that is the half somebody is about to go and look at.
      void queryClient.invalidateQueries({ queryKey: ["facility-tasks"] });
      return invalidateChoreList(queryClient);
    },
  });
}
