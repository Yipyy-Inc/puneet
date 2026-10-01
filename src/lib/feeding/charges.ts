import { round2 } from "@/lib/medications/dose";
import { activeDays, type MedStay } from "@/lib/medications/schedule";
import {
  houseFoodFor,
  houseFoodIncluded,
  houseFoodPrice,
  type FeedingInstructions,
  type HouseFoodPricing,
} from "@/lib/settings/feeding-instructions";
import type { FeedingScheduleItem } from "@/types/booking";

import { servedMealIds, sortedMeals } from "./schedule";

// ============================================================================
// What a facility's house food adds to a booking (2026-10-01): per meal or per
// day, as the facility prices it in Settings › Care tasks — unless it comes
// with the service, or staff waived it. A line on the bill, written by the
// server with the same arithmetic the booking form quotes it with.
// ============================================================================

export type HouseFoodSettings = Pick<
  FeedingInstructions,
  "houseFoods" | "pricing" | "includedWith"
>;

/** What one house food costs over one pet's days. */
export interface HouseFoodCharge {
  houseFoodId: string;
  /** The facility's own name for it. */
  name: string;
  per: HouseFoodPricing;
  /** Meals or days. */
  quantity: number;
  unitPrice: number;
  /** Nothing when included or waived. */
  amount: number;
  /** Comes with the service, or priced at nothing. */
  included: boolean;
  waived: boolean;
}

interface FoodLike {
  id: string;
  source: string;
  houseFoodId?: string;
  servedAt?: readonly string[] | null;
}

interface PlanLike {
  meals: readonly { id: string; time: string }[];
  /** Days served. */
  days: number;
  foods: readonly FoodLike[];
  waivedFoods: readonly string[];
}

/** One food's charge, as its summary box shows it — or `null` for the owner's. */
export function foodCharge(
  food: FoodLike,
  plan: Pick<PlanLike, "meals" | "days">,
  settings: HouseFoodSettings,
  service: string,
): Omit<HouseFoodCharge, "waived"> | null {
  if (food.source !== "house") return null;
  const house = houseFoodFor(settings, food.houseFoodId);
  if (!house) return null;
  const meals = sortedMeals(plan.meals);
  const served = servedMealIds(food, meals).length;
  const quantity =
    settings.pricing === "day"
      ? served > 0
        ? plan.days
        : 0
      : plan.days * served;
  // In cents, as the bill's line stores it, so the form and the line agree.
  const unitPrice = round2(houseFoodPrice(settings, house));
  const included = houseFoodIncluded(settings, service) || unitPrice <= 0;
  return {
    houseFoodId: house.id,
    name: house.name,
    per: settings.pricing,
    quantity,
    unitPrice,
    amount: included ? 0 : round2(quantity * unitPrice),
    included,
  };
}

/**
 * One pet's house food, per house food: the meals it is served at, or the days
 * it is served on — a day counted once even when two of the pet's foods are
 * the same house food. Waived foods are counted apart, so a screen can show
 * what was waived.
 */
export function houseFoodCharges(
  plan: PlanLike,
  settings: HouseFoodSettings,
  service: string,
): HouseFoodCharge[] {
  const meals = sortedMeals(plan.meals);
  const groups = new Map<
    string,
    { charge: Omit<HouseFoodCharge, "waived">; waived: boolean; served: number }
  >();
  for (const food of plan.foods) {
    const charge = foodCharge(
      food,
      { meals, days: plan.days },
      settings,
      service,
    );
    if (!charge) continue;
    const waived = plan.waivedFoods.includes(food.id);
    const key = `${charge.houseFoodId}:${waived}`;
    const served = servedMealIds(food, meals).length;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { charge, waived, served });
      continue;
    }
    existing.served += served;
    existing.charge.quantity =
      settings.pricing === "day"
        ? existing.served > 0
          ? plan.days
          : 0
        : plan.days * existing.served;
    existing.charge.amount = existing.charge.included
      ? 0
      : round2(existing.charge.quantity * existing.charge.unitPrice);
  }
  return [...groups.values()].map(({ charge, waived }) => ({
    ...charge,
    amount: waived ? 0 : charge.amount,
    waived,
  }));
}

/** A booked plan's house-food charges over `stay`. */
export function recordHouseFoodCharges(
  item: FeedingScheduleItem,
  stay: MedStay,
  settings: HouseFoodSettings,
  service: string,
): HouseFoodCharge[] {
  const foods = Array.isArray(item.foods) ? item.foods : [];
  if (!foods.some((food) => food?.source === "house")) return [];
  const meals = Array.isArray(item.occasions)
    ? item.occasions.filter(
        (occasion) => Boolean(occasion) && typeof occasion.id === "string",
      )
    : [];
  return houseFoodCharges(
    {
      meals: meals.map((occasion) => ({
        id: occasion.id,
        time: typeof occasion.time === "string" ? occasion.time : "",
      })),
      days: activeDays(item, stay).length,
      foods: foods.filter(
        (food) => Boolean(food) && typeof food.id === "string",
      ),
      waivedFoods: Array.isArray(item.waivedFoods) ? item.waivedFoods : [],
    },
    settings,
    service,
  );
}
