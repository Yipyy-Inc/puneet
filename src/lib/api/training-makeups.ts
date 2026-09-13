"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  MakeupAction,
  MakeupHostSession,
  TrainingMissedSession,
} from "@/lib/api/mappers/training-makeups";

// ============================================================================
// Training make-ups (/api/training/makeups).
//
// The reads are the missed sessions with their make-ups, and the seats one
// could take. Every write waits for the server and then refetches every
// training query: an offered seat is a booking, so the calendar and the
// session roster change with it.
// ============================================================================

const BASE = "/api/training/makeups";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const parsed = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(parsed?.error ?? fallback);
  }
  return (await response.json()) as T;
}

export const trainingMakeupQueries = {
  all: () => ({
    queryKey: ["training", "makeups"] as const,
    queryFn: async (): Promise<TrainingMissedSession[]> => {
      const response = await fetch(BASE);
      // Signed out there is nothing to make up.
      if (response.status === 401) return [];
      return readJson(
        response,
        `Could not load the missed sessions (${response.status})`,
      );
    },
  }),
  seats: (bookingId: string | null) => ({
    queryKey: ["training", "makeups", bookingId, "seats"] as const,
    queryFn: async (): Promise<MakeupHostSession[]> =>
      readJson(
        await fetch(`${BASE}/${encodeURIComponent(bookingId ?? "")}`),
        "Could not load the sessions with room",
      ),
    enabled: Boolean(bookingId),
  }),
};

export function useMakeupAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingId: string } & MakeupAction) => {
      const { bookingId, ...body } = input;
      return readJson<{ id: string; status: string }>(
        await fetch(`${BASE}/${encodeURIComponent(bookingId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        "Could not save the make-up.",
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training"] }),
  });
}
