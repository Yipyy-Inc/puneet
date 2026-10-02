"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  EvaluationsBoard,
  PetEvaluationRow,
} from "@/lib/evaluations/board-types";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import type { EvaluationResult, NoteTone } from "@/lib/evaluations/questions";

// ============================================================================
// Operations › Evaluations through the API (the client's mock, 2026-10-02):
// the page's board, and the evaluator's calls. Every write invalidates the
// board, so Today, the review queue and All evaluations move together.
// ============================================================================

export const evaluationKeys = {
  all: ["evaluations"] as const,
  board: () => [...evaluationKeys.all, "board"] as const,
  detail: (id: string) => [...evaluationKeys.all, "detail", id] as const,
};

/** A refusal from /api/evaluations, with the database's reason when it gave one. */
export class EvaluationRequestError extends Error {
  readonly reason: string | null;
  readonly status: number;
  constructor(message: string, status: number, reason: string | null) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

export async function evaluationRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...init.headers }
        : init?.headers,
  });
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string; reason?: string | null })
    | null;
  if (!response.ok) {
    throw new EvaluationRequestError(
      body?.error ?? "That did not work.",
      response.status,
      body?.reason ?? null,
    );
  }
  return body as T;
}

export const evaluationQueries = {
  board: () => ({
    queryKey: evaluationKeys.board(),
    queryFn: () => evaluationRequest<EvaluationsBoard>("/api/evaluations"),
  }),
};

export function useEvaluationsBoard() {
  return useQuery({
    ...evaluationQueries.board(),
    // A colleague finishes a card while this page is open; the queue should
    // show it without a reload.
    refetchInterval: 60_000,
  });
}

/** Start an evaluation, or open the one already started for that pet. */
export function useStartEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: { petId: string; bookingId?: string | null } | { petRef: number },
    ) =>
      evaluationRequest<{ id: string }>("/api/evaluations", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: evaluationKeys.board() }),
  });
}

// ── One evaluation ──────────────────────────────────────────────────────────

export function useEvaluationDetail(id: string | null) {
  return useQuery({
    queryKey: evaluationKeys.detail(id ?? ""),
    queryFn: () =>
      evaluationRequest<EvaluationDetail>(`/api/evaluations/${id}`),
    enabled: Boolean(id),
  });
}

/** What the evaluator's dialog autosaves; the database keeps the rules. */
export interface EvaluationPatch {
  answers?: Record<string, string>;
  strengths?: string[];
  watchFor?: string[];
  ownerNote?: string;
  internalNote?: string;
  approvedServices?: string[];
}

export function saveEvaluation(id: string, patch: EvaluationPatch) {
  return evaluationRequest<{ ok: true }>(`/api/evaluations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export interface CardSendResult {
  outcome: "sent" | "in_review";
  deliveries: Array<{
    channel: "email" | "sms";
    sent: boolean;
    reason?: string;
  }>;
}

function useEvaluationAction<TInput, TResult>(
  call: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all }),
  });
}

export function useFinishEvaluation() {
  return useEvaluationAction((id: string) =>
    evaluationRequest<CardSendResult>(`/api/evaluations/${id}/finish`, {
      method: "POST",
    }),
  );
}

export function useSendEvaluationCard() {
  return useEvaluationAction(
    (input: { id: string; ownerNote?: string; channels: string[] }) =>
      evaluationRequest<CardSendResult>(`/api/evaluations/${input.id}/send`, {
        method: "POST",
        body: JSON.stringify({
          ownerNote: input.ownerNote,
          channels: input.channels,
        }),
      }),
  );
}

export function useReturnEvaluationCard() {
  return useEvaluationAction((input: { id: string; comment: string }) =>
    evaluationRequest<{ ok: true }>(`/api/evaluations/${input.id}/return`, {
      method: "POST",
      body: JSON.stringify({ comment: input.comment }),
    }),
  );
}

export function useDiscardEvaluation() {
  return useEvaluationAction((id: string) =>
    evaluationRequest<{ ok: true }>(`/api/evaluations/${id}`, {
      method: "DELETE",
    }),
  );
}

export function useEvaluationPhoto(id: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: evaluationKeys.detail(id) });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return evaluationRequest<{ path: string; url: string | null }>(
        `/api/evaluations/${id}/photo`,
        { method: "POST", body: form },
      );
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () =>
      evaluationRequest<{ ok: true }>(`/api/evaluations/${id}/photo`, {
        method: "DELETE",
      }),
    onSuccess: refresh,
  });
  return { upload, remove };
}

export interface NoteRequest {
  evaluationId: string;
  tone: NoteTone;
  points: string;
  answers: Record<string, string>;
  strengths: string[];
  watchFor: string[];
  result: EvaluationResult | null;
}

/** "Write with AI": the note, and whether AI wrote it. */
export function useWriteEvaluationNote() {
  return useMutation({
    mutationFn: (input: NoteRequest) =>
      evaluationRequest<{ note: string; fallback: boolean }>(
        "/api/ai/evaluation-summary",
        { method: "POST", body: JSON.stringify(input) },
      ),
  });
}

/** One pet's evaluations, for its profile's Evaluations tab. */
export function usePetEvaluations(petRef: number) {
  return useQuery({
    queryKey: [...evaluationKeys.all, "pet", petRef] as const,
    queryFn: () =>
      evaluationRequest<PetEvaluationRow[]>(`/api/evaluations/pet/${petRef}`),
    enabled: Number.isInteger(petRef) && petRef > 0,
  });
}
