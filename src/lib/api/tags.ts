"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Tag, TagAssignment, TagType } from "@/types/tags";
import type { TagPatch, TagWrite } from "@/lib/api/mappers/tag";

// ============================================================================
// The tag catalogue and its assignments, from Postgres.
//
// ── ONE QUERY, BOTH HALVES ────────────────────────────────────────────────
//
// A tag badge needs the assignment (which pet) AND the tag (what colour, what
// name), and nineteen screens render one. Two separate queries would give every
// one of them a window where the assignments have arrived and the catalogue has
// not, which renders as a pet losing its flags for a frame — on a screen whose
// whole job is to say "this dog bites".
//
// So the route answers both and this is one cache entry. It is small: a
// facility's tag library is tens of rows, not thousands.
//
// ── THERE IS NO FIXTURE FALLBACK, ON PURPOSE ──────────────────────────────
//
// `liveFetch` falls back to mock data on a 401. Not here: the 76 tags in
// src/data/tags-notes.ts were never any facility's tags, and showing them to a
// signed-out caller would be showing invented flags on real animals. Empty is
// the honest answer, and every consumer has an empty state.
// ============================================================================

export interface TagCatalogue {
  tags: Tag[];
  assignments: TagAssignment[];
}

const EMPTY_CATALOGUE: TagCatalogue = { tags: [], assignments: [] };

const tagQueries = {
  catalogue: () => ({
    queryKey: ["tags"] as const,
    queryFn: async (): Promise<TagCatalogue> => {
      const response = await fetch("/api/tags");
      if (response.status === 401) return EMPTY_CATALOGUE;
      if (!response.ok) {
        throw new Error(`Failed to load tags (${response.status})`);
      }
      return (await response.json()) as TagCatalogue;
    },
  }),
};

export function useTagCatalogue() {
  const { data, isPending, isError } = useQuery(tagQueries.catalogue());
  return {
    tags: data?.tags ?? [],
    assignments: data?.assignments ?? [],
    pending: isPending,
    failed: isError,
  };
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

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (write: TagWrite) =>
      send<Tag>(
        "/api/tags",
        { method: "POST", body: JSON.stringify(write) },
        "That tag could not be created.",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TagPatch }) =>
      send<Tag>(
        `/api/tags/${id}`,
        { method: "PATCH", body: JSON.stringify(patch) },
        "That tag could not be saved.",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}

/**
 * Retire a tag. The route clears `is_active` rather than deleting the row,
 * because deleting it would cascade to every assignment — see the route header.
 */
export function useRetireTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      send<void>(
        `/api/tags/${id}`,
        { method: "DELETE" },
        "That tag could not be removed.",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useAssignTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      tagId: string;
      entityType: TagType;
      entityRef: number;
    }) =>
      send<TagAssignment>(
        "/api/tags/assignments",
        { method: "POST", body: JSON.stringify(input) },
        "That tag could not be applied.",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useUnassignTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      send<void>(
        `/api/tags/assignments/${assignmentId}`,
        { method: "DELETE" },
        "That tag could not be removed.",
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}
