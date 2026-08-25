import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { liveWrite } from "@/lib/api/live-fetch";
import type { FacilityLocation } from "@/types/location";
import type {
  LocationPatchInput,
  NewLocationInput,
} from "@/lib/api/mappers/location";

// ============================================================================
// The facility's branches, from Postgres.
//
// No fixture fallback, deliberately. `src/data/locations.ts` describes three
// Montreal branches belonging to a facility that does not exist in this
// database, so falling back to it would show a real business somebody else's
// addresses and phone numbers — worse than an empty list, because an empty list
// is obviously empty.
//
// Every facility has at least one location (the migration guarantees exactly
// one primary), so an empty array here means the read was refused or the
// facility has none — both of which the screen should say plainly.
// ============================================================================

const KEY = ["locations"] as const;

async function fetchLocations(): Promise<FacilityLocation[]> {
  const response = await fetch("/api/locations");
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);
    throw new Error(
      detail ?? `Could not load the locations (${response.status})`,
    );
  }
  return (await response.json()) as FacilityLocation[];
}

export const locationQueries = {
  all: () => ({ queryKey: KEY, queryFn: fetchLocations }),
};

export function useFacilityLocations(): UseQueryResult<FacilityLocation[]> {
  return useQuery(locationQueries.all());
}

export function useCreateLocation(): UseMutationResult<
  FacilityLocation,
  Error,
  NewLocationInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewLocationInput) =>
      liveWrite<FacilityLocation>("/api/locations", "POST", input),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateLocation(): UseMutationResult<
  FacilityLocation,
  Error,
  { id: string; patch: LocationPatchInput }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) =>
      liveWrite<FacilityLocation>(`/api/locations/${id}`, "PATCH", patch),
    // Promoting a branch to primary demotes the incumbent in the DATABASE, so
    // the response for one row is not enough to reconcile the list — refetch
    // rather than patch the cache, or two rows show as primary until reload.
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Remove a branch.
 *
 * Not `liveWrite`: a 204 has no body to parse. And the 409 the database raises
 * — a branch with bookings, or the primary while others exist — carries a
 * message written for the person who clicked, so it is surfaced rather than
 * flattened into "delete failed".
 */
export function useDeleteLocation(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/locations/${id}`, {
        method: "DELETE",
      });
      if (response.status === 204) return;
      const detail = await response
        .json()
        .then((body: { error?: string }) => body.error)
        .catch(() => null);
      throw new Error(detail ?? `Could not remove it (${response.status})`);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
