import type { Pet } from "@/types/pet";

// ============================================================================
// What a pet card in the booking wizard says about the pet (the client's
// mock, 2026-10-01): whether it has been evaluated, and its allergy.
// ============================================================================

export type EvaluationState = "passed" | "expired" | "failed" | "none";

/**
 * The pet's standing for services that need an evaluation. A passed one that
 * has run out reads "expired", not "none" — the pet was evaluated, and staff
 * renew rather than start over.
 */
export function evaluationState(pet: Pet): EvaluationState {
  const evaluations = pet.evaluations ?? [];
  if (
    evaluations.some(
      (e) =>
        e.status === "passed" &&
        e.isExpired !== true &&
        (Array.isArray(e.approvedServices)
          ? e.approvedServices.length > 0
          : true),
    )
  ) {
    return "passed";
  }
  if (
    evaluations.some(
      (e) =>
        (e.status === "passed" && e.isExpired === true) ||
        e.status === "outdated",
    )
  ) {
    return "expired";
  }
  if (evaluations.some((e) => e.status === "failed")) return "failed";
  return "none";
}

/** Words an owner types to mean "no allergy". */
const NO_ALLERGY = /^(none|no|non|n\/?a|nil|nothing|aucune?|rien|-+|—)\.?$/i;

/** The pet's allergy as the owner wrote it, or null when there is none. */
export function allergyOf(pet: Pet): string | null {
  const text = (pet.allergies ?? "").trim();
  if (!text || NO_ALLERGY.test(text)) return null;
  return text;
}
