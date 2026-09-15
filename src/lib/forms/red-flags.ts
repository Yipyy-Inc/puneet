import type { FormRedFlags } from "@/lib/settings/form-settings";

// ============================================================================
// Which answers on a submission a facility asked to be flagged.
//
// `form_red_flags` holds rules (this question, on this form, equals or contains
// this value) and keywords (anywhere in any answer). The submit route asks here
// before the row is written, so a matching submission is stored as `flagged`
// and the staff email can say what matched.
//
// Matching ignores case and surrounding space. An answer can be a string, a
// number, a yes/no, a list of choices or an object (an address, a signature),
// and every text inside it is compared.
// ============================================================================

export interface RedFlagMatch {
  kind: "rule" | "keyword";
  questionId: string | null;
  /** What to tell staff: the question and the flagged value, or the keyword. */
  label: string;
}

function textsOf(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(textsOf);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(textsOf);
  }
  return [];
}

const normal = (text: string) => text.trim().toLocaleLowerCase();

export function redFlagsIn(input: {
  formId: string;
  answers: Record<string, unknown>;
  flags: FormRedFlags;
}): RedFlagMatch[] {
  const matches: RedFlagMatch[] = [];

  for (const rule of input.flags.rules) {
    if (rule.formId !== input.formId) continue;
    const wanted = normal(rule.value);
    const texts = textsOf(input.answers[rule.questionId]).map(normal);
    const hit =
      rule.operator === "equals"
        ? texts.some((text) => text === wanted)
        : texts.some((text) => text.includes(wanted));
    if (hit) {
      matches.push({
        kind: "rule",
        questionId: rule.questionId,
        label: `${rule.questionLabel || rule.questionId}: ${rule.value}`,
      });
    }
  }

  const answered = Object.entries(input.answers);
  for (const keyword of input.flags.keywords) {
    const wanted = normal(keyword);
    if (!wanted) continue;
    const found = answered.find(([, value]) =>
      textsOf(value).some((text) => normal(text).includes(wanted)),
    );
    if (found) {
      matches.push({ kind: "keyword", questionId: found[0], label: keyword });
    }
  }

  return matches;
}

/** Whether a file question on the form was answered. */
export function answersHaveFiles(
  questions: { id: string; type?: string }[],
  answers: Record<string, unknown>,
): boolean {
  return questions.some(
    (question) =>
      question.type === "file" &&
      textsOf(answers[question.id]).some((text) => text.trim() !== ""),
  );
}
