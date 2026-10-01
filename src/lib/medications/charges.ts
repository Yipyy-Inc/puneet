import {
  feedingFeeApplies,
  medicationFeeApplies,
  type CareFees,
} from "@/lib/settings/care-fees";
import {
  providedFor,
  type MedicationInstructions,
  type ProvidedPer,
} from "@/lib/settings/medication-instructions";
import {
  recordHouseFoodCharges,
  type HouseFoodSettings,
} from "@/lib/feeding/charges";
import { round2 } from "@/lib/medications/dose";
import {
  activeDays,
  doseCount,
  type MedStay,
} from "@/lib/medications/schedule";
import type { ProvidableMethod } from "@/lib/medications/vocabulary";
import type { HouseFoodPricing } from "@/lib/settings/feeding-instructions";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";

// ============================================================================
// What a booking's medications and meals add to its bill (2026-10-01).
//
// ── LINES ON THE BILL, NOT MONEY IN THE PRICE ─────────────────────────────
//
// These were added into `total_cost`, so an invoice never showed them and a
// customer's request carrying one could never be confirmed automatically —
// the server prices the SERVICE, and the quote no longer matched. The booking
// form shows them now and the server writes each as a `fee` line, worked out
// here, by the same function, so the two cannot disagree.
//
// ── ONCE PER REQUEST, AND PER BOOKING ─────────────────────────────────────
//
// The form splits one request into several bookings (a daycare booking per
// day, a boarding one per room), and every booking carries the whole
// medication list. So the medication fee and the meals fee are worked out ONCE,
// over the request, and land on its first booking. What the facility supplies
// — pill pockets, and house food (2026-10-01) — is counted per booking, over
// that booking's own days and pets, and the parts add up to what the form
// showed for the whole.
//
// The meals fee "per meal" counts every meal served over the request — meal
// times × the days each plan is served — not one day's meals, which is what it
// counted until feeding had days of its own (2026-10-01).
//
// ── ONE LINE PER THING SUPPLIED ───────────────────────────────────────────
//
// `care:provided:pill_pocket`, not one line per medication: the fees report
// groups lines by `fee_id`, and a key with a medication's random id in it would
// split it into a row per medication on every booking.
// ============================================================================

export interface CarePart {
  stay: MedStay;
  medications: MedicationItem[];
  /** This booking's pets' feeding plans, over its own days. */
  feeding?: FeedingScheduleItem[];
}

export interface CareChargeLine {
  feeId: string;
  kind: "medication_fee" | "meals" | "provided" | "house_food";
  /** For `provided`: what is supplied. */
  method?: ProvidableMethod;
  /** For `house_food`: which, and the facility's own name for it. */
  houseFoodId?: string;
  label?: string;
  per?: ProvidedPer | HouseFoodPricing;
  quantity: number;
  unitPrice: number;
  amount: number;
  /**
   * Goods (what is supplied) are taxed like any extra; the medication fee and
   * meals sat inside the service's price until now, so they follow its tax.
   */
  taxedAs: "goods" | "service";
}

export const MEDICATION_FEE_ID = "care:medication-fee";
export const MEALS_FEE_ID = "care:meals";
export const providedFeeId = (method: string) => `care:provided:${method}`;
export const houseFoodFeeId = (houseFoodId: string) =>
  `care:house-food:${houseFoodId}`;

/** Every care fee id starts with this, and nothing else's does. */
export const CARE_FEE_PREFIX = "care:";

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * The charge for what the facility supplies for one medication, over `stay`
 * — or `null` when it supplies nothing for it. A waived one is returned too,
 * marked, so a screen can show what was waived.
 */
export function providedCharge(
  item: MedicationItem,
  stay: MedStay,
  settings: Pick<MedicationInstructions, "provided">,
): {
  method: ProvidableMethod;
  per: ProvidedPer;
  quantity: number;
  unitPrice: number;
  amount: number;
  waived: boolean;
} | null {
  if (!item.facilityProvidesMedAid) return null;
  const supplied = providedFor(settings, item.facilityMedAidItem);
  if (!supplied) return null;
  const quantity =
    supplied.per === "day"
      ? activeDays(item, stay).length
      : doseCount(item, stay);
  // In cents, as the bill's line stores it, so the form and the line agree.
  const unitPrice = round2(supplied.price);
  return {
    method: supplied.method,
    per: supplied.per,
    quantity,
    unitPrice,
    amount: round2(quantity * unitPrice),
    waived: item.aidWaived === true,
  };
}

/**
 * The care charges of one request, per part, in the parts' order. The first
 * part carries the once-per-request fees; give the first part that is not
 * cancelled first.
 */
export function careChargeLines(input: {
  fees: CareFees;
  settings: Pick<MedicationInstructions, "provided">;
  /** The facility's house food. None: nothing to charge for it. */
  feedingSettings?: HouseFoodSettings;
  service: string;
  parts: CarePart[];
}): CareChargeLine[][] {
  const lines: CareChargeLine[][] = input.parts.map(() => []);
  if (input.parts.length === 0) return lines;

  // ── Once per request ────────────────────────────────────────────────────
  const medications = uniqueById(
    input.parts.flatMap((part) => part.medications),
  );
  if (
    medications.length > 0 &&
    medicationFeeApplies(input.fees, input.service)
  ) {
    const { scope } = input.fees.medicationAdmin;
    const amount = round2(input.fees.medicationAdmin.amount);
    const quantity =
      scope === "per_medication"
        ? medications.length
        : scope === "per_pet"
          ? new Set(medications.map((m) => m.petId)).size || 1
          : 1;
    lines[0].push({
      feeId: MEDICATION_FEE_ID,
      kind: "medication_fee",
      quantity,
      unitPrice: amount,
      amount: round2(quantity * amount),
      taxedAs: "service",
    });
  }

  // Every meal served over the request: each part's plans over its own days.
  let meals = 0;
  const fedPets = new Set<number | undefined>();
  for (const part of input.parts) {
    for (const item of uniqueById(part.feeding ?? [])) {
      const served = mealsADay(item) * activeDays(item, part.stay).length;
      if (served <= 0) continue;
      meals += served;
      fedPets.add(item.petId);
    }
  }
  if (meals > 0 && feedingFeeApplies(input.fees, input.service)) {
    const { scope } = input.fees.daycareFeeding;
    const amount = round2(input.fees.daycareFeeding.amount);
    const quantity =
      scope === "per_pet"
        ? fedPets.size || 1
        : scope === "per_meal"
          ? meals
          : 1;
    lines[0].push({
      feeId: MEALS_FEE_ID,
      kind: "meals",
      quantity,
      unitPrice: amount,
      amount: round2(quantity * amount),
      taxedAs: "service",
    });
  }

  // ── Per part: what the facility supplies ──────────────────────────────
  input.parts.forEach((part, index) => {
    const byMethod = new Map<
      ProvidableMethod,
      { quantity: number; unitPrice: number; per: ProvidedPer }
    >();
    for (const item of uniqueById(part.medications)) {
      const charge = providedCharge(item, part.stay, input.settings);
      if (!charge || charge.waived || charge.quantity <= 0) continue;
      const sum = byMethod.get(charge.method);
      byMethod.set(charge.method, {
        quantity: (sum?.quantity ?? 0) + charge.quantity,
        unitPrice: charge.unitPrice,
        per: charge.per,
      });
    }
    for (const [method, sum] of byMethod) {
      lines[index].push({
        feeId: providedFeeId(method),
        kind: "provided",
        method,
        per: sum.per,
        quantity: sum.quantity,
        unitPrice: sum.unitPrice,
        amount: round2(sum.quantity * sum.unitPrice),
        taxedAs: "goods",
      });
    }

    // House food: one line per house food, summed over the part's pets.
    if (!input.feedingSettings) return;
    const byFood = new Map<
      string,
      {
        label: string;
        per: HouseFoodPricing;
        quantity: number;
        unitPrice: number;
      }
    >();
    for (const item of uniqueById(part.feeding ?? [])) {
      for (const charge of recordHouseFoodCharges(
        item,
        part.stay,
        input.feedingSettings,
        input.service,
      )) {
        if (charge.waived || charge.included || charge.quantity <= 0) continue;
        const sum = byFood.get(charge.houseFoodId);
        byFood.set(charge.houseFoodId, {
          label: charge.name,
          per: charge.per,
          quantity: (sum?.quantity ?? 0) + charge.quantity,
          unitPrice: charge.unitPrice,
        });
      }
    }
    for (const [houseFoodId, sum] of byFood) {
      lines[index].push({
        feeId: houseFoodFeeId(houseFoodId),
        kind: "house_food",
        houseFoodId,
        label: sum.label,
        per: sum.per,
        quantity: sum.quantity,
        unitPrice: sum.unitPrice,
        amount: round2(sum.quantity * sum.unitPrice),
        taxedAs: "goods",
      });
    }
  });

  return lines;
}

/** A plan's meals a day: its occasions with a time, each time once. */
function mealsADay(item: FeedingScheduleItem): number {
  const occasions = Array.isArray(item.occasions) ? item.occasions : [];
  return new Set(
    occasions
      .map((occasion) => occasion?.time)
      .filter(
        (time): time is string => typeof time === "string" && time !== "",
      ),
  ).size;
}

/** Every line of a request, flattened — what the booking form shows. */
export function careChargeTotal(lines: CareChargeLine[][]): number {
  return round2(lines.flat().reduce((sum, line) => sum + line.amount, 0));
}
