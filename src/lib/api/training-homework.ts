"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TrainingHomework } from "@/lib/training-enrollment";
import type {
  TrainingHomeworkCreate,
  TrainingHomeworkPatch,
} from "@/lib/api/mappers/training-homework";

// ============================================================================
// Writing training homework (/api/training/homework).
//
// Every write waits for the server and then refetches every homework query,
// so a screen can only say something happened once the row exists. The
// screens used `fanOutHomeworkUpsert`, which edited the query cache and
// nothing else; the reads are `trainingQueries.allHomework` and
// `homeworkForEnrollments`, both under the ["training", "homework"] key.
// ============================================================================

const BASE = "/api/training/homework";

async function send<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

function useRefetchHomework() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["training", "homework"] });
}

/** Assign homework. Several pieces at once are one insert, all or none. */
export function useAssignHomework() {
  const refetch = useRefetchHomework();
  return useMutation({
    mutationFn: (items: TrainingHomeworkCreate[]) =>
      send<TrainingHomework[]>(BASE, "POST", items),
    onSuccess: () => refetch(),
  });
}

/** Edit a piece of homework, or complete / reopen it. */
export function useUpdateHomework() {
  const refetch = useRefetchHomework();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TrainingHomeworkPatch }) =>
      send<TrainingHomework>(
        `${BASE}/${encodeURIComponent(id)}`,
        "PATCH",
        patch,
      ),
    onSuccess: () => refetch(),
  });
}

export function useDeleteHomework() {
  const refetch = useRefetchHomework();
  return useMutation({
    mutationFn: (id: string) =>
      send<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: () => refetch(),
  });
}

/** Log a day of practice — the owner's "Mark as done", or staff's. One row a
 *  day, and the next due date moves by the homework's cadence. */
export function useLogHomeworkPractice() {
  const refetch = useRefetchHomework();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      send<TrainingHomework>(
        `${BASE}/${encodeURIComponent(id)}/practice`,
        "POST",
        { date },
      ),
    onSuccess: () => refetch(),
  });
}

/** The trainer's response to one day of practice; an empty one clears it. */
export function useRespondToHomeworkPractice() {
  const refetch = useRefetchHomework();
  return useMutation({
    mutationFn: ({
      id,
      date,
      response,
    }: {
      id: string;
      date: string;
      response: string;
    }) =>
      send<TrainingHomework>(
        `${BASE}/${encodeURIComponent(id)}/practice`,
        "PATCH",
        { date, response },
      ),
    onSuccess: () => refetch(),
  });
}
