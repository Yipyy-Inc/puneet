import { z } from "zod";

import {
  ALLERGY_PRESET_ID_LIST,
  BUILT_IN_HOUSE_FOODS,
  DEFAULT_MEAL_TIMES,
  EATING_HABITS,
  FEED_UNITS,
  FEEDING_DAY_RULES,
  FEEDING_STYLES,
  FOOD,
  FOOD_TYPES,
  isBuiltInHouseFood,
  MEAL_SLOTS,
  PACKS,
  SKIP_ACTIONS,
} from "@/lib/feeding/vocabulary";

import {
  careOptionSchema,
  careServicesSchema,
  careTimeSchema,
  offeredTimes,
  rowsAreSound,
  unique,
  type CareOption,
  type CareServices,
  type CareTime,
} from "./care-setup";

// ============================================================================
// What the booking form's Feeding step offers, decided by the facility on
// Settings › Services › Feeding & medications (2026-10-01, the client's page).
//
// ── THE CHOICES ARE THE VOCABULARY'S, AND THE FACILITY'S ──────────────────
//
// The kinds of food, packs, meal times and quick picks are the vocabulary in
// lib/feeding/vocabulary.ts — translated, with ids stored on bookings. The
// facility switches them on and off, renames and moves a meal time, adds its
// own meal times and quick picks, and says how much extra food to pack. Until
// 2026-10-01 this domain was edited on Settings › Care tasks; no facility had
// saved it, so nothing stored was reshaped.
//
// ── WHAT IT FEEDS IS PRICED HERE ──────────────────────────────────────────
//
// The facility's house foods, priced per meal or per day, or included in the
// price — a line on the booking's bill. The page comes with three, as the
// design shows them, but house food ships switched OFF: like every money
// domain, nothing is charged until a facility says so.
//
// ── NEW KEYS HAVE DEFAULTS ────────────────────────────────────────────────
//
// `settingsFromRows` replaces a stored row that fails this schema with the
// fallback, silently. Every key here defaults, so a row saved before a key
// existed keeps everything else it says.
// ============================================================================

const price = z.number().min(0).max(1000);

export const HOUSE_FOOD_PRICING = ["included", "meal", "day"] as const;
export type HouseFoodPricing = (typeof HOUSE_FOOD_PRICING)[number];

const houseFoodSchema = z
  .object({
    id: z.string().regex(/^hf-[A-Za-z0-9-]{1,64}$/),
    /** The facility's name — for a built-in food, instead of the translation. */
    name: z.string().trim().max(80).optional(),
    description: z.string().trim().max(120).optional(),
    type: z.enum(FOOD_TYPES),
    unit: z.enum(FEED_UNITS),
    pricePerMeal: price,
    pricePerDay: price,
    on: z.boolean().default(true),
  })
  // A house food is measured the way its kind of food is.
  .refine((food) => FOOD[food.type].units.includes(food.unit), {
    message: "A house food's unit must suit its kind of food.",
  })
  // One the facility added has no translation to fall back on.
  .refine((food) => isBuiltInHouseFood(food.id) || Boolean(food.name), {
    message: "A house food needs a name.",
  });
export type HouseFood = z.infer<typeof houseFoodSchema>;

/** The parts of the page a facility can leave out (More options). */
export const FEEDING_PAGE_PARTS = [
  "brand",
  "prep",
  "treats",
  "notes",
  "saveToProfile",
] as const;
export type FeedingPagePart = (typeof FEEDING_PAGE_PARTS)[number];

/** The quick-pick lists a facility can add to. */
export const FEEDING_OPTION_LISTS = [
  "styles",
  "habits",
  "skip",
  "allergies",
] as const;
export type FeedingOptionList = (typeof FEEDING_OPTION_LISTS)[number];

/** Each list's own vocabulary. */
export const FEEDING_OPTION_VOCABULARY: Record<
  FeedingOptionList,
  readonly string[]
> = {
  styles: FEEDING_STYLES,
  habits: EATING_HABITS,
  skip: SKIP_ACTIONS,
  allergies: ALLERGY_PRESET_ID_LIST,
};

const optionList = (list: FeedingOptionList) =>
  z
    .array(careOptionSchema)
    .max(40)
    .refine((rows) => rowsAreSound(rows, FEEDING_OPTION_VOCABULARY[list]), {
      message: "Each quick pick needs words of its own.",
    });

const allOn = (ids: readonly string[]): CareOption[] =>
  ids.map((id) => ({ id, on: true }));

/** The design's meal times: breakfast and dinner picked for a new plan. */
const SHIPPED_MEALS: CareTime[] = MEAL_SLOTS.map((id) => ({
  id,
  time: DEFAULT_MEAL_TIMES[id],
  on: true,
  preselected: id === "breakfast" || id === "dinner",
}));

/** The house foods the page comes with, as the design prices them. */
const SHIPPED_HOUSE_FOODS: HouseFood[] = [
  {
    id: BUILT_IN_HOUSE_FOODS[0],
    type: "kibble",
    unit: "cup",
    pricePerMeal: 3.5,
    pricePerDay: 8,
    on: true,
  },
  {
    id: BUILT_IN_HOUSE_FOODS[1],
    type: "kibble",
    unit: "cup",
    pricePerMeal: 4.5,
    pricePerDay: 10,
    on: true,
  },
  {
    id: BUILT_IN_HOUSE_FOODS[2],
    type: "wet",
    unit: "can",
    pricePerMeal: 2.5,
    pricePerDay: 6,
    on: true,
  },
];

const SHIPPED_SERVICES: CareServices = {
  boarding: "optional",
  daycare: "optional",
  grooming: "disabled",
  training: "disabled",
};

const SHIPPED_HOUSE = {
  on: false,
  pricing: "meal" as HouseFoodPricing,
  foods: SHIPPED_HOUSE_FOODS,
};

const SHIPPED_SHOW = {
  brand: true,
  prep: true,
  treats: true,
  notes: true,
  saveToProfile: true,
};

export const feedingInstructionsSchema = z.object({
  services: careServicesSchema.default(SHIPPED_SERVICES),
  meals: z
    .array(careTimeSchema)
    .max(12)
    .refine((rows) => rowsAreSound(rows, MEAL_SLOTS), {
      message: "Each meal time needs a name.",
    })
    .default(SHIPPED_MEALS),
  foodTypes: z
    .array(z.enum(FOOD_TYPES))
    .min(1)
    .refine(unique)
    .default(FOOD_TYPES.filter((type) => type !== "homemade")),
  house: z
    .object({
      on: z.boolean(),
      pricing: z.enum(HOUSE_FOOD_PRICING),
      foods: z
        .array(houseFoodSchema)
        .max(30)
        .refine((foods) => unique(foods.map((food) => food.id))),
    })
    .default(SHIPPED_HOUSE),
  packs: z
    .array(z.enum(PACKS))
    .min(1)
    .refine(unique)
    .default([...PACKS]),
  /** Meals' worth of food to pack beyond the stay, in case pickup is late. */
  extraMeals: z.number().int().min(0).max(14).default(2),
  styles: optionList("styles").default(allOn(FEEDING_STYLES)),
  habits: optionList("habits").default(allOn(EATING_HABITS)),
  skip: optionList("skip").default(allOn(SKIP_ACTIONS)),
  allergies: optionList("allergies").default(allOn(ALLERGY_PRESET_ID_LIST)),
  dayRules: z
    .array(z.enum(FEEDING_DAY_RULES))
    .min(1)
    .refine(unique)
    .default([...FEEDING_DAY_RULES]),
  show: z
    .object({
      brand: z.boolean(),
      prep: z.boolean(),
      treats: z.boolean(),
      notes: z.boolean(),
      saveToProfile: z.boolean(),
    })
    .default(SHIPPED_SHOW),
});

export type FeedingInstructions = z.infer<typeof feedingInstructionsSchema>;

/**
 * The client's page as it ships: the steps on for boarding and daycare,
 * optional; every meal time with breakfast and dinner picked; every kind of
 * food but homemade; house food off; two extra meals packed; every quick pick.
 */
export const SHIPPED_FEEDING_INSTRUCTIONS: FeedingInstructions = {
  services: SHIPPED_SERVICES,
  meals: SHIPPED_MEALS,
  foodTypes: FOOD_TYPES.filter((type) => type !== "homemade"),
  house: SHIPPED_HOUSE,
  packs: [...PACKS],
  extraMeals: 2,
  styles: allOn(FEEDING_STYLES),
  habits: allOn(EATING_HABITS),
  skip: allOn(SKIP_ACTIONS),
  allergies: allOn(ALLERGY_PRESET_ID_LIST),
  dayRules: [...FEEDING_DAY_RULES],
  show: SHIPPED_SHOW,
};

/** The meal times the page offers, in the order of the day. */
export function offeredMealTimes(
  settings: Pick<FeedingInstructions, "meals">,
): CareTime[] {
  return offeredTimes(settings.meals);
}

/** A meal time's row here, whether or not the page offers it now. */
export function mealRow(
  settings: Pick<FeedingInstructions, "meals">,
  id: string | undefined,
): CareTime | undefined {
  if (!id) return undefined;
  return settings.meals.find((row) => row.id === id);
}

/** The house foods the page offers now: none while house food is off. */
export function offeredHouseFoods(
  settings: Pick<FeedingInstructions, "house">,
): HouseFood[] {
  return settings.house.on
    ? settings.house.foods.filter((food) => food.on)
    : [];
}

/** The house food with this id, offered or not, or none. */
export function houseFoodFor(
  settings: Pick<FeedingInstructions, "house">,
  id: string | undefined,
): HouseFood | undefined {
  if (!id) return undefined;
  return settings.house.foods.find((food) => food.id === id);
}

/** What one meal or one day of a house food costs, in the facility's mode. */
export function houseFoodPrice(
  settings: Pick<FeedingInstructions, "house">,
  food: HouseFood,
): number {
  if (settings.house.pricing === "included") return 0;
  return settings.house.pricing === "day"
    ? food.pricePerDay
    : food.pricePerMeal;
}

/** House food costs nothing extra here. */
export function houseFoodIncluded(
  settings: Pick<FeedingInstructions, "house">,
): boolean {
  return settings.house.pricing === "included";
}

/** The quick picks a list offers: the vocabulary's on, then the facility's. */
export function offeredOptions(
  settings: Pick<FeedingInstructions, FeedingOptionList>,
  list: FeedingOptionList,
): CareOption[] {
  return settings[list].filter((row) => row.on);
}
