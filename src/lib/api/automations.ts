"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateRuleResult,
  RulesPayload,
} from "@/app/api/automation-rules/route";
import type { UpdateRuleResult } from "@/app/api/automation-rules/[id]/route";
import type {
  CreateTemplateResult,
  TemplatesPayload,
} from "@/app/api/message-templates/route";

// ============================================================================
// The automations query layer.
//
// It replaces `src/lib/api/communications.ts`, which had exactly this shape —
// `queryKey`, an `async queryFn`, a typed return — and fetched nothing:
//
//   queryFn: async (): Promise<AutomationRule[]> => automationRules
//
// That reads as converted at a glance, which is how it survived. The automations
// page did not even import it. Anything here that stops calling `fetch` is a
// bug, not a shortcut.
// ============================================================================

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
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const automationQueries = {
  rules: () => ({
    queryKey: ["automations", "rules"] as const,
    queryFn: async () =>
      (await get<RulesPayload>("/api/automation-rules")).rules,
  }),
  templates: (opts?: { includeRetired?: boolean }) => ({
    queryKey: [
      "automations",
      "templates",
      opts?.includeRetired ?? false,
    ] as const,
    queryFn: async () =>
      (
        await get<TemplatesPayload>(
          `/api/message-templates${opts?.includeRetired ? "?includeRetired=1" : ""}`,
        )
      ).templates,
  }),
};

function invalidateAutomations(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["automations"] });
}

export interface NewRule {
  name: string;
  trigger: string;
  emailTemplateId?: string | null;
  smsTemplateId?: string | null;
  serviceTypes?: string[];
  locationIds?: string[];
  minAmount?: number | null;
  offsetMinutes?: number | null;
  cooldownDays?: number;
  isTransactional?: boolean;
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRule) =>
      (await send<CreateRuleResult>("/api/automation-rules", input)).rule,
    onSuccess: () => invalidateAutomations(queryClient),
  });
}

export type RulePatch = Partial<NewRule> & { enabled?: boolean };

/**
 * Edit a rule, or switch it on and off.
 *
 * Invalidate-first, not optimistic — the house style, and here it is also the
 * only correct choice: enabling can be REFUSED by the server (nothing emits
 * that trigger yet, or the channel is not configured on this deployment). An
 * optimistic flip would show the switch on, then snap it back, which reads as a
 * flaky toggle rather than as the refusal it is. The screen surfaces the
 * server's reason instead.
 */
export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RulePatch }) =>
      (
        await send<UpdateRuleResult>(
          `/api/automation-rules/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).rule,
    onSuccess: () => invalidateAutomations(queryClient),
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      send<{ deleted: string }>(
        `/api/automation-rules/${encodeURIComponent(id)}`,
        undefined,
        "DELETE",
      ),
    onSuccess: () => invalidateAutomations(queryClient),
  });
}

export interface NewTemplate {
  name: string;
  channel: "email" | "sms";
  category?: string;
  subject?: string | null;
  body: string;
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTemplate) =>
      (await send<CreateTemplateResult>("/api/message-templates", input))
        .template,
    onSuccess: () => invalidateAutomations(queryClient),
  });
}
