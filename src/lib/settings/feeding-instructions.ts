import { z } from "zod";

import {
  DEFAULT_MEAL_TIMES,
  FEED_UNITS,
  FEEDING_DAY_RULES,
  FOOD,
  FOOD_TYPES,
  MEAL_SLOTS,
  type MealSlot,
} from "@/lib/feeding/vocabulary";

// ============================================================================
// What the booking form's Feeding step shows, decided by the facility
// (2026-10-01). Settings › Care tasks › Feeding instructions.
//
// ── THE CHOICES ARE SWITCHES, NOT WORDS ───────────────────────────────────
//
// The page's kinds of food, meal times and day options are a fixed vocabulary
// (lib/feeding/vocabulary.ts): each has a translation and an id stored on
// bookings. The facility turns them on and off and moves a meal time. Until
// 2026-10-01 this domain held nine lists of words the facility typed — in one
// language, read by a form that could not translate them — and no facility
// had saved one, so nothing stored is lost by the new shape.
//
// ── WHAT IT FEEDS IS PRICED HERE ──────────────────────────────────────────
//
// The facility's house foods, each priced per meal and per day, charged as a
// line on the booking's bill in the mode the facility picks — or included
// with a service. The fallback has no house food: like every money domain,
// nothing is charged until a facility says so.
// ============================================================================

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const price = z.number().min(0).max(1000);

export const HOUSE_FOOD_PRICING = ["meal", "day"] as const;
export type HouseFoodPricing = (typeof HOUSE_FOOD_PRICING)[number];

/** The services a house food can come included with. */
export const FEEDING_SERVICES = ["boarding", "daycare"] as const;
export type FeedingService = (typeof FEEDING_SERVICES)[number];

const houseFoodSchema = z
  .object({
    id: z.string().regex(/^hf-[A-Za-z0-9-]{1,64}$/),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(120),
    type: z.enum(FOOD_TYPES),
    unit: z.enum(FEED_UNITS),
    pricePerMeal: price,
    pricePerDay: price,
  })
  // A house food is measured the way its kind of food is.
  .refine((food) => FOOD[food.type].units.includes(food.unit));
export type HouseFood = z.infer<typeof houseFoodSchema>;

const mealSlotSchema = z.object({
  id: z.enum(MEAL_SLOTS),
  enabled: z.boolean(),
  time: clockTime,
});

/** The parts of the page a facility can leave out. */
export const FEEDING_PAGE_PARTS = [
  "brand",
  "packing",
  "prep",
  "styles",
  "habits",
  "skip",
  "treats",
  "allergies",
  "notes",
  "saveToProfile",
] as const;
export type FeedingPagePart = (typeof FEEDING_PAGE_PARTS)[number];

const unique = <T>(values: T[]) => new Set(values).size === values.length;

export const feedingInstructionsSchema = z
  .object({
    foodTypes: z.array(z.enum(FOOD_TYPES)).min(1).refine(unique),
    meals: z
      .array(mealSlotSchema)
      .max(MEAL_SLOTS.length)
      .refine((slots) => unique(slots.map((slot) => slot.id))),
    customTimes: z.boolean(),
    dayRules: z.array(z.enum(FEEDING_DAY_RULES)).min(1).refine(unique),
    houseFoods: z
      .array(houseFoodSchema)
      .max(30)
      .refine((foods) => unique(foods.map((food) => food.id))),
    pricing: z.enum(HOUSE_FOOD_PRICING),
    includedWith: z.array(z.enum(FEEDING_SERVICES)).refine(unique),
    show: z.object({
      brand: z.boolean(),
      packing: z.boolean(),
      prep: z.boolean(),
      styles: z.boolean(),
      habits: z.boolean(),
      skip: z.boolean(),
      treats: z.boolean(),
      allergies: z.boolean(),
      notes: z.boolean(),
      saveToProfile: z.boolean(),
    }),
  })
  // A page with no way to pick a meal time could never plan a meal.
  .refine(
    (value) => value.customTimes || value.meals.some((slot) => slot.enabled),
    { message: "Offer at least one meal time, or custom times." },
  );

export type FeedingInstructions = z.infer<typeof feedingInstructionsSchema>;

/**
 * The client's design, whole: every kind of food, the four meal times, custom
 * times, all three day options, every part of the page — and no house food,
 * so nothing charged.
 */
export const SHIPPED_FEEDING_INSTRUCTIONS: FeedingInstructions = {
  foodTypes: [...FOOD_TYPES],
  meals: MEAL_SLOTS.map((id) => ({
    id,
    enabled: true,
    time: DEFAULT_MEAL_TIMES[id],
  })),
  customTimes: true,
  dayRules: [...FEEDING_DAY_RULES],
  houseFoods: [],
  pricing: "meal",
  includedWith: [],
  show: {
    brand: true,
    packing: true,
    prep: true,
    styles: true,
    habits: true,
    skip: true,
    treats: true,
    allergies: true,
    notes: true,
    saveToProfile: true,
  },
};

/** The meal times the page offers, in the order of the day. */
export function offeredMealSlots(
  settings: Pick<FeedingInstructions, "meals">,
): { id: MealSlot; time: string }[] {
  return settings.meals
    .filter((slot) => slot.enabled)
    .map(({ id, time }) => ({ id, time }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** A meal time's clock time here, whether or not the page offers it now. */
export function mealSlotTime(
  settings: Pick<FeedingInstructions, "meals">,
  slot: MealSlot,
): string {
  return (
    settings.meals.find((candidate) => candidate.id === slot)?.time ??
    DEFAULT_MEAL_TIMES[slot]
  );
}

/** The house food with this id, or none. */
export function houseFoodFor(
  settings: Pick<FeedingInstructions, "houseFoods">,
  id: string | undefined,
): HouseFood | undefined {
  if (!id) return undefined;
  return settings.houseFoods.find((food) => food.id === id);
}

/** What one meal or one day of a house food costs, in the facility's mode. */
export function houseFoodPrice(
  settings: Pick<FeedingInstructions, "pricing">,
  food: HouseFood,
): number {
  return settings.pricing === "day" ? food.pricePerDay : food.pricePerMeal;
}

/** House food comes with this service, at no extra charge. */
export function houseFoodIncluded(
  settings: Pick<FeedingInstructions, "includedWith">,
  service: string | undefined,
): boolean {
  return (settings.includedWith as readonly string[]).includes(service ?? "");
}
