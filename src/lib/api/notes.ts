"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Note, NoteCategory } from "@/types/tags";
import type { NotePatch, NoteWrite } from "@/lib/api/mappers/note";

// ============================================================================
// The notes on one pet, client, booking or incident, from Postgres.
//
// No fixture fallback on a 401, for the reason the tag catalogue gives: the
// notes in src/data/tags-notes.ts were never anybody's, and matching them to a
// real pet by its numeric ref is exactly how a pet showed another's notes.
// ============================================================================

const noteKey = (category: NoteCategory, ref: number) =>
  ["notes", category, ref] as const;

export const noteQueries = {
  forEntity: (category: NoteCategory, ref: number) => ({
    queryKey: noteKey(category, ref),
    queryFn: async (): Promise<Note[]> => {
      // Staff have no ref, so a staff note has no seam to travel yet.
      if (category === "internal_staff" || !(ref > 0)) return [];
      const response = await fetch(
        `/api/notes?category=${category}&ref=${ref}`,
      );
      if (response.status === 401) return [];
      if (!response.ok) {
        throw new Error(`Failed to load notes (${response.status})`);
      }
      return (await response.json()) as Note[];
    },
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
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

export function useEntityNotes(category: NoteCategory, ref: number) {
  const { data, isPending, isError } = useQuery(
    noteQueries.forEntity(category, ref),
  );
  return { notes: data ?? [], pending: isPending, failed: isError };
}

/** Every mutation below invalidates the one entity's list it changed. */
export function useNoteMutations(category: NoteCategory, ref: number) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: noteKey(category, ref) });

  const create = useMutation({
    mutationFn: (write: Omit<NoteWrite, "category" | "entityRef">) =>
      send<Note>(
        "/api/notes",
        {
          method: "POST",
          body: JSON.stringify({ ...write, category, entityRef: ref }),
        },
        "That note could not be saved.",
      ),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: NotePatch }) =>
      send<{ id: string }>(
        `/api/notes/${id}`,
        { method: "PATCH", body: JSON.stringify(patch) },
        "That note could not be changed.",
      ),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      send<void>(
        `/api/notes/${id}`,
        { method: "DELETE" },
        "That note could not be deleted.",
      ),
    onSuccess: refresh,
  });

  return { create, update, remove };
}
