/**
 * Form Scoring Engine (Phase 2)
 * Computes scores for intake applications: approve / deny / needs_review.
 */

import type {
  FormScoringConfig,
  FormScoringRule,
  ScoreOutcome,
  SubmissionScore,
} from "@/data/forms-phase2-types";

/**
 * Evaluate a single scoring rule against the given answers.
 * Returns the points if the condition matches, otherwise 0.
 */
function evaluateRule(
  rule: FormScoringRule,
  answers: Record<string, unknown>,
): number {
  if (!rule.sourceFieldId) return rule.points; // unconditional points

  const value = answers[rule.sourceFieldId];
  if (value === undefined || value === null) return 0;

  const target = rule.conditionValue;
  if (!rule.conditionOperator || target === undefined) {
    // If answered at all, award points
    return value !== "" ? rule.points : 0;
  }

  const strValue = String(value);
  switch (rule.conditionOperator) {
    case "eq":
      return strValue === String(target) ? rule.points : 0;
    case "neq":
      return strValue !== String(target) ? rule.points : 0;
    case "contains":
      return strValue.toLowerCase().includes(String(target).toLowerCase())
        ? rule.points
        : 0;
    case "in": {
      const arr = Array.isArray(target) ? target : [target];
      return arr.some((t) => strValue === String(t)) ? rule.points : 0;
    }
    default:
      return 0;
  }
}

/**
 * Determine outcome from score using thresholds.
 * - score >= approveAbove → "approve"
 * - score >= needsReviewAbove → "needs_review"
 * - below both → "deny"
 */
function determineOutcome(
  score: number,
  thresholds?: FormScoringConfig["thresholds"],
): ScoreOutcome {
  const approveAbove = thresholds?.approveAbove ?? 80;
  const needsReviewAbove = thresholds?.needsReviewAbove ?? 50;

  if (score >= approveAbove) return "approve";
  if (score >= needsReviewAbove) return "needs_review";
  return "deny";
}

/**
 * Compute the score for a submission based on the form's scoring config.
 */
export function computeSubmissionScore(
  config: FormScoringConfig,
  answers: Record<string, unknown>,
): SubmissionScore {
  if (!config.enabled || !config.rules?.length) {
    return {
      score: 0,
      outcome: "needs_review",
      details: [],
      computedAt: new Date().toISOString(),
    };
  }

  const details: { ruleId: string; points: number }[] = [];
  let total = 0;

  for (const rule of config.rules) {
    const pts = evaluateRule(rule, answers);
    details.push({ ruleId: rule.id, points: pts });
    total += pts;
  }

  return {
    score: total,
    outcome: determineOutcome(total, config.thresholds),
    details,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Get a human-readable label and color for a score outcome.
 */
export function getOutcomeDisplay(outcome: ScoreOutcome): {
  label: string;
  color: string;
  bg: string;
} {
  switch (outcome) {
    case "approve":
      return {
        label: "Approved",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
      };
    case "deny":
      return { label: "Denied", color: "text-rose-700", bg: "bg-rose-50" };
    case "needs_review":
      return {
        label: "Needs Review",
        color: "text-amber-700",
        bg: "bg-amber-50",
      };
  }
}
