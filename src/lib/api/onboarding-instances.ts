"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StoredOnboardingInstance } from "@/lib/api/mappers/instance";
import type { EmployeeOnboardingTaskType } from "@/data/staff-onboarding";

// ============================================================================
// Per-hire onboarding instances.
//
// TWO AUDIENCES, TWO BASE PATHS, AND THEY DO NOT SHARE A CLIENT:
//
//   /api/staff-onboarding/instances   the manager. Session-authenticated.
//   /api/onboard/[token]              the hire. Token-bearing, no session.
//
// Kept apart on purpose. A single "onboarding client" that took an optional
// token would eventually be called with one by a signed-in screen, or without
// one by the public page, and the failure would be silent in both directions.
//
// THE TOKEN IS RETURNED ONCE. `useCreateInstance` and `useResendInvite` resolve
// with `{ token }`; nothing reads it back later, because the database stores
// only a hash. A caller that drops it has to resend, which is the correct
// property for a bearer credential and not an inconvenience to design around.
// ============================================================================

const MANAGER_BASE = "/api/staff-onboarding/instances";

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

export const instanceKeys = {
  all: ["onboarding-instances"] as const,
  detail: (staffId: string) => [...instanceKeys.all, staffId] as const,
  byToken: (token: string) => ["onboarding-by-token", token] as const,
};

export const instanceQueries = {
  all: () => ({
    queryKey: instanceKeys.all,
    queryFn: () => json<StoredOnboardingInstance[]>(MANAGER_BASE),
  }),
  detail: (staffId: string) => ({
    queryKey: instanceKeys.detail(staffId),
    queryFn: () => json<StoredOnboardingInstance>(`${MANAGER_BASE}/${staffId}`),
  }),
  /**
   * The hire's own view. `retry: false` because every refusal — expired, spent,
   * activated, never existed — comes back as one 404, and retrying a token the
   * server has already declined is just knocking harder.
   */
  byToken: (token: string) => ({
    queryKey: instanceKeys.byToken(token),
    queryFn: () => json<TokenView>(`/api/onboard/${token}`),
    retry: false,
  }),
};

/** What the token RPC hands back — deliberately not an OnboardingInstance: it
 *  carries the hire's name for the greeting and omits everything a manager sees. */
export interface TokenView {
  instanceId: string;
  staffId: string;
  staffFirstName: string;
  staffLastName: string;
  templateId: string | null;
  welcomeMessage: string | null;
  tokenExpiresAt: string;
  invitedAt: string;
  accountPasswordSetAt: string | null;
  /**
   * The form to fill in, carried in the SAME payload as the instance.
   *
   * Not fetched separately, because it cannot be: onboarding_employee_tasks is
   * `to authenticated` and this caller has no session. Widening that policy to
   * anon would recreate the queryable surface the token design exists to avoid,
   * so the tasks ride along inside the RPC — see 20260804140000.
   */
  tasks: {
    id: string;
    type: EmployeeOnboardingTaskType;
    name: string;
    description: string | null;
    required: boolean;
    documentName: string | null;
    documentRef: string | null;
    fields: { key: string; label: string; kind: string; required?: boolean }[];
    question?: { format: string; prompt: string; options?: string[] };
  }[];
  sections: {
    taskId: string;
    type: EmployeeOnboardingTaskType;
    status: string;
    data: Record<string, unknown>;
    completedAt: string | null;
  }[];
  changeRequests: {
    taskId: string | null;
    sectionType: EmployeeOnboardingTaskType;
    note: string;
    resolvedAt: string | null;
  }[];
}

// ── Manager ─────────────────────────────────────────────────────────────────

export function useCreateInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { staffId: string; templateId?: string }) =>
      json<{ instance: StoredOnboardingInstance; token: string }>(
        MANAGER_BASE,
        { method: "POST", body: input },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) =>
      json<{ token: string }>(`${MANAGER_BASE}/${staffId}`, {
        method: "PATCH",
        body: { action: "resend" },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useReviewActivate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) =>
      json<StoredOnboardingInstance>(`${MANAGER_BASE}/${staffId}`, {
        method: "PATCH",
        body: { action: "review" },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useRequestChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      staffId: string;
      taskId?: string;
      sectionType: EmployeeOnboardingTaskType;
      note: string;
    }) =>
      json<StoredOnboardingInstance>(`${MANAGER_BASE}/${input.staffId}`, {
        method: "PATCH",
        body: { action: "request-change", ...input },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

export function useResolveChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      staffId: string;
      sectionType: EmployeeOnboardingTaskType;
      taskId?: string;
    }) =>
      json<StoredOnboardingInstance>(`${MANAGER_BASE}/${input.staffId}`, {
        method: "PATCH",
        body: { action: "resolve-change", ...input },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: instanceKeys.all });
    },
  });
}

// ── The hire ────────────────────────────────────────────────────────────────

export function useSaveSection(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      taskId: string;
      sectionType: EmployeeOnboardingTaskType;
      data: Record<string, unknown>;
      status?: "in_progress" | "complete";
    }) =>
      json<TokenView>(`/api/onboard/${token}`, {
        method: "PATCH",
        body: { action: "save-section", ...input },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(instanceKeys.byToken(token), data);
    },
  });
}

export function useSubmitOnboarding(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      json<{ submitted: true }>(`/api/onboard/${token}`, {
        method: "PATCH",
        body: { action: "submit" },
      }),
    onSuccess: () => {
      // The token is spent, so the cached view is now unreachable rather than
      // merely stale. Removing it is more honest than refetching a 404.
      queryClient.removeQueries({ queryKey: instanceKeys.byToken(token) });
    },
  });
}

export function useSetAccountComplete(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      json<TokenView>(`/api/onboard/${token}`, {
        method: "PATCH",
        body: { action: "account-complete" },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(instanceKeys.byToken(token), data);
    },
  });
}

/**
 * Section progress — the account step counts as one, plus every section.
 * Ported unchanged from onboardingProgress (staff-onboarding.ts:1477); it is a
 * pure function over the instance and needs nothing from the database.
 *
 * Accepts BOTH shapes: the manager's StoredOnboardingInstance (which nests the
 * account step under `account.passwordSetAt`) and the hire's TokenView (which
 * carries `accountPasswordSetAt` flat). They are two different payloads for two
 * different audiences — see the header — and this is the one calculation both
 * need, so it reads whichever field is present rather than forcing a converter
 * at every call site.
 */
export function onboardingProgress(
  view:
    | {
        sections: { status: string }[];
        account?: { passwordSetAt: string } | undefined;
        accountPasswordSetAt?: string | null;
      }
    | undefined,
): { done: number; total: number } {
  if (!view) return { done: 0, total: 0 };
  const done = view.sections.filter((s) => s.status === "complete").length;
  const accountDone = Boolean(view.account ?? view.accountPasswordSetAt);
  return {
    done: done + (accountDone ? 1 : 0),
    total: view.sections.length + 1,
  };
}

export function useInstances() {
  return useQuery(instanceQueries.all());
}

/**
 * One staff member's onboarding record, with the MOCK'S SIGNATURE — the value
 * or undefined, no loading flag — so the staff screens swap over without
 * restructuring. They already read `undefined` as "not invited yet", which is
 * also the correct rendering while the request is in flight.
 *
 * Served from the LIST rather than a per-staff fetch. Every screen that calls
 * this (the roster card, the resend dialog, the review dialog, the documents
 * tab) is mounted inside a page that is already showing the roster, so the list
 * is in cache; a detail query per card would be one request per staff member
 * for data already on the client.
 */
export function useOnboardingInstance(
  staffId: string | null | undefined,
): StoredOnboardingInstance | undefined {
  const { data } = useQuery({
    ...instanceQueries.all(),
    enabled: Boolean(staffId),
  });
  return data?.find((i) => i.staffId === staffId);
}

/** Ported unchanged from staff-onboarding.ts:1804. Pure over the instance. */
export function isOnboardingStarted(inst: {
  account?: { passwordSetAt: string } | undefined;
  sections: { status: string }[];
}): boolean {
  return (
    Boolean(inst.account) ||
    inst.sections.some((s) => s.status !== "not_started")
  );
}

/**
 * Whole days elapsed since the invite was sent (0 if unknown). Ported unchanged
 * from staff-onboarding.ts:1812.
 */
export function daysSinceInvite(
  inst: { invitedAt?: string },
  today = new Date(),
): number {
  if (!inst.invitedAt) return 0;
  const ms = today.getTime() - new Date(inst.invitedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
