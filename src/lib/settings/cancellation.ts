import { z } from "zod";

// ============================================================================
// What a cancellation costs, in the facility's own words.
//
// ── WHY A NEW DOMAIN RATHER THAN A FIFTH FIELD ────────────────────────────
//
// The client, asked whether a cancellation should be instant or need approval,
// answered something larger than the question: grooming keeps a deposit or
// charges a fee or neither; boarding takes a percentage and credits the rest;
// daycare takes the pass itself; and all of it changes with how much notice
// was given. "We need to make a system where they can create their own
// cancelation policy."
//
// There were already FOUR shapes for this and not one of them ever charged
// anything:
//
//   booking_rules.cancelPolicyHours + cancelFeePercentage   real, stored, shown
//                                                           to customers, never
//                                                           applied
//   deposit_rules.refundPolicy                              real, stored, a
//                                                           SECOND and
//                                                           conflicting window
//   customServices[].cancellationPolicy                     stored through a
//                                                           .passthrough(),
//                                                           read by nothing
//   BookingEngineConfig.allowCancellation                   fixture only
//
// The two real ones already contradict each other — `DepositRulesSettings` has
// a "match it" button whose whole job is to paper over the disagreement. So
// this replaces them rather than joining them: Phase 3 makes `cancel_terms`
// read this domain first and fall back to `booking_rules`, and the old editors
// become pointers.
//
// ── NOTHING READS THIS YET ────────────────────────────────────────────────
//
// Deliberately. A facility can author a policy and it decides nothing until
// the engine lands, which is what makes this change unable to move money.
//
// ── ABSENT MEANS NO FEE, ALWAYS ───────────────────────────────────────────
//
// `settingsFromRows` DROPS a domain whose stored value stops parsing, so a
// required field added here would delete every facility's policy on the deploy
// that added it. Every field is optional or defaulted, and every default is
// the safe direction — no charge, refund in full. A policy that fails to load
// must never invent a charge.
//
// The one exception to "safe means nothing happens" is `customerMayCancel`,
// and it is worth stating: absent means INSTANT. Safe means UNCHANGED, and
// today a customer can cancel instantly — defaulting to "request" would
// silently remove a shipped capability from every facility on the platform.
// ============================================================================

/** What the facility keeps when a booking is cancelled inside a tier. */
export const cancellationChargeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  /** Keep whatever deposit was actually TAKEN — never what was merely asked. */
  z.object({ kind: z.literal("keep_deposit") }),
  z.object({ kind: z.literal("percentage"), value: z.number().default(0) }),
  z.object({ kind: z.literal("flat"), value: z.number().default(0) }),
  /** Daycare: the pass IS the fee. Consumes one from the client's package. */
  z.object({ kind: z.literal("forfeit_pass") }),
]);
export type CancellationCharge = z.infer<typeof cancellationChargeSchema>;

export const NO_CHARGE: CancellationCharge = { kind: "none" };

/** What happens to money already paid, over and above the charge. */
export const cancellationRefundSchema = z
  .enum(["none", "original", "store_credit"])
  .default("original");
export type CancellationRefund = z.infer<typeof cancellationRefundSchema>;

export const cancellationTierSchema = z.object({
  id: z.string().default(""),
  /**
   * The LEAST notice that still qualifies for this tier, in hours.
   *
   * Read it as "cancelled with at least this much notice". A tier at 72 covers
   * everything from three days out upwards until a longer tier takes over; a
   * tier at 0 is the last-minute catch-all.
   *
   * The plan sketched this as `withinHours` in one paragraph and
   * `minNoticeHours` in the next. This is the one the resolution rule was
   * written against, and a name that says which direction it counts is worth
   * more than the shorter one.
   */
  minNoticeHours: z.number().default(0),
  /** The facility's own words for this tier, shown to the customer. */
  label: z.string().optional(),
  charge: cancellationChargeSchema.default(NO_CHARGE),
  refund: cancellationRefundSchema,
});
export type CancellationTier = z.infer<typeof cancellationTierSchema>;

// ── THERE IS NO `otherwise`, AND THAT IS A DECISION ───────────────────────
//
// The plan sketched a tier two ways in consecutive paragraphs — `withinHours`
// in the shape and `minNoticeHours` in the resolution rule — and carried an
// `otherwise` branch for "cancelled earlier than every tier".
//
// Under `withinHours` that branch is coherent: fall outside every window and
// nothing applies. Under `minNoticeHours` it cannot fire. The tier with the
// HIGHEST minimum already absorbs every case above it, so a facility that
// wants "cancelled well ahead, free" writes exactly that tier. The only state
// left uncovered is notice BELOW every tier's minimum, which `resolveTier`
// deliberately leaves unmatched and unpriced.
//
// So `otherwise` would be a field in a money schema that nothing can reach,
// and the first draft of this screen described it backwards — "cancelled
// earlier" for a branch that could only mean "later". Removed rather than
// shipped: an unreachable control is the exact shape of bug this round of work
// exists to clear.

export const servicePolicySchema = z.object({
  /** Off means this service falls through to whatever applied before. */
  enabled: z.boolean().default(false),
  /**
   * Instant, or an ask the facility answers.
   *
   * Per service because the client said "it depends upon the service".
   * Defaults to `instant` — see the banner: safe means unchanged.
   */
  customerMayCancel: z.enum(["instant", "request"]).default("instant"),
  /** Ordered by the editor; `resolveTier` does not trust the order. */
  tiers: z.array(cancellationTierSchema).default([]),
});
export type ServiceCancellationPolicy = z.infer<typeof servicePolicySchema>;

export const cancellationPolicySchema = z.object({
  /** Keyed by service — the four bookable ones, plus any custom module slug. */
  services: z.record(z.string(), servicePolicySchema).default({}),
});
export type CancellationPolicies = z.infer<typeof cancellationPolicySchema>;

/** No policy at all: every cancellation is free and fully refunded. */
export const NO_CANCELLATION_POLICIES: CancellationPolicies = { services: {} };

/**
 * The tier that applies to a cancellation, or null when none does.
 *
 * ── THE RULE, WRITTEN ONCE ────────────────────────────────────────────────
 *
 * Walk the tiers by `minNoticeHours` DESCENDING and take the first whose
 * `minNoticeHours <= noticeHours`. That is the most notice the customer
 * actually managed to give.
 *
 * Three decisions that are easy to get wrong later, so they are pinned by
 * tests rather than left to be re-derived:
 *
 *   * The boundary is `>=`. Exactly 72.0 hours' notice gets the 72h tier,
 *     which is the cheaper side — a customer on the line is not charged the
 *     stricter tier for being punctual to the second.
 *   * A tier at 0 is the last-minute catch-all.
 *   * With NO tier at 0 and a customer inside every window, NOTHING applies.
 *     The nearest tier is never borrowed: a facility that wrote three tiers
 *     starting at 24 hours did not write a rule for two hours' notice, and
 *     inventing one charges money nobody agreed to.
 *
 * There is no "everything else" branch, and the block above `servicePolicySchema`
 * explains why: the highest tier already covers every case above it.
 */
export function resolveTier(
  tiers: readonly CancellationTier[] | undefined,
  noticeHours: number,
): CancellationTier | null {
  if (!tiers?.length) return null;
  if (!Number.isFinite(noticeHours)) return null;

  const notice = Math.max(0, noticeHours);
  let best: CancellationTier | null = null;

  for (const tier of tiers) {
    const min = Number.isFinite(tier.minNoticeHours)
      ? Math.max(0, tier.minNoticeHours)
      : 0;
    if (min > notice) continue;
    if (!best || min > Math.max(0, best.minNoticeHours)) best = tier;
  }

  return best;
}

/**
 * Is this service's policy live?
 *
 * A disabled service, or an enabled one with no tiers, decides nothing — the
 * caller should fall back to whatever applied before rather than treating
 * emptiness as "charge nothing, deliberately".
 */
export function policyDecidesAnything(
  policy: ServiceCancellationPolicy | undefined,
): boolean {
  if (!policy?.enabled) return false;
  return policy.tiers.length > 0;
}

// ============================================================================
// SEEDING FROM WHAT THE FACILITY ALREADY SET
//
// A facility opening this screen for the first time should see the terms it is
// already operating under, not an empty page — it has a notice window and a
// fee percentage in `booking_rules` today, and a refund policy in
// `deposit_rules`, and both are shown to customers.
//
// The seed is EDITOR-ONLY. It is never stored on the facility's behalf: until
// somebody presses save, `configured` stays false and the engine keeps reading
// the old fields. Writing a policy nobody authored is how a fixture's numbers
// end up on a real customer's invoice, which is the mistake `lib/settings/
// deposits.ts` documents at length.
// ============================================================================

export interface CancellationSeedInput {
  /** `booking_rules.cancelPolicyHours` — hours of notice for a free cancel. */
  cancelPolicyHours?: number;
  /** `booking_rules.cancelFeePercentage` — charged inside that window. */
  cancelFeePercentage?: number;
  /** `deposit_rules.refundPolicy.type`. */
  refundType?: "full_before_window" | "non_refundable" | "credit";
  services: readonly string[];
}

/**
 * The policy a facility is effectively running today, as this domain's shape.
 *
 * One tier, because one is all the old fields can express: free with enough
 * notice, the configured percentage inside it. Every service gets the same
 * terms, because the old fields were facility-wide — the whole point of the
 * new domain is that they need not stay that way.
 */
export function seedFromExisting(
  input: CancellationSeedInput,
): CancellationPolicies {
  const hours = Math.max(0, input.cancelPolicyHours ?? 0);
  const percentage = Math.max(0, input.cancelFeePercentage ?? 0);

  // `non_refundable` keeps everything; `credit` returns it as store credit;
  // anything else refunds to the original tender.
  const refund: CancellationRefund =
    input.refundType === "non_refundable"
      ? "none"
      : input.refundType === "credit"
        ? "store_credit"
        : "original";

  const services: Record<string, ServiceCancellationPolicy> = {};
  for (const service of input.services) {
    services[service] = {
      enabled: false,
      customerMayCancel: "instant",
      tiers: [
        {
          id: `${service}-late`,
          minNoticeHours: 0,
          label: undefined,
          charge:
            percentage > 0
              ? { kind: "percentage", value: percentage }
              : NO_CHARGE,
          refund,
        },
        {
          id: `${service}-notice`,
          minNoticeHours: hours,
          label: undefined,
          charge: NO_CHARGE,
          refund: "original",
        },
      ],
    };
  }

  return { services };
}
