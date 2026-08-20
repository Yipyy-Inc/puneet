import { z } from "zod";

import {
  customFeeSchema,
  exceed24HourFeeSchema,
  groomingConditionAdjustmentSchema,
  latePickupFeeSchema,
  multiNightDiscountSchema,
  multiPetDiscountRuleSchema,
  peakSurchargeSchema,
  roomTypeAdjustmentSchema,
  serviceBundleRuleSchema,
} from "@/types/boarding";

// ============================================================================
// A facility's pricing rules — the surcharges and discounts it applies.
//
// ── WHERE THESE USED TO LIVE, AND WHY THAT WAS A MONEY BUG ────────────────
//
// `localStorage`, under `settings-pricing-rules`. So the late-pickup fee a
// facility configured at the front desk did not exist on the manager's laptop,
// did not exist on the tablet by the kennels, and vanished with a cache clear.
// Every device charged whatever its own browser happened to remember.
//
// Nobody noticed because `getStoredPricingRules()` fell back to
// `data/facility-config.ts`, which ships an ENABLED late-pickup fee — $10 per
// 30 minutes after a 15-minute grace, capped at $50. A browser that had never
// seen the settings screen still charged it. The rules looked like they worked
// everywhere precisely because the fixture was doing the work.
//
// Found on 2026-08-20 by dashboard-live-board.spec.ts, which asserts a late fee
// reaches the bill.
//
// ── THE FALLBACK IS EMPTY, AND THAT IS THE WHOLE POINT ────────────────────
//
// Same decision as `NO_TAX` in lib/settings/tax.ts, for the same reason, and it
// is worth stating plainly because it CHANGES BEHAVIOUR: a facility that has
// never opened the pricing screen now applies no fees at all, where before it
// applied the fixture's.
//
// Carrying the fixture forward would mean every facility on the platform
// charging a $10 late fee that nobody at that business ever agreed to — a
// number invented by a seed file, taken from a real customer's card. A fee that
// is not charged until it is configured is a missing feature. A fee that is
// charged because a fixture said so is a facility overcharging its customers
// without knowing it, and the second is much worse than the first.
//
// `configured: false` travels with the value, so a screen can say "not set up
// yet" rather than presenting emptiness as a decision.
//
// ── THE RULE SHAPES ARE NOT REDEFINED HERE ────────────────────────────────
//
// Every one of these already had a zod schema in types/boarding.ts, which is
// where the editor validates them. Composing those is the only way the stored
// shape and the edited shape cannot drift apart.
// ============================================================================

export const pricingRulesSchema = z.object({
  /**
   * `best_only` applies the single largest discount; `apply_all_sequence`
   * applies every matching one in turn. Defaulted rather than required so a
   * stored blob written before this field existed still parses.
   */
  discountStacking: z
    .enum(["best_only", "apply_all_sequence"])
    .default("best_only"),
  multiPetDiscounts: z.array(multiPetDiscountRuleSchema).default([]),
  latePickupFees: z.array(latePickupFeeSchema).default([]),
  exceed24Hour: exceed24HourFeeSchema.default({
    id: "exceed-24h",
    enabled: false,
    amount: 0,
    scope: "per_pet",
  }),
  customFees: z.array(customFeeSchema).default([]),
  multiNightDiscounts: z.array(multiNightDiscountSchema).default([]),
  peakDateSurcharges: z.array(peakSurchargeSchema).default([]),
  roomTypeAdjustments: z.array(roomTypeAdjustmentSchema).default([]),
  groomingConditionAdjustments: z
    .array(groomingConditionAdjustmentSchema)
    .default([]),
  serviceBundles: z.array(serviceBundleRuleSchema).default([]),
});

export type PricingRules = z.infer<typeof pricingRulesSchema>;

/**
 * No fees, no discounts — what a facility charges before it decides otherwise.
 *
 * Built by parsing `{}` through the schema rather than written out by hand, so
 * it cannot fall behind when a rule family is added: a new array gets its
 * `.default([])` and appears here automatically.
 */
export const NO_PRICING_RULES: PricingRules = pricingRulesSchema.parse({});
