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
  medicationAids: z.object({
    enabled: z.boolean(),
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          name: z.string().trim().min(1).max(80),
          fee: money,
        }),
      )
      .max(30),
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
export type MedicationAid = CareFees["medicationAids"]["items"][number];

export const NO_CARE_FEES: CareFees = {
  medicationAdmin: {
    enabled: false,
    amount: 0,
    scope: "per_medication",
    services: ["boarding", "daycare"],
  },
  medicationAids: { enabled: false, items: [] },
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

/** The aids a customer may choose, or none when the facility offers none. */
export function offeredMedicationAids(fees: CareFees): MedicationAid[] {
  return fees.medicationAids.enabled ? fees.medicationAids.items : [];
}

/**
 * The fee lines a booking's medications and feeding add to its bill.
 *
 * One function, so the booking form's total and anything that re-prices the
 * booking later cannot disagree about it. Labels are the caller's: they are
 * words a person reads, in the reader's language.
 */
export function careFeeLines(
  fees: CareFees,
  input: {
    service: string;
    medications: { petId?: number; facilityMedAidItem?: string | null }[];
    feedingPetIds: (number | undefined)[];
    feedingMeals: number;
  },
): {
  medicationAdmin: number;
  aids: { item: MedicationAid; amount: number }[];
  feeding: number;
} {
  let medicationAdmin = 0;
  if (
    input.medications.length > 0 &&
    medicationFeeApplies(fees, input.service)
  ) {
    const { amount, scope } = fees.medicationAdmin;
    if (scope === "per_medication") {
      medicationAdmin = amount * input.medications.length;
    } else if (scope === "per_pet") {
      medicationAdmin =
        amount * (new Set(input.medications.map((m) => m.petId)).size || 1);
    } else {
      medicationAdmin = amount;
    }
  }

  const offered = offeredMedicationAids(fees);
  const aids = input.medications.flatMap((m) => {
    const item = offered.find((i) => i.id === m.facilityMedAidItem);
    return item && item.fee > 0 ? [{ item, amount: item.fee }] : [];
  });

  let feeding = 0;
  if (input.feedingMeals > 0 && feedingFeeApplies(fees, input.service)) {
    const { amount, scope } = fees.daycareFeeding;
    if (scope === "per_pet") {
      feeding = amount * (new Set(input.feedingPetIds).size || 1);
    } else if (scope === "per_meal") {
      feeding = amount * input.feedingMeals;
    } else {
      feeding = amount;
    }
  }

  return { medicationAdmin, aids, feeding };
}
