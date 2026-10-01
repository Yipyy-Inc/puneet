import { z } from "zod";

// ============================================================================
// What a facility charges for feeding at daycare.
//
// ── WHERE THIS USED TO LIVE, AND WHY IT WAS A MONEY BUG ───────────────────
//
// `facilityConfig.serviceFees` in src/data/facility-config.ts — one fixture for
// every facility on the platform. The New booking form added its $5 per
// medication and $5 per pet fed at daycare to REAL bookings at every business,
// and no screen anywhere could change or remove them.
//
// ── THE FALLBACK IS NO FEES, AND THAT CHANGES BEHAVIOUR ───────────────────
//
// Same decision as NO_DEPOSITS and NO_PRICING_RULES: a facility that has never
// set these charges nothing for them. None of the fixture's numbers was agreed
// to by a business.
//
// ── NO MEDICATION FEE HERE SINCE 2026-10-01 ───────────────────────────────
//
// The administration fee, and what a facility supplies to give a medication
// with, are priced with the rest of the Medications step on Settings ›
// Services › Feeding & medications (lib/settings/medication-instructions.ts).
// No facility had set either here. A stored `medicationAdmin` or
// `medicationAids` key is dropped when the row is read, like any key the
// schema no longer names.
//
// ── THE FEES ARE LINES ON THE BILL ────────────────────────────────────────
//
// Worked out by `careChargeLines` (lib/medications/charges.ts), shown by the
// booking form and written by the server as `fee` lines — no longer folded
// into `total_cost`.
// ============================================================================

const money = z.number().min(0).max(1000);

export const careFeesSchema = z.object({
  daycareFeeding: z.object({
    enabled: z.boolean(),
    amount: money,
    scope: z.enum(["per_pet", "per_meal", "flat"]),
  }),
});

export type CareFees = z.infer<typeof careFeesSchema>;
export type FeedingFeeScope = CareFees["daycareFeeding"]["scope"];

export const NO_CARE_FEES: CareFees = {
  daycareFeeding: { enabled: false, amount: 0, scope: "per_pet" },
};

/** Daycare feeding is charged, at a price above nothing. */
export function feedingFeeApplies(fees: CareFees, service?: string): boolean {
  return (
    service === "daycare" &&
    fees.daycareFeeding.enabled &&
    fees.daycareFeeding.amount > 0
  );
}
