import type {
  ConditionContext,
  FormCondition,
  FormLogicRule,
  FormQuestion,
} from "@/types/forms";

// ============================================================================
// The form logic engine — conditions, branching, tags and the red-alert flag.
//
// ── WHY IT MOVED OUT OF `src/data/forms.ts` ───────────────────────────────
//
// It is a pure function over questions and answers, and it lived in the fixture
// module only because that is where the fixture happened to be. A screen that
// reads Postgres and wants to know whether a submission raised an alert had to
// import from `src/data` to ask — which is the one import that makes a
// converted screen look unconverted, to a reader and to `bun run audit:facility`
// alike.
//
// `src/data/forms.ts` re-exports both names, so nothing that used them moved.
// ============================================================================

/** Resolve source value from a condition, supporting Phase 2 sourceType/petAttribute/tag. */
function resolveConditionSource(
  c: FormCondition,
  answers: Record<string, unknown>,
  context?: ConditionContext,
): unknown {
  // Phase 2: explicit sourceType
  if (
    c.sourceType === "petAttribute" &&
    c.petAttribute &&
    context?.petAttributes
  ) {
    const attr = c.petAttribute;
    if (attr === "pet.breed") return context.petAttributes.breed;
    if (attr === "pet.type") return context.petAttributes.type;
    if (attr === "pet.age") return context.petAttributes.age;
    if (attr === "pet.weight") return context.petAttributes.weight;
    if (attr === "pet.gender") return context.petAttributes.gender;
    if (attr === "pet.hasTag")
      return context.petAttributes.tags?.includes(String(c.value))
        ? "true"
        : "false";
  }
  if (c.sourceType === "tag" && c.tagId) {
    const allTags = [
      ...(context?.petAttributes?.tags ?? []),
      ...(context?.customerTags ?? []),
    ];
    return allTags.includes(c.tagId) ? "true" : "false";
  }
  if (c.sourceType === "serviceType" && context?.serviceType)
    return context.serviceType;
  if (c.sourceType === "evaluationStatus" && context?.evaluationStatus)
    return context.evaluationStatus;
  // Legacy: contextField or questionId
  if (c.contextField && context) return context[c.contextField];
  if (c.questionId) return answers[c.questionId];
  return undefined;
}

/** Evaluate whether a question should be shown (legacy condition or LogicRule) */
export function shouldShowQuestion(
  question: FormQuestion,
  answers: Record<string, unknown>,
  context?: ConditionContext,
): boolean {
  if (!question.condition) return true;
  const c = question.condition;
  const sourceValue = resolveConditionSource(c, answers, context);
  if (sourceValue === undefined) return true;
  const target = c.value;
  const op = c.operator;
  switch (op) {
    case "eq":
      return sourceValue === target || String(sourceValue) === String(target);
    case "neq":
      return sourceValue !== target && String(sourceValue) !== String(target);
    case "contains": {
      const str = Array.isArray(sourceValue)
        ? sourceValue.join(" ")
        : String(sourceValue ?? "");
      return str.toLowerCase().includes(String(target).toLowerCase());
    }
    case "in": {
      const arr = Array.isArray(target) ? target : [target];
      return arr.some(
        (t) => sourceValue === t || String(sourceValue) === String(t),
      );
    }
    case "gt":
      return Number(sourceValue) > Number(target);
    case "lt":
      return Number(sourceValue) < Number(target);
    case "answered":
      return (
        sourceValue !== undefined && sourceValue !== "" && sourceValue !== null
      );
    case "not_answered":
      return (
        sourceValue === undefined || sourceValue === "" || sourceValue === null
      );
    default:
      return true;
  }
}

/** Evaluate all logic rules for a form against current answers.
 *  Returns a map of effects: { hiddenQuestionIds, requiredQuestionIds, skipToSectionId, endFormMessage, tags, alertFlag } */
export interface LogicRuleEffects {
  hiddenQuestionIds: Set<string>;
  requiredQuestionIds: Set<string>;
  skipToSectionId?: string;
  endFormMessage?: string;
  tags: string[];
  alertFlag: boolean;
}

export function evaluateLogicRules(
  rules: FormLogicRule[],
  answers: Record<string, unknown>,
  context?: ConditionContext,
): LogicRuleEffects {
  const effects: LogicRuleEffects = {
    hiddenQuestionIds: new Set(),
    requiredQuestionIds: new Set(),
    tags: [],
    alertFlag: false,
  };
  for (const rule of rules) {
    // Phase 2: resolve from context if triggerSource is set
    let sourceValue: unknown;
    const ts = (rule as unknown as Record<string, unknown>).triggerSource as
      | string
      | undefined;
    if (ts === "petAttribute" && context?.petAttributes) {
      const attr = (rule as unknown as Record<string, unknown>).petAttribute as
        | string
        | undefined;
      if (attr === "pet.breed") sourceValue = context.petAttributes.breed;
      else if (attr === "pet.type") sourceValue = context.petAttributes.type;
      else if (attr === "pet.age") sourceValue = context.petAttributes.age;
      else if (attr === "pet.weight")
        sourceValue = context.petAttributes.weight;
      else if (attr === "pet.gender")
        sourceValue = context.petAttributes.gender;
      else if (attr === "pet.hasTag")
        sourceValue = context.petAttributes.tags?.includes(String(rule.value))
          ? "true"
          : "false";
    } else if (ts === "tag") {
      const tagId = (rule as unknown as Record<string, unknown>).tagId as
        | string
        | undefined;
      const allTags = [
        ...(context?.petAttributes?.tags ?? []),
        ...(context?.customerTags ?? []),
      ];
      sourceValue = tagId && allTags.includes(tagId) ? "true" : "false";
    } else if (ts === "serviceType") {
      sourceValue = context?.serviceType;
    } else if (ts === "evaluationStatus") {
      sourceValue = context?.evaluationStatus;
    } else {
      sourceValue = answers[rule.triggerQuestionId];
    }
    const target = rule.value;
    let matches = false;
    switch (rule.operator) {
      case "eq":
        matches =
          sourceValue === target || String(sourceValue) === String(target);
        break;
      case "neq":
        matches =
          sourceValue !== target && String(sourceValue) !== String(target);
        break;
      case "contains": {
        const s = Array.isArray(sourceValue)
          ? sourceValue.join(" ")
          : String(sourceValue ?? "");
        matches = s.toLowerCase().includes(String(target).toLowerCase());
        break;
      }
      case "in": {
        const arr = Array.isArray(target) ? target : [target];
        matches = arr.some(
          (t) => sourceValue === t || String(sourceValue) === String(t),
        );
        break;
      }
      case "gt":
        matches = Number(sourceValue) > Number(target);
        break;
      case "lt":
        matches = Number(sourceValue) < Number(target);
        break;
      case "answered":
        matches =
          sourceValue !== undefined &&
          sourceValue !== "" &&
          sourceValue !== null;
        break;
      case "not_answered":
        matches =
          sourceValue === undefined ||
          sourceValue === "" ||
          sourceValue === null;
        break;
    }
    if (!matches) continue;
    switch (rule.action) {
      case "show":
        // Show is the default; no-op since questions are visible by default
        break;
      case "hide":
        rule.targetQuestionIds?.forEach((id) =>
          effects.hiddenQuestionIds.add(id),
        );
        break;
      case "require":
        rule.targetQuestionIds?.forEach((id) =>
          effects.requiredQuestionIds.add(id),
        );
        break;
      case "skip_to_section":
        if (rule.targetSectionId)
          effects.skipToSectionId = rule.targetSectionId;
        break;
      case "end_form":
        effects.endFormMessage =
          rule.endMessage || "This form has ended based on your responses.";
        break;
      case "set_tag":
        if (rule.tagValue) effects.tags.push(rule.tagValue);
        break;
      case "alert_flag":
        effects.alertFlag = true;
        break;
    }
  }
  return effects;
}
