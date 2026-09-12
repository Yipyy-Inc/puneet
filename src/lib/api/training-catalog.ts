"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trainingQueries } from "@/lib/api/training";
import type { HomeworkTemplate } from "@/data/training-homework-templates";
import {
  TRAINING_CATALOG_LIST_KEY,
  type TrainingCatalogDomain,
} from "@/lib/settings/training-catalog";

// ============================================================================
// Save one training-catalogue list — disciplines, exercises, homework
// templates, pathways or course types — to its settings domain.
//
// The editors kept a list and pushed it into the query cache
// (setQueryData), so an Add / Edit / Delete lasted until reload. They hand
// the whole next list here instead; it resolves once the facility's settings
// have it, and the training queries that read it are refreshed from the
// server. It rejects with the server's reason when refused.
// ============================================================================

/** The trainingQueries key each domain's reads live under. */
const QUERY_KEY: Record<TrainingCatalogDomain, string> = {
  training_disciplines: "disciplines",
  training_exercises: "exercises",
  training_homework_templates: "homework-templates",
  training_pathways: "pathways",
  training_course_types: "course-types",
};

export function useSaveTrainingCatalog<T>(domain: TrainingCatalogDomain) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (list: T[]) => {
      const response = await fetch("/api/facility/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          value: { [TRAINING_CATALOG_LIST_KEY[domain]]: list },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["facility", "settings"] }),
        queryClient.invalidateQueries({
          queryKey: ["training", QUERY_KEY[domain]],
        }),
      ]);
    },
  });
  const { mutateAsync } = mutation;
  const save = useCallback((list: T[]) => mutateAsync(list), [mutateAsync]);
  return { save, saving: mutation.isPending };
}

/**
 * Homework templates are edited one (or two, for a reorder) at a time from
 * several screens, so these read the CURRENT list from the server, apply the
 * change, and save the whole list — not the copy a screen loaded minutes ago.
 */
export function useHomeworkTemplateWrites() {
  const { save, saving } = useSaveTrainingCatalog<HomeworkTemplate>(
    "training_homework_templates",
  );
  const queryClient = useQueryClient();
  const current = useCallback(
    () =>
      queryClient.fetchQuery({
        ...trainingQueries.allHomeworkTemplates(),
        staleTime: 0,
      }),
    [queryClient],
  );

  const upsert = useCallback(
    async (...templates: HomeworkTemplate[]) => {
      const list = await current();
      const changed = new Map(templates.map((t) => [t.id, t]));
      const next = list.map((t) => changed.get(t.id) ?? t);
      for (const t of templates) {
        if (!list.some((existing) => existing.id === t.id)) next.push(t);
      }
      await save(next);
    },
    [current, save],
  );

  const remove = useCallback(
    async (id: string) => {
      const list = await current();
      await save(list.filter((t) => t.id !== id));
    },
    [current, save],
  );

  return { upsert, remove, saving };
}
