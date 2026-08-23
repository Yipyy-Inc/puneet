import type { SubmissionRow } from "@/lib/api/mappers/form";
import { evaluateLogicRules } from "@/lib/forms/logic";
import type {
  FieldMappingItem,
  FormLogicRule,
  FormQuestion,
  FormSectionDTO,
} from "@/types/forms";

// ============================================================================
// Reading a submission through the questions it was actually asked.
//
// ── EVERY HELPER HERE TAKES THE FROZEN SCHEMA, NEVER THE FORM ─────────────
//
// `SubmissionRow.schema` is the version's own definition, copied at the moment
// somebody answered. The form it came from may since have been rewritten — that
// is allowed, and it opens a new version rather than editing this one.
//
// So a screen that wants the wording, the required flags, or the logic rules
// must take them from HERE and not from `forms/[id]`. Rendering today's
// questions beside last year's answers is how a "yes" ends up under a question
// nobody was ever shown, which is the exact defect the version table exists to
// prevent. It would be a shame to reintroduce it one component above the fix.
// ============================================================================

function listFrom<T>(schema: Record<string, unknown> | null, key: string): T[] {
  const value = schema?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function questionsOf(row: SubmissionRow): FormQuestion[] {
  return listFrom<FormQuestion>(row.schema, "questions");
}

export function sectionsOf(row: SubmissionRow): FormSectionDTO[] {
  return listFrom<FormSectionDTO>(row.schema, "sections");
}

export function logicRulesOf(row: SubmissionRow): FormLogicRule[] {
  return listFrom<FormLogicRule>(row.schema, "logicRules");
}

export function fieldMappingOf(row: SubmissionRow): FieldMappingItem[] {
  return listFrom<FieldMappingItem>(row.schema, "fieldMapping");
}

/** A question counts as answered when it has a value that is not the empty string. */
export function isAnswered(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export interface SubmissionFlags {
  /** A logic rule marked these answers for attention. */
  alertFlag: boolean;
  /** Required questions that came back empty. */
  missingCount: number;
  /** At least one file-type question carries a value. */
  hasFiles: boolean;
}

/**
 * The three things a list wants to show at a glance.
 *
 * All of it derived from the version that was answered — the fixture computed
 * the same flags against the form's CURRENT questions, so making a question
 * required today retroactively marked every past submission incomplete.
 */
export function submissionFlags(row: SubmissionRow): SubmissionFlags {
  const questions = questionsOf(row);
  const answers = row.answers;

  const rules = logicRulesOf(row);
  const alertFlag =
    rules.length > 0 ? evaluateLogicRules(rules, answers).alertFlag : false;

  let missingCount = 0;
  let hasFiles = false;
  for (const question of questions) {
    const value = answers[question.id];
    if (question.required && !isAnswered(value)) missingCount += 1;
    if (question.type === "file" && isAnswered(value)) hasFiles = true;
  }

  return { alertFlag, missingCount, hasFiles };
}

/** Questions that carry an answer, in the order the version declared them. */
export function answeredQuestions(row: SubmissionRow): FormQuestion[] {
  return questionsOf(row).filter((q) => isAnswered(row.answers[q.id]));
}
