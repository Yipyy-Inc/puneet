"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  DismissResult,
  LapsedPayload,
  LapsedTarget,
  RemindResult,
} from "@/types/rebook";

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
  method: "POST" | "DELETE" = "POST",
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

export const rebookQueries = {
  lapsed: () => ({
    queryKey: ["rebook", "lapsed"] as const,
    queryFn: async () => get<LapsedPayload>("/api/rebook/lapsed"),
  }),
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["rebook"] });
}

/**
 * Queue rebook reminders for one or more client+service pairings.
 *
 * Invalidate-first, and here it is the only honest choice: the server decides
 * per target whether the message could be written at all — reminders switched
 * off for that service, no address on file, a template reaching for a variable
 * this reminder has no value for. An optimistic "sent!" would be wrong for any
 * of them, and the reasons are what staff need to see.
 */
export function useRemindLapsed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targets: LapsedTarget[]) =>
      send<RemindResult>("/api/rebook/lapsed/remind", { targets }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDismissLapsed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LapsedTarget & { reason?: string }) =>
      send<DismissResult>("/api/rebook/lapsed/dismiss", input),
    onSuccess: () => invalidate(queryClient),
  });
}

/** Put somebody back on the list — the undo for a dismissal. */
export function useRestoreLapsed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, service }: LapsedTarget) =>
      send<DismissResult>(
        `/api/rebook/lapsed/dismiss?clientId=${encodeURIComponent(clientId)}&service=${encodeURIComponent(service)}`,
        undefined,
        "DELETE",
      ),
    onSuccess: () => invalidate(queryClient),
  });
}
