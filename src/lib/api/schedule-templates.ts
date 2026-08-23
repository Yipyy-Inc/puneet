"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ScheduleTemplateRow,
  TemplateShiftRow,
} from "@/lib/api/mappers/schedule-template";
import type {
  CreateTemplateResult,
  TemplatesPayload,
} from "@/app/api/schedule-templates/route";
import type { UpdateTemplateResult } from "@/app/api/schedule-templates/[id]/route";
import type { ApplyTemplateResult } from "@/app/api/schedule-templates/[id]/apply/route";

// ============================================================================
// Schedule templates, from the browser.
//
// ── APPLYING INVALIDATES THE ROSTER, NOT JUST THE TEMPLATES ───────────────
//
// It writes `staff_shifts`, so every shift query is stale afterwards. That is
// the cross-key invalidation that is invisible until somebody applies a week
// and the calendar still shows nothing — and then reports it as a caching bug.
//
// ── `created: 0` IS A SUCCESS ─────────────────────────────────────────────
//
// It means the week was already applied. Callers must not treat it as a
// failure; the whole point of the unique constraint is that pressing twice is
// safe, and telling somebody "nothing happened" when the week is sitting there
// would send them looking for a problem that does not exist.
// ============================================================================

export type { ScheduleTemplateRow, TemplateShiftRow };

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
  method: "POST" | "PATCH" | "DELETE" = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(method === "DELETE" ? {} : { body: JSON.stringify(body) }),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const scheduleTemplateQueries = {
  all: (opts?: { includeRetired?: boolean; departmentId?: string }) => ({
    queryKey: [
      "schedule-templates",
      "list",
      opts?.includeRetired ?? false,
      opts?.departmentId ?? "all",
    ] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.includeRetired) params.set("includeRetired", "1");
      if (opts?.departmentId) params.set("departmentId", opts.departmentId);
      const query = params.toString();
      return (
        await get<TemplatesPayload>(
          `/api/schedule-templates${query ? `?${query}` : ""}`,
        )
      ).templates;
    },
  }),

  detail: (id: string | undefined) => ({
    queryKey: ["schedule-templates", "detail", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await get<{ template: ScheduleTemplateRow }>(
          `/api/schedule-templates/${encodeURIComponent(id ?? "")}`,
        )
      ).template,
  }),
};

function invalidateTemplates(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["schedule-templates"] });
}

export interface NewTemplateShift {
  /** 0=Sunday … 6=Saturday. */
  dayOfWeek: number;
  /** Null is an open shift the roster still has to fill. */
  staffId?: string | null;
  departmentId: string;
  positionId: string;
  /** "HH:MM" in the facility's own clock — never converted client-side. */
  startTime: string;
  /** At or before `startTime` means it ends the next day. Night shifts are fine. */
  endTime: string;
  breakMinutes?: number;
  slots?: number;
  requiredSkills?: string[];
}

export interface NewTemplate {
  name: string;
  description?: string | null;
  departmentId?: string | null;
  shifts?: NewTemplateShift[];
}

export function useCreateScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTemplate) =>
      (await send<CreateTemplateResult>("/api/schedule-templates", input))
        .template,
    onSuccess: () => invalidateTemplates(queryClient),
  });
}

/** Rename, re-describe, or retire. The department cannot be changed. */
export function useUpdateScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    }) =>
      (
        await send<UpdateTemplateResult>(
          `/api/schedule-templates/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).template,
    onSuccess: () => invalidateTemplates(queryClient),
  });
}

/**
 * Delete a template.
 *
 * Takes its lines with it. Does NOT take the shifts it already created —
 * somebody is rostered on those days.
 */
export function useDeleteScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      await send<{ deleted: boolean }>(
        `/api/schedule-templates/${encodeURIComponent(id)}`,
        null,
        "DELETE",
      ),
    onSuccess: () => invalidateTemplates(queryClient),
  });
}

/**
 * Put a template's week on the calendar, as DRAFT shifts.
 *
 * Safe to call twice: `created: 0` means the week was already applied, which
 * is a success and not a failure.
 */
export function useApplyScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, weekStart }: { id: string; weekStart: string }) =>
      await send<ApplyTemplateResult>(
        `/api/schedule-templates/${encodeURIComponent(id)}/apply`,
        { weekStart },
      ),
    onSuccess: () => {
      // BOTH keys. This writes `staff_shifts`, so the roster the person is
      // about to go and look at is stale too.
      void queryClient.invalidateQueries({ queryKey: ["scheduling"] });
      return invalidateTemplates(queryClient);
    },
  });
}
