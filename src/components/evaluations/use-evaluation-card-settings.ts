"use client";

import { useQueryClient } from "@tanstack/react-query";

import { evaluationKeys } from "@/lib/api/evaluations";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import type { CustomQuestion } from "@/lib/evaluations/questions";
import type {
  EvaluationFormTemplate,
  EvaluationReportCardConfig,
} from "@/types/facility";

// ============================================================================
// Operations › Evaluations › Setup (the client's mock, 2026-10-02): how a
// finished card reaches the owner, who reviews it, what it shows, its theme,
// and the facility's own questions. Each change saves at once, from the
// value the server last stored — never from the fallback a screen shows
// while the settings are still on their way, which is why `isPending` must
// hold every control (check:settings-seeding).
// ============================================================================

export function useEvaluationCardSettings() {
  const { settings, isPending } = useFacilitySettings();
  const save = useSaveFacilitySetting();
  const queryClient = useQueryClient();
  // Parsed against each domain's schema; typed here.
  const card = settings.evaluation_report_card
    .value as EvaluationReportCardConfig;
  const template = settings.evaluation_form_template
    .value as EvaluationFormTemplate;

  return {
    card,
    customQuestions: (template.customQuestions ?? []) as CustomQuestion[],
    isPending,
    saving: save.isPending,
    saveCard: async (patch: Partial<EvaluationReportCardConfig>) => {
      await save.mutateAsync({
        domain: "evaluation_report_card",
        value: { ...card, ...patch },
      });
      // Who may review is the board's to say, from these.
      await queryClient.invalidateQueries({ queryKey: evaluationKeys.board() });
    },
    saveQuestions: (customQuestions: CustomQuestion[]) =>
      save.mutateAsync({
        domain: "evaluation_form_template",
        value: { ...template, customQuestions },
      }),
  };
}
