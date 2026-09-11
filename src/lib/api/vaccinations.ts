"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { NO_ITEMS } from "@/lib/no-items";
import type {
  Vaccination,
  VaccinationPatch,
  VaccinationWrite,
} from "@/lib/api/mappers/vaccination";

// ============================================================================
// Vaccination records, from `public.pet_vaccinations`.
//
// No fixture fallback, for the reason notes give: the records in
// src/data/pet-data.ts were never anybody's, and matching them to a real pet
// by its numeric ref is how a real pet wore another's rabies certificate.
//
// Three scopes share one key root, so any write refreshes all three — the
// client file, the pet profile and the list filters can all be open at once.
// ============================================================================

type Scope =
  | { kind: "facility" }
  | { kind: "client"; ref: number }
  | { kind: "pet"; ref: number };

function urlFor(scope: Scope): string {
  if (scope.kind === "client")
    return `/api/vaccinations?clientRef=${scope.ref}`;
  if (scope.kind === "pet") return `/api/vaccinations?petRef=${scope.ref}`;
  return "/api/vaccinations";
}

export const vaccinationQueries = {
  scoped: (scope: Scope) => ({
    queryKey: [
      "vaccinations",
      scope.kind,
      scope.kind === "facility" ? null : scope.ref,
    ] as const,
    queryFn: async (): Promise<Vaccination[]> => {
      if (scope.kind !== "facility" && !(scope.ref > 0)) return [];
      const response = await fetch(urlFor(scope));
      if (response.status === 401) return [];
      if (!response.ok) {
        throw new Error(`Failed to load vaccinations (${response.status})`);
      }
      return (await response.json()) as Vaccination[];
    },
  }),
};

function useScoped(scope: Scope, enabled = true) {
  const { data, isPending, isError } = useQuery({
    ...vaccinationQueries.scoped(scope),
    enabled,
  });
  return {
    // `?? NO_ITEMS`, never `= []`: screens set state from this in effects.
    vaccinations: (data ?? NO_ITEMS) as Vaccination[],
    pending: enabled && isPending,
    failed: isError,
  };
}

/** Every record at the active facility — the client list's vaccine filters. */
export function useFacilityVaccinations(enabled = true) {
  return useScoped({ kind: "facility" }, enabled);
}

/** Every record for one client's pets. */
export function useClientVaccinations(clientRef: number) {
  return useScoped({ kind: "client", ref: clientRef });
}

/** Every record for one pet. */
export function usePetVaccinations(petRef: number) {
  return useScoped({ kind: "pet", ref: petRef });
}

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
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

export function useVaccinationMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["vaccinations"] });

  const add = useMutation({
    mutationFn: (write: VaccinationWrite) =>
      send<Vaccination>(
        "/api/vaccinations",
        { method: "POST", body: JSON.stringify(write) },
        "That vaccination could not be saved.",
      ),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: VaccinationPatch }) =>
      send<Vaccination>(
        `/api/vaccinations/${id}`,
        { method: "PATCH", body: JSON.stringify(patch) },
        "That vaccination could not be changed.",
      ),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      send<void>(
        `/api/vaccinations/${id}`,
        { method: "DELETE" },
        "That vaccination could not be removed.",
      ),
    onSuccess: refresh,
  });

  return { add, update, remove };
}
