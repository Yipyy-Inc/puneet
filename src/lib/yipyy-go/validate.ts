import type { CustomQuestion, FormTemplateConfig } from "@/types/yipyygo";
import type { YipyyGoAnswers } from "@/lib/api/mappers/yipyy-go";

// ============================================================================
// Whether a pre-arrival form is complete enough to send, by the facility's own
// template.
//
// The facility decides which sections the form has, which are required, and
// what extra questions it asks (formTemplate / formTemplates in
// `yipyy_go_config`). The old form read none of that — it showed a fixed set
// of steps whatever the facility had configured. The submit route checks the
// answers against the template here before the database accepts them; the
// form uses the same function to say what is still missing.
//
// It returns WHAT is missing, as keys the screen translates — never prose.
// ============================================================================

export type YipyyGoMissing =
  | "medications"
  | "feeding"
  | "behavior"
  | "belongingsPhoto"
  | `question:${string}`;

function answered(question: CustomQuestion, value: unknown): boolean {
  switch (question.type) {
    case "checkbox":
      return value === true;
    case "yes_no":
      return typeof value === "boolean";
    case "multi_select":
      return Array.isArray(value) && value.length > 0;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    default:
      return typeof value === "string" && value.trim().length > 0;
  }
}

/** Every custom question the form asks: the global ones, and those of each
 *  enabled section, in the order the facility gave them. */
export function customQuestionsOf(
  template: FormTemplateConfig,
): CustomQuestion[] {
  const { sections } = template;
  const fromSections = [
    sections.petInfo,
    sections.careInstructions,
    sections.medications,
    sections.feedingSchedule,
    sections.additionalContacts,
    sections.specialRequests,
    ...sections.customSections,
  ]
    .filter((section) => section.enabled)
    .flatMap((section) => section.customQuestions ?? []);
  return [...template.globalCustomQuestions, ...fromSections].sort(
    (a, b) => a.order - b.order,
  );
}

export function validateYipyyGoAnswers(
  template: FormTemplateConfig,
  answers: YipyyGoAnswers,
): YipyyGoMissing[] {
  const missing: YipyyGoMissing[] = [];
  const { sections, features } = template;

  if (
    sections.medications.enabled &&
    sections.medications.required &&
    !answers.noMedications &&
    answers.medications.length === 0
  ) {
    missing.push("medications");
  }

  const feeding = answers.feedingInstructions;
  if (
    sections.feedingSchedule.enabled &&
    sections.feedingSchedule.required &&
    !(
      feeding &&
      (feeding.foodType.trim().length > 0 ||
        (feeding.occasions?.length ?? 0) > 0)
    )
  ) {
    missing.push("feeding");
  }

  if (
    sections.careInstructions.enabled &&
    sections.careInstructions.required &&
    !answers.behaviorNotes
  ) {
    missing.push("behavior");
  }

  if (
    features.belongingsPhotoRequired &&
    !answers.belongingsPhotoId &&
    !answers.belongings.some((item) => item.photoId)
  ) {
    missing.push("belongingsPhoto");
  }

  for (const question of customQuestionsOf(template)) {
    if (!question.required) continue;
    if (!answered(question, answers.customAnswers?.[question.id])) {
      missing.push(`question:${question.id}`);
    }
  }

  return missing;
}
