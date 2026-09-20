"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  FormRow,
  FormVersionRow,
  SubmissionRow,
} from "@/lib/api/mappers/form";
import type { FormsPayload } from "@/app/api/forms/route";
import type { SubmissionsPayload } from "@/app/api/forms/submissions/route";
import type { SubmitFormResult } from "@/app/api/forms/[id]/submit/route";
import type { PublicFormResponse } from "@/app/api/forms/by-slug/[slug]/route";
import type { PetFormsPayload } from "@/app/api/customer/pets/[ref]/forms/route";

export type PublicFormPayload =
  | ({ status: "ok" } & PublicFormResponse)
  | { status: "signed_out" }
  | { status: "missing" };

// ============================================================================
// Forms, from the browser — the Postgres ones.
//
// ── SEPARATE FROM `src/lib/api/forms.ts`, AND NAMED SO ────────────────────
//
// That file is the fixture layer: forty-odd factories over `src/data/forms` and
// `src/data/form-submissions`. This one reads the database. Adding real queries
// beside mock ones in the same module is how a screen ends up importing one
// believing it got the other — the single most expensive mistake available in
// this codebase, and the reason CLAUDE.md opens by warning about it.
//
// The fixture file keeps its name and its callers until each screen moves.
//
// ── THERE IS NO `updateAnswers`, AND THERE CANNOT BE ──────────────────────
//
// Answers are final once submitted — refused by trigger — so a mutation for
// them could only ever return an error. Staff review by moving the status.
//
// ── AND EDITING QUESTIONS PUBLISHES A VERSION ─────────────────────────────
//
// `useSaveFormQuestions` writes to the open draft, or opens a new version when
// everything is published. It never rewrites a published one, because the
// database refuses that — a submission names the version it was answered
// against and those questions have to stay readable.
// ============================================================================

export type { FormRow, FormVersionRow, SubmissionRow };

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function send<T>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const liveFormQueries = {
  /**
   * The facility's forms, and whether the list is all of them.
   *
   * Returns the PAYLOAD rather than the array it used to, so a screen can say
   * when the cap bit instead of showing a partial list as if it were whole.
   */
  all: () => ({
    queryKey: ["forms-live", "list"] as const,
    queryFn: async () => await get<FormsPayload>("/api/forms"),
  }),

  detail: (id: string | undefined) => ({
    queryKey: ["forms-live", "detail", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await get<{ form: FormRow }>(
          `/api/forms/${encodeURIComponent(id ?? "")}`,
        )
      ).form,
  }),

  /**
   * The facility's submissions.
   *
   * Each row carries the schema of the version it was filled against, so a
   * screen can render the questions as they were ASKED rather than as they are
   * now. `truncated` says when the page cap bit.
   */
  submissions: (filters?: {
    formId?: string;
    status?: string;
    since?: string;
    until?: string;
  }) => ({
    queryKey: ["forms-live", "submissions", filters ?? null] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.formId) params.set("formId", filters.formId);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.since) params.set("since", filters.since);
      if (filters?.until) params.set("until", filters.until);
      const query = params.toString();
      return await get<SubmissionsPayload>(
        `/api/forms/submissions${query ? `?${query}` : ""}`,
      );
    },
  }),

  submission: (id: string | undefined) => ({
    queryKey: ["forms-live", "submission", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await get<{ submission: SubmissionRow }>(
          `/api/forms/submissions/${encodeURIComponent(id ?? "")}`,
        )
      ).submission,
  }),

  /**
   * A published form by its address, with the signed-in customer's own pets.
   *
   * Signed out and not found are answers a page renders, not errors, so they
   * come back as states rather than throwing.
   */
  bySlug: (slug: string | undefined) => ({
    queryKey: ["forms-live", "by-slug", slug] as const,
    enabled: Boolean(slug),
    queryFn: async (): Promise<PublicFormPayload> => {
      const response = await fetch(
        `/api/forms/by-slug/${encodeURIComponent(slug ?? "")}`,
      );
      if (response.status === 401) return { status: "signed_out" };
      if (response.status === 404) return { status: "missing" };
      const body = (await response.json().catch(() => null)) as
        | (PublicFormResponse & { error?: string })
        | null;
      if (!response.ok || !body) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      return { status: "ok", ...body };
    },
  }),

  /** A CUSTOMER's own answers, wherever they were given. */
  mine: () => ({
    queryKey: ["forms-live", "submissions", "mine"] as const,
    queryFn: async () =>
      await get<SubmissionsPayload>("/api/forms/submissions?mine=1"),
  }),

  /**
   * One of the customer's pets: the forms the database says it still needs,
   * the facility's published forms, and its own submissions.
   */
  forPet: (petRef: number | undefined) => ({
    queryKey: ["forms-live", "pet", petRef] as const,
    enabled: Number.isInteger(petRef),
    queryFn: async () =>
      await get<PetFormsPayload>(
        `/api/customer/pets/${encodeURIComponent(String(petRef))}/forms`,
      ),
  }),
};

function invalidateForms(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["forms-live"] });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      slug?: string;
      type?: string;
      audience?: "customer" | "staff" | "both";
      schema?: Record<string, unknown>;
      requireAuth?: boolean;
      repeatPerPet?: boolean;
      // The route has always taken these two; the hook's type dropped them,
      // so the create modal built them and they never left the browser.
      settings?: Record<string, unknown>;
      appliesTo?: Record<string, unknown>;
    }) => (await send<{ form: FormRow }>("/api/forms", input)).form,
    onSuccess: () => invalidateForms(queryClient),
  });
}

/** Rename, re-slug, publish or archive. Touches no questions. */
export function useUpdateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      slug?: string;
      status?: "draft" | "published" | "archived";
      type?: string;
      audience?: "customer" | "staff" | "both";
      requireAuth?: boolean;
      repeatPerPet?: boolean;
      settings?: Record<string, unknown>;
      appliesTo?: Record<string, unknown>;
    }) =>
      (
        await send<{ form: FormRow }>(
          `/api/forms/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).form,
    onSuccess: () => invalidateForms(queryClient),
  });
}

/**
 * Save the questions.
 *
 * Goes into the open DRAFT version, or opens a new one when everything is
 * published. `publish: true` freezes what it wrote — one way, and after that
 * the only way to change the questions is another version.
 *
 * That is not a restriction this hook imposes; a published version is frozen by
 * trigger, so the alternative would be a call that returns an error.
 */
export function useSaveFormQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      schema?: Record<string, unknown>;
      publish?: boolean;
    }) =>
      (
        await send<{ form: FormRow }>(
          `/api/forms/${encodeURIComponent(input.id)}`,
          { schema: input.schema, publish: input.publish },
          "PATCH",
        )
      ).form,
    onSuccess: () => invalidateForms(queryClient),
  });
}

/**
 * File an answered form.
 *
 * The VERSION is resolved on the server from the form's newest published one —
 * not sent from here — so answers cannot be filed against questions the person
 * was not shown.
 */
export function useSubmitForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      ...input
    }: {
      formId: string;
      clientRef?: number;
      petRef?: number;
      answers: Record<string, unknown>;
      staffAssisted?: boolean;
    }) =>
      (
        await send<SubmitFormResult>(
          `/api/forms/${encodeURIComponent(formId)}/submit`,
          input,
        )
      ).submission,
    onSuccess: () => invalidateForms(queryClient),
  });
}

/**
 * Review a submission — status, score, and filing it under a customer.
 *
 * There is no `answers` here and there could not be a working one: what
 * somebody said is refused any edit by trigger.
 *
 * `clientRef` is one-way. A submission captured at the counter arrives with no
 * customer and can be given one; once it has one it cannot be moved to another,
 * so a screen must not offer to re-file an attached submission.
 */
export function useReviewSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      status?:
        | "submitted"
        | "reviewed"
        | "flagged"
        | "archived"
        | "changes_requested";
      /** What to change. Required when sending a submission back. */
      reviewNote?: string;
      score?: number | null;
      scoreOutcome?: string | null;
      /** Only ever accepted on a submission that has no customer yet. */
      clientRef?: number;
    }) =>
      (
        await send<{ submission: SubmissionRow }>(
          `/api/forms/submissions/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).submission,
    onSuccess: () => invalidateForms(queryClient),
  });
}
