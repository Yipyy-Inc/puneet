"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PetGroomingPreferences } from "@/app/api/pets/[ref]/grooming-preferences/route";

// ============================================================================
// A pet's grooming preferences (`pet_grooming_preferences`, 2026-10-03) —
// read and saved by the booking page's "Groom preferences" card, and read by
// its header for the behaviour chip.
// ============================================================================

export type { PetGroomingPreferences };

export const petGroomingPreferencesKey = (petRef: number) =>
  ["pets", petRef, "grooming-preferences"] as const;

export function usePetGroomingPreferences(petRef: number) {
  return useQuery({
    queryKey: petGroomingPreferencesKey(petRef),
    enabled: petRef > 0,
    queryFn: async (): Promise<PetGroomingPreferences> => {
      const response = await fetch(`/api/pets/${petRef}/grooming-preferences`);
      const parsed = (await response.json().catch(() => null)) as
        | (PetGroomingPreferences & { error?: string })
        | null;
      if (!response.ok || !parsed) {
        throw new Error(parsed?.error ?? "Could not read the preferences.");
      }
      return parsed;
    },
  });
}

export function useSavePetGroomingPreferences(petRef: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<
        Pick<
          PetGroomingPreferences,
          "cut" | "face" | "ears" | "shampoo" | "behavior"
        >
      >,
    ): Promise<PetGroomingPreferences> => {
      const response = await fetch(`/api/pets/${petRef}/grooming-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as
        | (PetGroomingPreferences & { error?: string })
        | null;
      if (!response.ok || !parsed) {
        throw new Error(parsed?.error ?? "The preferences were not saved.");
      }
      return parsed;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(petGroomingPreferencesKey(petRef), saved);
    },
  });
}
