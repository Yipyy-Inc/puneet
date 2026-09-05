import { z } from "zod";

import {
  depositRefundPolicySchema,
  depositRuleSchema,
  SERVICE_TYPES_FOR_DEPOSITS,
} from "@/types/deposit-rules";
import type {
  DepositRule,
  DepositRuleSet,
  DepositRefundPolicy,
} from "@/types/deposit-rules";

// ============================================================================
// What a facility asks for up front, and what happens to it on a cancellation.
//
// ── WHERE THIS USED TO LIVE, AND WHY IT WAS A MONEY BUG ───────────────────
//
// `localStorage`, under `yipyy:deposit-rules` and `yipyy:deposit-refund-policy`.
// Exactly the fault `lib/settings/pricing.ts` documents, one screen along, and
// worse in one respect: `loadDepositRules()` was not read only by the settings
// editor. BookingModal called it to decide the deposit a customer is asked for,
// and the booking detail page called it again at checkout.
//
// So the deposit depended on WHICH BROWSER took the booking. A receptionist who
// had configured a 30% boarding deposit collected it; the manager's laptop,
// the tablet by the kennels and every private window collected the fixture's
// instead — and a cache clear reset the business's terms without telling
// anybody. Two staff could quote the same customer two different numbers on the
// same booking and both be reading "the settings".
//
// ── THE FALLBACK IS EMPTY, AND IT CHANGES BEHAVIOUR ───────────────────────
//
// Same decision as NO_PRICING_RULES and NO_TAX, for the same reason, and it is
// worth stating plainly because money moves: a facility that has never opened
// the deposit screen now asks for NO deposit, where before it asked for the
// fixture's — 30% on boarding, $25 on grooming, 50% on training, 25% on
// anything over $200.
//
// Not one of those numbers was ever agreed to by a business. They were written
// in a seed file, and they were being taken off real cards, because
// `loadDepositRules()` fell back to them on any browser that had never visited
// the settings screen. A deposit that is not asked for until it is configured
// is a missing feature; a deposit taken because a fixture said so is a facility
// charging its customers terms it never set. The second is much worse.
//
// `configured: false` travels with the value, so the screen can say "not set up
// yet" rather than presenting emptiness as a decision.
//
// ── BUT THE ROWS ARE STILL THERE ──────────────────────────────────────────
//
// The empty fallback is `ensureAllServiceRules([])`, not `[]`: one row per
// bookable service and one booking-value row, every one of them DISABLED at
// zero. So the editor opens with something to edit and the booking flow finds
// nothing to charge, which are both what you want and are not in conflict.
// ============================================================================

/**
 * Complete a rule set for editing: drop rules for services that no longer take
 * deposits, backfill any missing service, and ensure the booking-value row
 * exists. Everything it adds is disabled at zero, so completing a set never
 * starts charging for anything.
 */
export function ensureAllServiceRules(rules: DepositRuleSet): DepositRuleSet {
  const supported = new Set<string>(SERVICE_TYPES_FOR_DEPOSITS);
  const kept = rules.filter(
    (rule) =>
      rule.scope !== "service" ||
      (rule.serviceType != null && supported.has(rule.serviceType)),
  );

  const present = new Set(
    kept
      .filter((rule) => rule.scope === "service" && rule.serviceType)
      .map((rule) => rule.serviceType as string),
  );
  const missing = SERVICE_TYPES_FOR_DEPOSITS.filter(
    (service) => !present.has(service),
  ).map(
    (service): DepositRule => ({
      id: `deposit-${service}`,
      scope: "service",
      serviceType: service,
      amountType: "fixed",
      amount: 0,
      enabled: false,
      label: `${service.charAt(0).toUpperCase() + service.slice(1)} — no deposit`,
    }),
  );

  const threshold: DepositRule[] = kept.some(
    (rule) => rule.scope === "booking_value",
  )
    ? []
    : [
        {
          id: "deposit-high-value",
          scope: "booking_value",
          amountType: "percentage",
          amount: 25,
          minBookingValue: 200,
          enabled: false,
          label: "Bookings over $200 — 25% deposit",
        },
      ];

  return [...kept, ...missing, ...threshold];
}

export const depositConfigSchema = z.object({
  rules: z.array(depositRuleSchema),
  refundPolicy: depositRefundPolicySchema,
});

export type DepositConfig = z.infer<typeof depositConfigSchema>;

/**
 * What a facility that has never configured deposits asks for: nothing.
 *
 * The refund policy is still a real default rather than empty, because it only
 * ever describes a deposit that WAS taken — with no enabled rule there is
 * nothing for it to govern, and the moment somebody enables one they should
 * start from the customer-favourable terms rather than from "non-refundable".
 */
export const NO_DEPOSITS: DepositConfig = {
  rules: ensureAllServiceRules([]),
  refundPolicy: { type: "full_before_window", refundBeforeHours: 24 },
};

// ── MOVED VERBATIM, AND THAT IS DELIBERATE ────────────────────────────────
//
// These two decide what a customer is asked to pay, so this change moves them
// and does not improve them. Writing them fresh from their signatures produced
// three silent differences on the first attempt — a rounding step on fixed
// amounts, an enabled check the original does not make, and the precedence
// backwards — any of which would have altered a real charge while the commit
// message said the logic was unchanged.
//
// The ONE difference from the original is the removed default parameter:
// `rules: DepositRuleSet = defaultDepositRules`. That default was the money bug
// itself — a caller that forgot to pass the facility's rules silently priced
// the deposit off the seed file. It is now required.

/**
 * What this rule asks for on a booking of this size.
 *
 * A fixed amount is returned as entered — it is already the sum the facility
 * typed, and rounding it would be inventing precision it did not ask for.
 */
export function computeDepositAmount(
  rule: DepositRule,
  bookingTotal: number,
): number {
  if (rule.amountType === "percentage") {
    return Math.round(bookingTotal * (rule.amount / 100) * 100) / 100;
  }
  return rule.amount;
}

/**
 * The rule that applies to a booking, or null.
 *
 * A SERVICE rule wins: a facility that has set terms for boarding means them
 * for every boarding stay, and the booking-value rule is the catch-all beneath
 * for services with no term of their own.
 *
 * `amount > 0` as well as `enabled`, because a rule left on at zero asks for
 * nothing and should not shadow the threshold rule underneath it.
 */
export function findApplicableDepositRule(
  service: string | undefined,
  bookingTotal: number,
  rules: DepositRuleSet,
): DepositRule | null {
  const enabled = rules.filter((rule) => rule.enabled && rule.amount > 0);

  if (service) {
    const serviceRule = enabled.find(
      (rule) => rule.scope === "service" && rule.serviceType === service,
    );
    if (serviceRule) return serviceRule;
  }

  const thresholdRule = enabled.find(
    (rule) =>
      rule.scope === "booking_value" &&
      typeof rule.minBookingValue === "number" &&
      bookingTotal >= rule.minBookingValue,
  );
  return thresholdRule ?? null;
}

export type { DepositRule, DepositRuleSet, DepositRefundPolicy };
