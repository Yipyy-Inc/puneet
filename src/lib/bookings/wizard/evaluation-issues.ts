import type { Pet } from "@/types/pet";

// ============================================================================
// Booking past the evaluation rule — the facility's call, said out loud.
//
// A pet with no passed evaluation, a failed one or an expired one is an ISSUE
// for a service whose rule asks for one. A customer is stopped by it (the
// service card is locked); staff answer it on Confirm (the client's mock,
// 2026-10-01): evaluated on the first day, or not — and then why, in at least
// a few characters, kept with the booking.
// ============================================================================

export type EvaluationIssueReason = "expired" | "failed" | "missing";

export interface EvaluationIssue {
  pet: Pet;
  reason: EvaluationIssueReason;
}

/** At least this many characters of reason before the override counts. */
export const EVALUATION_OVERRIDE_MIN_REASON = 3;
