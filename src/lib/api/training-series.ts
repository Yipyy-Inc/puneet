"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { liveWrite } from "@/lib/api/live-fetch";
import type {
  CreateTrainingSeriesInput,
  RealTrainingSeries,
  RealTrainingSeriesEnrollment,
  RealTrainingSeriesSession,
} from "@/types/training-series";

// ============================================================================
// Real training classes and enrollments (20260826110000). Distinct from
// `trainingQueries` in src/lib/api/training.ts, which still serves the mock
// TrainingSeries/TrainingEnrollment fixture used by the calendar, curriculum,
// homework and report-card screens -- this is the other, real universe.
// ============================================================================

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);
    throw new Error(detail ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export const realTrainingSeriesKeys = {
  all: ["training-series"] as const,
  detail: (id: string) => ["training-series", id] as const,
  enrollments: (id: string) => ["training-series", id, "enrollments"] as const,
};

export function useTrainingSeriesList(): UseQueryResult<RealTrainingSeries[]> {
  return useQuery({
    queryKey: realTrainingSeriesKeys.all,
    queryFn: () => fetchJson<RealTrainingSeries[]>("/api/training/series"),
  });
}

export function useTrainingSeriesDetail(id: string): UseQueryResult<{
  series: RealTrainingSeries;
  sessions: RealTrainingSeriesSession[];
}> {
  return useQuery({
    queryKey: realTrainingSeriesKeys.detail(id),
    queryFn: () =>
      fetchJson<{
        series: RealTrainingSeries;
        sessions: RealTrainingSeriesSession[];
      }>(`/api/training/series/${id}`),
    enabled: Boolean(id),
  });
}

export function useTrainingSeriesEnrollments(
  seriesId: string,
): UseQueryResult<RealTrainingSeriesEnrollment[]> {
  return useQuery({
    queryKey: realTrainingSeriesKeys.enrollments(seriesId),
    queryFn: () =>
      fetchJson<RealTrainingSeriesEnrollment[]>(
        `/api/training/series/${seriesId}/enrollments`,
      ),
    enabled: Boolean(seriesId),
  });
}

export function useCreateTrainingSeries(): UseMutationResult<
  { id: string },
  Error,
  CreateTrainingSeriesInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrainingSeriesInput) =>
      liveWrite<{ id: string }>("/api/training/series", "POST", input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: realTrainingSeriesKeys.all }),
  });
}

/** Cancels the series (and withdraws every enrollment on it) -- never deletes. */
export function useCancelTrainingSeries(): UseMutationResult<
  void,
  Error,
  string
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/training/series/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const detail = await response
          .json()
          .then((body: { error?: string }) => body.error)
          .catch(() => null);
        throw new Error(detail ?? `Could not cancel it (${response.status})`);
      }
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: realTrainingSeriesKeys.all }),
  });
}

export interface EnrollInput {
  seriesId: string;
  clientId: number;
  petId: number;
  joinWaitlist?: boolean;
}

export interface EnrollResult {
  enrollment: {
    id: string;
    series_id: string;
    pet_id: string;
    client_id: string;
    status: "enrolled" | "waitlisted";
    enrolled_at: string;
  };
  bookings: {
    bookingId: string;
    bookingRef: number;
    sessionId: string;
    sessionNumber: number;
  }[];
}

export function useEnrollInTrainingSeries(): UseMutationResult<
  EnrollResult,
  Error,
  EnrollInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ seriesId, ...body }: EnrollInput) =>
      liveWrite<EnrollResult>(
        `/api/training/series/${seriesId}/enrollments`,
        "POST",
        body,
      ),
    onSuccess: (_result, { seriesId }) => {
      client.invalidateQueries({ queryKey: realTrainingSeriesKeys.all });
      client.invalidateQueries({
        queryKey: realTrainingSeriesKeys.detail(seriesId),
      });
      client.invalidateQueries({
        queryKey: realTrainingSeriesKeys.enrollments(seriesId),
      });
    },
  });
}

export function useWithdrawFromTrainingSeries(): UseMutationResult<
  void,
  Error,
  { enrollmentId: string; seriesId: string }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId }) => {
      const response = await fetch(
        `/api/training/enrollments/${enrollmentId}`,
        { method: "PATCH" },
      );
      if (!response.ok) {
        const detail = await response
          .json()
          .then((body: { error?: string }) => body.error)
          .catch(() => null);
        throw new Error(detail ?? `Could not withdraw (${response.status})`);
      }
    },
    onSuccess: (_result, { seriesId }) => {
      client.invalidateQueries({ queryKey: realTrainingSeriesKeys.all });
      client.invalidateQueries({
        queryKey: realTrainingSeriesKeys.detail(seriesId),
      });
      client.invalidateQueries({
        queryKey: realTrainingSeriesKeys.enrollments(seriesId),
      });
    },
  });
}
