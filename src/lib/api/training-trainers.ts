"use client";

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// The people who teach here.
//
// The fixture's `trainers` array had four invented people; this facility
// employs two. Anything that assigns a trainer now names somebody who can be
// paid, rostered and messaged.
// ============================================================================

export interface TrainingTrainer {
  /** The staff legacy id ("fs-train-01"). */
  id: string;
  /** The staff row's uuid, for anything writing a foreign key. */
  staffId: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  jobTitle?: string;
  status: string;
  specializations: string[];
  certifications: string[];
  yearsExperience: number | null;
  bio: string;
  visibleOnline: boolean;
  calendarColor: string | null;
  /** False when nobody has filled in specialisations or a bio yet. */
  hasProfile: boolean;
}

export const trainingTrainerKeys = {
  all: ["training-trainers"] as const,
};

export function useTrainingTrainers() {
  return useQuery({
    queryKey: trainingTrainerKeys.all,
    queryFn: async (): Promise<TrainingTrainer[]> => {
      const response = await fetch("/api/training/trainers");
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? `Request failed (${response.status})`);
      }
      return (await response.json()) as TrainingTrainer[];
    },
  });
}

/**
 * The trainers who can actually be given a class today.
 *
 * `invited` means the person has not accepted their invitation and `inactive`
 * means they have left or been suspended; neither should be assignable, and
 * both are worth keeping in the raw list so a screen can say why somebody is
 * missing rather than silently dropping them.
 */
export function assignableTrainers(
  trainers: TrainingTrainer[] | undefined,
): TrainingTrainer[] {
  return (trainers ?? []).filter((t) => t.status === "active");
}
