"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Incident } from "@/types/incidents";
import type { IncidentPatch, IncidentWrite } from "@/lib/api/mappers/incident";

// ============================================================================
// Incidents, from Postgres (`/api/incidents`).
//
// This returned the `@/data/incidents` fixture — fourteen invented incidents,
// the same at every facility — and nothing a person reported survived a
// reload. No fixture fallback on a 401: an invented bite on a real dog is not
// an acceptable placeholder.
// ============================================================================

async function fetchIncidents(): Promise<Incident[]> {
  const response = await fetch("/api/incidents");
  if (response.status === 401) return [];
  if (!response.ok) {
    throw new Error(`Failed to load incidents (${response.status})`);
  }
  return (await response.json()) as Incident[];
}

export const incidentQueries = {
  all: () => ({
    queryKey: ["incidents"] as const,
    queryFn: fetchIncidents,
  }),

  byId: (id: string) => ({
    queryKey: ["incidents", id] as const,
    queryFn: async (): Promise<Incident | undefined> =>
      (await fetchIncidents()).find((i) => i.id === id),
  }),
};

async function send<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? fallbackMessage);
  }
  return (await response.json()) as T;
}

export function useReportIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (write: IncidentWrite) =>
      send<Incident>(
        "/api/incidents",
        { method: "POST", body: JSON.stringify(write) },
        "The incident could not be saved.",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: IncidentPatch }) =>
      send<Incident>(
        `/api/incidents/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify(patch) },
        "The incident could not be changed.",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}
