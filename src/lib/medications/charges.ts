import { feedingFeeApplies, type CareFees } from "@/lib/settings/care-fees";
import {
  injectionFeeApplies,
  isCustomMethod,
  medicationFeeApplies,
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
import { pageFormOf } from "@/lib/medications/vocabulary";
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
// ── THE ADMINISTRATION FEE COUNTS THE STAY ────────────────────────────────
//
// Per dose, per pet per day, or per medication per day (2026-10-01, the
// client's settings page): every part's own days, summed over the request.
// Injections add their own fee per injection given, on top. Both apply only
// where the facility's Medications step appears for the service.
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
  kind:
    | "medication_fee"
    | "injection_fee"
    | "meals"
    | "provided"
    | "house_food";
  /** For `provided`: what is supplied — the vocabulary's, or the facility's own. */
  method?: string;
  /** For `house_food`: which. */
  houseFoodId?: string;
  /**
   * The facility's own name for a house food or a way of giving it added;
   * empty for the vocabulary's, which a screen names in its reader's words.
   */
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
export const INJECTION_FEE_ID = "care:injection-fee";
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
  settings: Pick<MedicationInstructions, "methods">,
): {
  method: string;
  /** The facility's name for its own way of giving; empty for the vocabulary's. */
  label: string;
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
    method: supplied.id,
    label: isCustomMethod(supplied.id)
      ? supplied.label?.trim() || item.methodLabel?.trim() || ""
      : "",
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
  /** The daycare meals fee. */
  fees: CareFees;
  /** The administration and injection fees, and what the facility sells. */
  settings: Pick<
    MedicationInstructions,
    "methods" | "fee" | "services" | "forms"
  >;
  /** The facility's house food. None: nothing to charge for it. */
  feedingSettings?: HouseFoodSettings;
  service: string;
  parts: CarePart[];
}): CareChargeLine[][] {
  const lines: CareChargeLine[][] = input.parts.map(() => []);
  if (input.parts.length === 0) return lines;

  // ── Once per request ────────────────────────────────────────────────────
  const quantity = medicationFeeQuantity(input.parts, input.settings.fee.mode);
  if (quantity > 0 && medicationFeeApplies(input.settings, input.service)) {
    const amount = round2(input.settings.fee.amount);
    lines[0].push({
      feeId: MEDICATION_FEE_ID,
      kind: "medication_fee",
      quantity,
      unitPrice: amount,
      amount: round2(quantity * amount),
      taxedAs: "service",
    });
  }

  // Every injection given over the request, on top of the fee above.
  const injections = input.parts.reduce(
    (sum, part) =>
      sum +
      uniqueById(part.medications)
        .filter((item) => pageFormOf(item.form) === "injection")
        .reduce((doses, item) => doses + doseCount(item, part.stay), 0),
    0,
  );
  if (injections > 0 && injectionFeeApplies(input.settings, input.service)) {
    const amount = round2(input.settings.fee.injection);
    lines[0].push({
      feeId: INJECTION_FEE_ID,
      kind: "injection_fee",
      quantity: injections,
      unitPrice: amount,
      amount: round2(injections * amount),
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
      string,
      { label: string; quantity: number; unitPrice: number; per: ProvidedPer }
    >();
    for (const item of uniqueById(part.medications)) {
      const charge = providedCharge(item, part.stay, input.settings);
      if (!charge || charge.waived || charge.quantity <= 0) continue;
      const sum = byMethod.get(charge.method);
      byMethod.set(charge.method, {
        label: charge.label,
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
        ...(sum.label ? { label: sum.label } : {}),
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

/**
 * What the administration fee counts over the request: doses, days a pet is
 * given something, or days each medication is given — each part over its own
 * days and pets.
 */
function medicationFeeQuantity(
  parts: CarePart[],
  mode: MedicationInstructions["fee"]["mode"],
): number {
  if (mode === "none") return 0;
  let quantity = 0;
  for (const part of parts) {
    const items = uniqueById(part.medications);
    if (mode === "dose") {
      quantity += items.reduce(
        (sum, item) => sum + doseCount(item, part.stay),
        0,
      );
    } else if (mode === "med_day") {
      quantity += items.reduce(
        (sum, item) => sum + activeDays(item, part.stay).length,
        0,
      );
    } else {
      // A pet given anything that day is one pet-day, however many medications.
      const daysByPet = new Map<number | undefined, Set<string>>();
      for (const item of items) {
        const days = daysByPet.get(item.petId) ?? new Set<string>();
        for (const day of activeDays(item, part.stay)) days.add(day);
        daysByPet.set(item.petId, days);
      }
      for (const days of daysByPet.values()) quantity += days.size;
    }
  }
  return quantity;
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
