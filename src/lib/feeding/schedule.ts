import {
  activeDays,
  hasCheckoutDay,
  isActiveOn,
  type MedStay,
} from "@/lib/medications/schedule";

import type { FeedingPlan, PlanFood, PlanMeal } from "./plan";

// ============================================================================
// Which meals a feeding plan serves, on which days of the stay, and how much
// food that takes — ONE place, because the Feeding step's panel and summaries,
// the server pricing house food, the booking page, the checkout care gate and
// the daily care board have to agree.
// ============================================================================

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A clock time `HH:MM` — a half-typed one is not a meal yet. */
export function isClock(value: string | undefined): boolean {
  return CLOCK.test(value ?? "");
}

/** The meals with a time, in the order of the day. */
export function sortedMeals<T extends { time: string }>(
  meals: readonly T[],
): T[] {
  return meals
    .filter((meal) => isClock(meal.time))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * The meals a food is served at. A food served at "every meal" — or whose
 * chosen meals have all been taken off — is served at every meal there is.
 */
export function servedMealIds(
  food: { servedAt?: readonly string[] | null },
  meals: readonly { id: string }[],
): string[] {
  const ids = meals.map((meal) => meal.id);
  if (!food.servedAt || food.servedAt.length === 0) return ids;
  const kept = food.servedAt.filter((id) => ids.includes(id));
  return kept.length > 0 ? kept : ids;
}

/** The days of `stay` a plan is served on. */
export function planDays(
  plan: Pick<FeedingPlan, "dayRule" | "certainDays">,
  stay: MedStay,
): string[] {
  return activeDays(
    { dayRule: plan.dayRule, specificDays: plan.certainDays },
    stay,
  );
}

/** Meals over the stay: days served × meals a day. */
export function totalMeals(plan: FeedingPlan, stay: MedStay): number {
  return planDays(plan, stay).length * sortedMeals(plan.meals).length;
}

/** How many times one food is served over the stay. */
export function foodServings(
  plan: FeedingPlan,
  food: PlanFood,
  stay: MedStay,
): number {
  return (
    planDays(plan, stay).length *
    servedMealIds(food, sortedMeals(plan.meals)).length
  );
}

export interface PackingRow {
  food: PlanFood;
  /** Portions over the stay. */
  servings: number;
  /** Portions packed beyond the stay, in case pickup is late. */
  extra: number;
  /** (servings + extra) × the portion, in the food's unit. */
  total: number;
}

/**
 * What the owner packs: each of their own foods the stay serves, and the
 * facility's extra meals' worth of each (Settings › Feeding & medications).
 */
export function packingList(
  plan: FeedingPlan,
  stay: MedStay,
  extraMeals = 0,
): PackingRow[] {
  return plan.foods.flatMap((food) => {
    if (food.source !== "own") return [];
    const servings = foodServings(plan, food, stay);
    if (servings <= 0) return [];
    const extra = Math.max(0, Math.floor(extraMeals));
    return [
      {
        food,
        servings,
        extra,
        total: Math.round((servings + extra) * food.amount * 100) / 100,
      },
    ];
  });
}

export interface FeedingDayRow {
  day: string;
  tag: "check_in" | "checkout" | null;
  meals: { meal: PlanMeal; foods: PlanFood[] }[];
}

/**
 * One row per day of the stay, each meal that day with the foods served at
 * it — the panel beside the Feeding step. No plan is a stay with no meals.
 */
export function feedingRows(
  plan: FeedingPlan | null,
  stay: MedStay,
): FeedingDayRow[] {
  const checkout = hasCheckoutDay(stay);
  const meals = plan ? sortedMeals(plan.meals) : [];
  return stay.days.map((day, index) => {
    const served =
      plan &&
      isActiveOn(
        { dayRule: plan.dayRule, specificDays: plan.certainDays },
        day,
        stay,
      );
    return {
      day,
      tag: !checkout
        ? null
        : index === 0
          ? "check_in"
          : index === stay.days.length - 1
            ? "checkout"
            : null,
      meals:
        served && plan
          ? meals.map((meal) => ({
              meal,
              foods: plan.foods.filter((food) =>
                servedMealIds(food, meals).includes(meal.id),
              ),
            }))
          : [],
    };
  });
}
