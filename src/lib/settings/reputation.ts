import { z } from "zod";

// ============================================================================
// What the facility decides about asking for reviews.
//
// ── WHAT IS DELIBERATELY NOT HERE ─────────────────────────────────────────
//
// **The send delay.** It is `automation_rules.offset_minutes` and nothing else.
// The build this replaces let it be edited in three places — a trigger card, a
// send sequence, and a chip on the Messages tab — with no rule about which one
// won. The fix is not a precedence order; it is that two of the three editors
// are deleted.
//
// **Any switch that hides the public review link.** Showing it only to happy
// clients is review gating, prohibited by Google's review policies and by 16
// CFR Part 465. It was a setting in this product until 2026-08-28.
// `bun run check:no-review-gating` now fails the build if it returns.
//
// **The channels.** Google, Facebook and the rest are rows in
// `review_channels`, because a place id, a weight and a priority per location
// is a table, not a JSON blob — and because Yelp's "never solicitable" has to
// be a CHECK the send path reads rather than a convention a screen remembers.
//
// **Quiet hours and the velocity cap.** They belong to every message a facility
// sends, not to review requests — see `messaging-policy.ts`.
// ============================================================================

export const reputationConfigSchema = z.object({
  /**
   * At or below this rating, a recovery ticket opens and the assignee is
   * alerted. Default 3 stars: on the sample data in the v2 spec that escalates
   * roughly 6% of responses — about 15 tickets per 247 — which is the volume a
   * single-location facility can actually work. At 4 it is ~14%, and an ignored
   * ticket with an SLA badge on it is worse than no ticket.
   *
   * IT DOES NOT DECIDE WHO SEES THE PUBLIC LINK. Everyone does, at every
   * rating. See the header.
   */
  escalationThreshold: z.number().int().min(1).max(5),

  /**
   * The lowest rating eligible for the facility's own booking page, alongside a
   * written comment and display consent.
   *
   * Default 4 rather than 5: it roughly doubles the eligible pool and reads as
   * credible, where a wall of nothing but 5s is the strongest signal a reader
   * has that the reviews were curated.
   */
  showcaseMin: z.number().int().min(1).max(5),

  /** How long a survey link stays usable. */
  linkTtlDays: z.number().int().min(1).max(90),

  /**
   * When to evaluate the single nudge, measured from the initial send.
   *
   * There is ONE nudge per request, ever, and this is the moment its one branch
   * is chosen: no rating yet means resend on the other channel; rated but never
   * clicked means "share it publicly"; anything else means nothing. They were
   * two independent systems that both fired at 48 hours into a one-per-day cap.
   */
  nudgeAfterHours: z.number().int().min(1).max(720),

  /**
   * How long after the initial send a request stops being answerable and its
   * outstanding jobs are dropped rather than sent late.
   */
  expiresAfterDays: z.number().int().min(1).max(90),

  /** Do not ask the same client again inside this many days. */
  cooldownDays: z.number().int().min(0).max(365),

  /**
   * Do not ask a client who recently rated below the escalation threshold.
   *
   * Unioned with the cooldown rather than ranked against it: the longest
   * applicable window wins, and the client's profile shows the resulting date.
   * Two windows with no stated precedence is how somebody who complained on
   * Monday gets asked again on Friday.
   */
  negativePauseDays: z.number().int().min(0).max(365),

  /**
   * Whether a visit with no service — a retail purchase and nothing else —
   * should be asked for a review.
   *
   * Off, as the spec proposes. "How was your visit?" after buying a bag of food
   * reads as a form letter, and it spends the cooldown that the next actual
   * groom would have used.
   */
  askAfterRetailOnly: z.boolean(),

  /**
   * The most an assignee may put on one apology credit without approval, or 0
   * to allow none.
   *
   * The permission itself is not new: `store_credit_entries` already requires
   * `process_refund` for a positive amount, because granting credit is giving
   * money away. This is the per-location ceiling on top of that.
   */
  apologyCreditCap: z.number().min(0).max(10_000),
});
export type ReputationConfig = z.infer<typeof reputationConfigSchema>;

/**
 * What a facility that has never opened the screen gets.
 *
 * Note what these defaults do NOT do: nothing here causes a message to be sent.
 * The rule that asks for a review ships disabled (`ensure_automation_rules`
 * seeds every rule `enabled = false`), so a facility that never configures
 * anything sends nothing, and these numbers only describe how the ask would
 * behave once somebody turns it on.
 */
export const NO_REPUTATION_CONFIG: ReputationConfig = {
  escalationThreshold: 3,
  showcaseMin: 4,
  linkTtlDays: 30,
  nudgeAfterHours: 48,
  expiresAfterDays: 7,
  cooldownDays: 30,
  negativePauseDays: 14,
  askAfterRetailOnly: false,
  apologyCreditCap: 25,
};

/**
 * The date after which this client may be asked again.
 *
 * X-04: the windows are UNIONED, not ranked. A client on a 30-day cooldown who
 * also left 2 stars ten days ago is covered by whichever runs longer, and the
 * answer is one date the front desk can be shown rather than two rules they
 * have to reconcile.
 */
export function nextEligibleAt(
  config: ReputationConfig,
  input: { lastAskedAt?: Date | null; lastNegativeAt?: Date | null },
): Date | null {
  const candidates: number[] = [];

  if (input.lastAskedAt && config.cooldownDays > 0) {
    candidates.push(
      input.lastAskedAt.getTime() + config.cooldownDays * 86_400_000,
    );
  }
  if (input.lastNegativeAt && config.negativePauseDays > 0) {
    candidates.push(
      input.lastNegativeAt.getTime() + config.negativePauseDays * 86_400_000,
    );
  }

  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates));
}
