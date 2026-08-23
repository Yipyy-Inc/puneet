import { z } from "zod";

import type { ApplicationStatus } from "./application";

// ============================================================================
// The review side: what a Yipyy administrator may do to an application, and
// what they may not.
//
// ── THE MACHINE IS HERE, NOT IN THE TRIGGER ───────────────────────────────
//
// The database trigger asks one question — is this caller a platform admin or
// the service role — and if so allows any status to become any other. That is
// the right boundary for a boundary: it is about WHO, and it is enforceable
// without knowing what the product means by "under review".
//
// Which transitions make sense is a different question, and it belongs in one
// place both the route and the screen can read. Otherwise the screen offers a
// button the route refuses, or worse, the route accepts a move the screen never
// meant to offer — approving something already rejected, for instance, which
// the trigger is perfectly happy with.
//
// ── AND A REFUSAL HAS TO CARRY A REASON ───────────────────────────────────
//
// `more_info_needed` and `rejected` both go back to the facility as prose on
// their screen. A status change with an empty `status_detail` renders as
// "Something needs your attention" with nothing under it, which is worse than
// no notification: the facility knows they are blocked and not why. So the
// detail is required for exactly those two, in the schema, not in a comment.
// ============================================================================

/** What a platform admin may move an application to, and from where. */
export const REVIEW_TRANSITIONS: Record<string, ApplicationStatus[]> = {
  submitted: ["under_review", "more_info_needed", "approved", "rejected"],
  under_review: ["more_info_needed", "approved", "rejected"],
  more_info_needed: ["under_review", "approved", "rejected"],
  // Terminal. Re-opening a decided application is not an edit, it is a new
  // application — the facility signed the one that was decided, and the
  // attestation on it names the day they signed.
  approved: [],
  rejected: [],
  withdrawn: [],
  // Nothing has been submitted, so there is nothing to review.
  draft: [],
};

export function canMoveTo(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return (REVIEW_TRANSITIONS[from] ?? []).includes(to);
}

/** The two that go back to the facility as words they have to act on. */
export const DETAIL_REQUIRED: ApplicationStatus[] = [
  "more_info_needed",
  "rejected",
];

export const reviewDecisionSchema = z
  .object({
    status: z.enum([
      "under_review",
      "more_info_needed",
      "approved",
      "rejected",
    ]),
    /** Prose for the facility. Required for the two above; optional otherwise. */
    detail: z.string().trim().max(2000).optional().or(z.literal("")),
    /** What the acquirer calls it, once there is something to call it. */
    reference: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      !DETAIL_REQUIRED.includes(value.status) ||
      (value.detail ?? "").trim().length >= 10,
    {
      path: ["detail"],
      message:
        "Say what is needed, or why. The facility sees this and nothing else.",
    },
  );

export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

/** Buttons, in the order a reviewer works through them. */
export const DECISION_LABELS: Record<
  ReviewDecision["status"],
  { label: string; blurb: string }
> = {
  under_review: {
    label: "Start reviewing",
    blurb:
      "Tells the facility somebody has picked it up. Nothing else changes.",
  },
  more_info_needed: {
    label: "Ask for more",
    blurb:
      "Unlocks their application so they can correct it, and shows them what you write.",
  },
  approved: {
    label: "Approve",
    blurb:
      "Their merchant account is open. They are then offered the step that links it to Yipyy.",
  },
  rejected: {
    label: "Reject",
    blurb: "Final. They can start a new application; this one is closed.",
  },
};

/** Statuses that are still somebody's work, as opposed to a record. */
export const OPEN_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "more_info_needed",
];

export const CLOSED_STATUSES: ApplicationStatus[] = [
  "approved",
  "rejected",
  "withdrawn",
];

/**
 * How a status is written and coloured, wherever it appears.
 *
 * One table, because the queue and the detail screen show the same word about
 * the same row and a reviewer comparing two tabs must not see two names for it.
 * The phrasing is the reviewer's, not the facility's — "Waiting on them" says
 * whose move it is, which is the question somebody scanning a queue is asking.
 */
export const REVIEW_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  more_info_needed: "Waiting on them",
  approved: "Approved",
  rejected: "Not approved",
  withdrawn: "Withdrawn",
};

export const REVIEW_STATUS_STYLE: Record<string, string> = {
  draft: "text-muted-foreground",
  submitted: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  under_review:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  more_info_needed:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  withdrawn: "text-muted-foreground",
};
