"use client";

import { useQuery } from "@tanstack/react-query";

import { TRAINING_NOTES_KEY } from "@/lib/api/training-notes";
import { usePetGroomingPreferences } from "@/lib/api/pet-grooming-preferences";
import type { TrainerNote } from "@/types/training";

import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// What staff must not miss about THIS pet for THIS service, beside its
// allergies — the mock's "Nervous with the dryer" on a groom and "Bring soft
// treats, no chicken" on a lesson.
//
// From the record, never invented: a groom's recorded behaviour (the pet's
// groom preferences), and a trainer's notes marked as an active alert.
// ============================================================================

export function usePetFlags(
  d: BookingDetails,
): { text: string; tone: "red" | "amber" | "neutral" }[] {
  const petRef = d.pet?.id ?? 0;
  const prefs = usePetGroomingPreferences(d.kind === "grooming" ? petRef : 0);
  const notes = useQuery({
    queryKey: [...TRAINING_NOTES_KEY, "pet", petRef] as const,
    enabled: d.kind === "training" && petRef > 0,
    queryFn: async (): Promise<TrainerNote[]> => {
      const response = await fetch(`/api/training/notes?petRef=${petRef}`);
      if (!response.ok) return [];
      return (await response.json()) as TrainerNote[];
    },
  });

  if (d.kind === "grooming") {
    const behavior = prefs.data?.behavior?.trim();
    return behavior ? [{ text: behavior, tone: "amber" }] : [];
  }
  if (d.kind === "training") {
    return (notes.data ?? [])
      .filter((n) => n.isActiveAlert && !n.deactivatedAt)
      .slice(0, 2)
      .map((n) => ({ text: n.note, tone: "neutral" as const }));
  }
  return [];
}
