"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TrainerNote } from "@/types/training";
import type {
  TrainingNoteCreate,
  TrainingNotePatch,
} from "@/lib/api/mappers/training-note";

// ============================================================================
// Trainers' notes, from /api/training/notes (`training_notes`).
//
// `trainingQueries.trainerNotes()` keeps its key, ["training", "notes"], so
// every screen that read the fixture reads the table through the same query;
// the writes below invalidate that key instead of writing into it.
// ============================================================================

export const TRAINING_NOTES_KEY = ["training", "notes"] as const;

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

export function useTrainingNoteMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: TRAINING_NOTES_KEY });

  const create = useMutation({
    mutationFn: (input: TrainingNoteCreate) =>
      send<TrainerNote>("/api/training/notes", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TrainingNotePatch }) =>
      send<TrainerNote>(`/api/training/notes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      send<void>(`/api/training/notes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}
