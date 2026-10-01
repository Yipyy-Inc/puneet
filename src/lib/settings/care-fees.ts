import { z } from "zod";

// ============================================================================
// What a facility charges for giving a medication, or for feeding at daycare.
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
// ── NO "MEDICATION AIDS" HERE SINCE 2026-10-01 ────────────────────────────
//
// What a facility supplies to give a medication with — a pill pocket, cheese —
// is priced per dose or per day in the medication instructions
// (lib/settings/medication-instructions.ts), beside the way of giving it
// prices. No facility had set an aid up here. A stored `medicationAids` key is
// dropped when the row is read, like any key the schema no longer names.
//
// ── THE FEES ARE LINES ON THE BILL ────────────────────────────────────────
//
// Worked out by `careChargeLines` (lib/medications/charges.ts), shown by the
// booking form and written by the server as `fee` lines — no longer folded
// into `total_cost`.
// ============================================================================

export const CARE_FEE_SERVICES = [
  "boarding",
  "daycare",
  "grooming",
  "training",
] as const;

const money = z.number().min(0).max(1000);

export const careFeesSchema = z.object({
  medicationAdmin: z.object({
    enabled: z.boolean(),
    amount: money,
    scope: z.enum(["per_medication", "per_pet", "flat"]),
    services: z.array(z.enum(CARE_FEE_SERVICES)),
  }),
  daycareFeeding: z.object({
    enabled: z.boolean(),
    amount: money,
    scope: z.enum(["per_pet", "per_meal", "flat"]),
  }),
});

export type CareFees = z.infer<typeof careFeesSchema>;
export type MedicationFeeScope = CareFees["medicationAdmin"]["scope"];
export type FeedingFeeScope = CareFees["daycareFeeding"]["scope"];

export const NO_CARE_FEES: CareFees = {
  medicationAdmin: {
    enabled: false,
    amount: 0,
    scope: "per_medication",
    services: ["boarding", "daycare"],
  },
  daycareFeeding: { enabled: false, amount: 0, scope: "per_pet" },
};

/** The medication fee applies to this service, at a price above nothing. */
export function medicationFeeApplies(
  fees: CareFees,
  service?: string,
): boolean {
  const fee = fees.medicationAdmin;
  if (!fee.enabled || fee.amount <= 0) return false;
  return !service || fee.services.some((s) => s === service);
}

/** Daycare feeding is charged, at a price above nothing. */
export function feedingFeeApplies(fees: CareFees, service?: string): boolean {
  return (
    service === "daycare" &&
    fees.daycareFeeding.enabled &&
    fees.daycareFeeding.amount > 0
  );
}
