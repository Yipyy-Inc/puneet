import type { EvaluationResult } from "@/lib/evaluations/questions";

// ============================================================================
// What happens when an evaluator finishes — "Report card delivery" (Setup,
// the client's mock, 2026-10-02):
//
//   Staff reviews first                 every card waits in the review queue
//   Send automatically                  the owner gets it the moment it's done
//   Auto-send passes, review the rest   "Approved" goes out; notes,
//                                       re-evaluation and not approved wait
//
//   Who can review & send   Reception · Supervisor · Manager ·
//                           Evaluator can self-send
//
// Owners and admins can always review. The database applies the same rule
// (`send_evaluation_card`); this is the screen's copy of it, so a button is
// only offered to someone the server will let press it.
// ============================================================================

export const DELIVERY_MODES = ["review", "auto", "autoPass"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

/** The roles the setup page offers as reviewers, in its order. */
export const REVIEWER_ROLES = ["reception", "supervisor", "manager"] as const;
export type ReviewerRole = (typeof REVIEWER_ROLES)[number];

export function deliveryAction(
  mode: DeliveryMode,
  result: EvaluationResult | null,
): "review" | "send" {
  if (mode === "auto") return "send";
  if (mode === "autoPass" && result === "approved") return "send";
  return "review";
}

export function mayReview(input: {
  /** The caller's role in this facility. */
  role: string | null | undefined;
  /** The caller evaluated this pet. */
  isEvaluator: boolean;
  reviewerRoles: readonly string[];
  evaluatorSelfSend: boolean;
}): boolean {
  if (input.role === "owner" || input.role === "admin") return true;
  if (input.isEvaluator && input.evaluatorSelfSend) return true;
  return !!input.role && input.reviewerRoles.includes(input.role);
}

/** "Delivered" for a card sent in the last 48 hours and not opened yet. */
export const DELIVERED_HOURS = 48;

export type OpenState =
  | { kind: "delivered" }
  | { kind: "opened"; bookedService: string | null }
  | { kind: "not_opened" };

/** How a sent card is doing: opened (and booked since?), or not yet. */
export function openState(input: {
  sentAt: string;
  openedAt: string | null;
  /** A service booked for the pet after the card went out, if any. */
  bookedService: string | null;
  now: Date;
}): OpenState {
  if (input.openedAt) {
    return { kind: "opened", bookedService: input.bookedService };
  }
  const age = input.now.getTime() - new Date(input.sentAt).getTime();
  return age < DELIVERED_HOURS * 3_600_000
    ? { kind: "delivered" }
    : { kind: "not_opened" };
}
