"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ClientRebookPreferences } from "@/types/rebook";

// ============================================================================
// One client's rebook settings.
//
// Separate from `@/lib/api/rebook`, which is the FACILITY's side — the lapsed
// list, the queue, the history. These are keyed by client and read on the
// client file, and mixing them would mean one invalidation key for two screens
// that change for entirely different reasons.
// ============================================================================

function url(ref: number | string) {
  return `/api/clients/${encodeURIComponent(String(ref))}/rebook-preferences`;
}

export const clientRebookQueries = {
  detail: (ref: number | string | undefined) => ({
    queryKey: ["clients", ref, "rebook-preferences"] as const,
    enabled: ref !== undefined,
    queryFn: async (): Promise<ClientRebookPreferences> => {
      const response = await fetch(url(ref!));
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as ClientRebookPreferences;
    },
  }),
};

export interface RebookPreferenceInput {
  /** Null means the whole client — the master opt-out. */
  service: string | null;
  frequencyDays?: number | null;
  remindersEnabled?: boolean;
  reason?: string | null;
}

/**
 * Save one preference — a service's interval, or the client-wide switch.
 *
 * Invalidate-first. The saved value changes `effectiveDays` and `source` for
 * that service, and both are computed server-side against the facility's
 * current default; patching them locally would show an override as "default"
 * (or the reverse) until the next reload.
 */
export function useSaveRebookPreference(ref: number | string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RebookPreferenceInput) => {
      const response = await fetch(url(ref!), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? `Failed (${response.status})`);
      }
      return parsed;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["clients", ref, "rebook-preferences"],
      }),
  });
}

/** Re-export so the client file imports one module, not two. */
export function useClientRebookPreferences(ref: number | string | undefined) {
  return useQuery(clientRebookQueries.detail(ref));
}
