import {
  getEvaluationFormTemplate,
  saveEvaluationFormTemplate,
} from "@/data/settings";
import type { EvaluationFormTemplate } from "@/types/facility";

// Evaluations domain query layer. The evaluation form structure (sections,
// questions, behavior codes) is read/written here so the TanStack Query cache is
// the single source of truth; persistence lives in @/data/settings.

export const evaluationKeys = {
  all: ["evaluations"] as const,
  formTemplate: () => [...evaluationKeys.all, "form-template"] as const,
};

export const evaluationQueries = {
  formTemplate: () => ({
    queryKey: evaluationKeys.formTemplate(),
    queryFn: async (): Promise<EvaluationFormTemplate> =>
      getEvaluationFormTemplate(),
  }),
};

export const evaluationMutations = {
  saveFormTemplate: (template: EvaluationFormTemplate) => ({
    mutationFn: async (): Promise<EvaluationFormTemplate> =>
      saveEvaluationFormTemplate(template),
  }),
};
