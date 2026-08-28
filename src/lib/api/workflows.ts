"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { EstimateResult } from "@/app/api/audience/estimate/route";
import type {
  CreateWorkflowResult,
  WorkflowsPayload,
} from "@/app/api/workflows/route";
import type { WorkflowResult } from "@/app/api/workflows/[id]/route";
import type { Audience, WorkflowStep } from "@/types/workflows";

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
  method: "POST" | "PATCH" | "DELETE" = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const workflowQueries = {
  all: () => ({
    queryKey: ["workflows"] as const,
    queryFn: async () =>
      (await get<WorkflowsPayload>("/api/workflows")).workflows,
  }),
  detail: (id: string | undefined) => ({
    queryKey: ["workflows", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await get<WorkflowResult>(
          `/api/workflows/${encodeURIComponent(id ?? "")}`,
        )
      ).workflow,
  }),
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["workflows"] });
}

export interface NewWorkflow {
  name: string;
  description?: string | null;
  kind: "event" | "audience";
  trigger?: string | null;
  audience?: Audience | null;
  locationIds?: string[];
  frequency?: string | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  sendAtLocal?: string | null;
  minDaysBetweenSends?: number;
  stopOn?: string[];
  steps: Omit<WorkflowStep, "id" | "stepIndex">[];
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewWorkflow) =>
      (await send<CreateWorkflowResult>("/api/workflows", input)).workflow,
    onSuccess: () => invalidate(queryClient),
  });
}

export type WorkflowPatch = Partial<Omit<NewWorkflow, "kind" | "trigger">> & {
  status?: "draft" | "active" | "paused";
};

/**
 * Edit a workflow, or switch it on and off.
 *
 * Invalidate-first rather than optimistic, and here that is the only correct
 * choice: activation can be REFUSED by the server — nothing emits that action,
 * the channel has no credentials, the workflow has no steps. An optimistic flip
 * would show it live and then snap back, which reads as a flaky toggle instead
 * of the refusal it is. The screen shows the server's reason.
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: WorkflowPatch }) =>
      (
        await send<WorkflowResult>(
          `/api/workflows/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).workflow,
    onSuccess: () => invalidate(queryClient),
  });
}

export function useArchiveWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      send<{ archived: string }>(
        `/api/workflows/${encodeURIComponent(id)}`,
        undefined,
        "DELETE",
      ),
    onSuccess: () => invalidate(queryClient),
  });
}

/**
 * How many clients an audience names, right now.
 *
 * A mutation rather than a query because it is a POST — the filter is too big
 * for a query string and should not sit in access logs. The wizard debounces
 * before calling it.
 */
export function useAudienceEstimate() {
  return useMutation({
    mutationFn: async (audience: Audience) =>
      send<EstimateResult>("/api/audience/estimate", { audience }),
  });
}
