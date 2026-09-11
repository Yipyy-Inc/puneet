"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Membership,
  MembershipPlan,
  PauseDetails,
} from "@/data/services-pricing";

// ============================================================================
// Membership plans and who is on them (20260911161036).
//
// The Memberships screen, the client file's membership card and the checkout
// all read `membershipPlans` / `memberships` from `@/data/services-pricing` —
// another facility's plans and another facility's members. These are the
// facility's rows now, through /api/memberships.
//
// A plan's editor shape travels whole: the columns the database reasons about
// are split out by the route, the rest rides in `plan` and comes back as it
// went in.
// ============================================================================

export const membershipKeys = {
  all: ["memberships"] as const,
  plans: () => ["memberships", "plans"] as const,
  subscriptions: (clientRef?: number) =>
    clientRef
      ? (["memberships", "subscriptions", clientRef] as const)
      : (["memberships", "subscriptions"] as const),
};

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export function useMembershipPlans() {
  return useQuery({
    queryKey: membershipKeys.plans(),
    queryFn: () => json<MembershipPlan[]>("/api/memberships/plans"),
  });
}

/** The facility's subscriptions, or one client's (by their ref). */
export function useMemberships(clientRef?: number) {
  return useQuery({
    queryKey: membershipKeys.subscriptions(clientRef),
    queryFn: () =>
      json<Membership[]>(
        clientRef
          ? `/api/memberships?clientRef=${clientRef}`
          : "/api/memberships",
      ),
  });
}

/** Create a plan (no id) or replace one (with its id). */
export function useSaveMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; plan: Partial<MembershipPlan> }) =>
      input.id
        ? json<MembershipPlan>(
            `/api/memberships/plans/${encodeURIComponent(input.id)}`,
            { method: "PATCH", body: input.plan },
          )
        : json<MembershipPlan>("/api/memberships/plans", {
            method: "POST",
            body: input.plan,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
    },
  });
}

export function useDeleteMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<void>(`/api/memberships/plans/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
    },
  });
}

/** Put a client on a plan, at the plan's price and cycle. */
export function useJoinMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      clientRef: number;
      planId: string;
      startsOn?: string;
    }) => json<Membership>("/api/memberships", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
    },
  });
}

export type MembershipAction =
  | { action: "pause"; pause: PauseDetails; description: string }
  | { action: "resume"; description: string }
  | { action: "cancel"; description: string; reason?: string }
  | { action: "autoRenew"; autoRenew: boolean; description: string };

/**
 * The activity-log line for a pause, in the staff member's language. The
 * sheet and the client file both pause a membership; one wording for both.
 */
export function describePause(
  details: PauseDetails,
  fill: (key: string, values: Record<string, string | number>) => string,
  t: (key: string) => string,
): string {
  if (details.mode === "cycles") {
    return fill("pausedCycles", { count: details.cycles ?? 1 });
  }
  if (details.mode === "date" && details.resumeDate) {
    return fill("pausedUntil", { date: details.resumeDate });
  }
  return t("pausedManual");
}

/** Pause, resume, cancel, or turn auto-renew on or off. */
export function useMembershipAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & MembershipAction) => {
      const { id, ...body } = input;
      return json<Membership>(`/api/memberships/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: membershipKeys.all });
    },
  });
}
