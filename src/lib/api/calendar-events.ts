"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ManualFacilityEvent } from "@/lib/operations-calendar";

// ============================================================================
// The facility calendar's own events, from Postgres (`/api/calendar/events`).
//
// They were localStorage. No fallback on a 401: an empty calendar is the
// honest answer for somebody who is not signed in.
// ============================================================================

const KEY = ["calendar-events"] as const;

async function send<T>(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? fallback);
  }
  return (await response.json()) as T;
}

export function useCalendarEvents() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ManualFacilityEvent[]> => {
      const response = await fetch("/api/calendar/events");
      if (response.status === 401) return [];
      if (!response.ok) {
        throw new Error(`Failed to load calendar events (${response.status})`);
      }
      return (await response.json()) as ManualFacilityEvent[];
    },
  });
}

export function useCalendarEventMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: (event: ManualFacilityEvent) =>
      send<ManualFacilityEvent>(
        "/api/calendar/events",
        { method: "POST", body: JSON.stringify({ event }) },
        "That event was not saved.",
      ),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      event,
      deleted,
    }: {
      id: string;
      event?: ManualFacilityEvent;
      deleted?: boolean;
    }) =>
      send<ManualFacilityEvent>(
        `/api/calendar/events/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ event, deleted }) },
        "That event was not changed.",
      ),
    onSuccess: refresh,
  });

  return { create, update };
}
