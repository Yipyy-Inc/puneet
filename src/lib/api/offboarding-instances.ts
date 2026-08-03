"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { OffboardingInstance } from "@/data/staff-onboarding";

// ============================================================================
// Per-departure offboarding instances.
//
// ONE AUDIENCE, unlike onboarding. There is no token route here and there will
// not be one: the person leaving is the SUBJECT of this checklist, not its
// reader — "recover the laptop", "hold the final cheque". The database says the
// same thing (offboarding_instances has no anon policy at all), and
// supabase/tests/offboarding-rls.sql asserts it as T8.
//
// EVERY MUTATION RESOLVES WITH THE SERVER'S INSTANCE, and the cache is set from
// that rather than from the input. Completing a task is not a local toggle: the
// server stamps `completed_at`, resolves `completed_by` to a name, and the
// progress bar is computed from the result. Optimistically flipping a checkbox
// would show a completion attributed to nobody at a time nobody chose.
// ============================================================================

const BASE = "/api/staff-onboarding/offboarding-instances";

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const offboardingKeys = {
  all: ["offboarding-instances"] as const,
  detail: (staffId: string) => [...offboardingKeys.all, staffId] as const,
};

export const offboardingQueries = {
  all: () => ({
    queryKey: offboardingKeys.all,
    queryFn: () => json<OffboardingInstance[]>(BASE),
  }),
  /**
   * One staff member's record. `retry: false` because the 404 here is a normal
   * state — most staff have never been offboarded — and retrying it three times
   * delays the "no offboarding record" empty state for no benefit.
   */
  detail: (staffId: string | null | undefined) => ({
    queryKey: offboardingKeys.detail(staffId ?? ""),
    queryFn: () =>
      json<OffboardingInstance>(`${BASE}/${encodeURIComponent(staffId ?? "")}`),
    enabled: Boolean(staffId),
    retry: false,
  }),
};

/**
 * One staff member's offboarding record, or undefined.
 *
 * SAME SHAPE AS THE MOCK `useOffboardingInstance` it replaces — including
 * returning undefined rather than a loading flag — so the screens swap over
 * without restructuring. The screens already treat undefined as "no record and
 * offer to start one", and that is also the right rendering while the request
 * is in flight: the alternative is a spinner on a tab that is usually empty.
 */
export function useOffboardingInstance(
  staffId: string | null | undefined,
): OffboardingInstance | undefined {
  const { data } = useQuery(offboardingQueries.detail(staffId));
  return data;
}

export function useOffboardingInstances(): OffboardingInstance[] {
  const { data } = useQuery(offboardingQueries.all());
  return data ?? [];
}

/**
 * Start an offboarding.
 *
 * This is the write that terminates the staff member and revokes their access,
 * because the route calls `offboard_staff()` rather than inserting — all of it
 * in one transaction, or none of it. So `invalidateQueries` here deliberately
 * reaches past this feature: the staff list, the staff detail and the task
 * board are all now wrong, and a stale roster showing an active employee who
 * can no longer sign in is the confusing half-state the atomic RPC exists to
 * prevent.
 */
export function useStartOffboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      staffId: string;
      reason: string;
      templateId?: string;
      lastDay?: string;
    }) => json<OffboardingInstance>(BASE, { method: "POST", body: input }),
    onSuccess: (instance) => {
      queryClient.setQueryData(
        offboardingKeys.detail(instance.staffId),
        instance,
      );
      void queryClient.invalidateQueries({ queryKey: offboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useSetOffboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      staffId: string;
      taskKey: string;
      complete: boolean;
      note?: string;
    }) =>
      json<OffboardingInstance>(
        `${BASE}/${encodeURIComponent(input.staffId)}`,
        { method: "PATCH", body: { action: "set-task", ...input } },
      ),
    onSuccess: (instance, variables) => {
      queryClient.setQueryData(
        offboardingKeys.detail(variables.staffId),
        instance,
      );
      void queryClient.invalidateQueries({ queryKey: offboardingKeys.all });
    },
  });
}

/** Done / total, over an already-loaded instance. Pure, like onboardingProgress. */
export function offboardingProgress(instance: OffboardingInstance): {
  done: number;
  total: number;
} {
  return {
    done: instance.tasks.filter((t) => t.completedAt).length,
    total: instance.tasks.length,
  };
}
