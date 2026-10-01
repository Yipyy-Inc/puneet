import type { MedDayRule } from "@/types/base";

// ============================================================================
// What the booking form's Feeding step offers, and how each food is portioned
// (2026-10-01).
//
// The client's design fixed all of it: the kinds of food, the units each is
// measured in and the quick picks and − / + step that suit each unit, where a
// food is kept, how it is prepared and packed, the meal times, the feeding
// styles and habits, what to do about a skipped meal, treats, and the common
// allergies. A facility chooses which kinds of food and meal times its page
// offers (the `feeding_instructions` setting); it does not invent new ones,
// because every word here has a translation and every id is stored on a
// booking.
// ============================================================================

/** The kinds of food the step offers, in the order it shows them. */
export const FOOD_TYPES = [
  "kibble",
  "wet",
  "raw",
  "patties",
  "freeze_dried",
  "dehydrated",
  "fresh",
  "homemade",
  "prescription",
  "topper",
  "other",
] as const;
export type FoodType = (typeof FOOD_TYPES)[number];

/** What a portion is counted in. `custom` is the owner's own word. */
export const FEED_UNITS = [
  "cup",
  "scoop",
  "g",
  "oz",
  "can",
  "tbsp",
  "lb",
  "patty",
  "nugget",
  "pack",
  "container",
  "pouch",
  "ml",
  "custom",
] as const;
export type FeedUnit = (typeof FEED_UNITS)[number];

export interface PortionSpec {
  /** One tap each. */
  presets: readonly number[];
  /** What − and + move by, and the smallest amount they reach. */
  step: number;
  /** Shown as ¼ ½ ¾; otherwise typed as a number. */
  fraction: boolean;
}

/** The design's quick picks and steps, unit by unit. */
export const PORTION: Record<FeedUnit, PortionSpec> = {
  cup: { presets: [0.25, 0.5, 0.75, 1, 1.5, 2], step: 0.25, fraction: true },
  scoop: { presets: [0.5, 1, 1.5, 2], step: 0.25, fraction: true },
  g: { presets: [50, 100, 150, 200, 300], step: 10, fraction: false },
  oz: { presets: [2, 4, 6, 8], step: 1, fraction: false },
  can: { presets: [0.25, 0.5, 1], step: 0.25, fraction: true },
  tbsp: { presets: [1, 2, 3], step: 0.5, fraction: true },
  lb: { presets: [0.25, 0.5, 1], step: 0.25, fraction: true },
  patty: { presets: [0.5, 1, 2], step: 0.5, fraction: true },
  nugget: { presets: [2, 4, 6, 8], step: 1, fraction: false },
  pack: { presets: [0.5, 1], step: 0.5, fraction: true },
  container: { presets: [0.5, 1], step: 0.5, fraction: true },
  pouch: { presets: [0.5, 1], step: 0.5, fraction: true },
  ml: { presets: [15, 30, 60, 120], step: 5, fraction: false },
  custom: { presets: [0.5, 1, 2], step: 0.5, fraction: true },
};

/** Where a food is kept. */
export const STORAGE = [
  "pantry",
  "fridge_after_opening",
  "frozen",
  "fridge",
  "follow_label",
] as const;
export type FoodStorage = (typeof STORAGE)[number];

/** How a food can be prepared — each kind of food offers some of these. */
export const PREP = [
  "serve_dry",
  "soak_warm_water",
  "splash_of_water",
  "mix_with_wet_food",
  "serve_as_is",
  "warm_slightly",
  "mix_into_kibble",
  "thaw_overnight",
  "serve_cold",
  "do_not_microwave",
  "serve_frozen",
  "break_into_pieces",
  "rehydrate",
  "crumble_on_top",
  "mix_with_kibble",
  "pour_over_food",
] as const;
export type FoodPrep = (typeof PREP)[number];

export interface FoodTypeSpec {
  /** The first is the default. */
  units: readonly FeedUnit[];
  storage: FoodStorage | null;
  prep: readonly FoodPrep[];
  /** One line of guidance under the portion. */
  note?: "prescription";
}

export const FOOD: Record<FoodType, FoodTypeSpec> = {
  kibble: {
    units: ["cup", "scoop", "g", "oz"],
    storage: "pantry",
    prep: [
      "serve_dry",
      "soak_warm_water",
      "splash_of_water",
      "mix_with_wet_food",
    ],
  },
  wet: {
    units: ["can", "tbsp", "oz", "g"],
    storage: "fridge_after_opening",
    prep: ["serve_as_is", "warm_slightly", "mix_into_kibble"],
  },
  raw: {
    units: ["g", "oz", "lb", "cup"],
    storage: "frozen",
    prep: ["thaw_overnight", "serve_cold", "do_not_microwave"],
  },
  patties: {
    units: ["patty", "nugget", "g"],
    storage: "frozen",
    prep: ["thaw_overnight", "serve_frozen", "break_into_pieces"],
  },
  freeze_dried: {
    units: ["nugget", "cup", "g"],
    storage: "pantry",
    prep: ["serve_dry", "rehydrate", "crumble_on_top"],
  },
  dehydrated: {
    units: ["cup", "scoop", "g"],
    storage: "pantry",
    prep: ["rehydrate", "serve_dry"],
  },
  fresh: {
    units: ["pack", "cup", "g"],
    storage: "fridge",
    prep: ["serve_cold", "warm_slightly", "mix_with_kibble"],
  },
  homemade: {
    units: ["cup", "container", "g"],
    storage: "fridge",
    prep: ["serve_cold", "warm_slightly"],
  },
  prescription: {
    units: ["cup", "can", "g"],
    storage: "follow_label",
    prep: ["serve_as_is", "soak_warm_water"],
    note: "prescription",
  },
  topper: {
    units: ["tbsp", "pouch", "ml"],
    storage: "fridge_after_opening",
    prep: ["pour_over_food", "warm_slightly"],
  },
  other: { units: ["custom"], storage: null, prep: [] },
};

/** How the owner's food arrives. The first is the default. */
export const PACKS = [
  "pre_portioned",
  "original_bag",
  "frozen_portions",
  "cans_or_pouches",
  "bulk_container",
] as const;
export type FoodPack = (typeof PACKS)[number];

/** The meal times picked with one tap. */
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const DEFAULT_MEAL_TIMES: Record<MealSlot, string> = {
  breakfast: "07:00",
  lunch: "12:00",
  dinner: "17:00",
  snack: "20:00",
};

/** What "+ Custom time" starts at. */
export const CUSTOM_MEAL_DEFAULT = "15:00";

/** "Which days?" in the design's order — every day first. */
export const FEEDING_DAY_RULES = [
  "every_day",
  "except_checkout",
  "certain_dates",
] as const satisfies readonly MedDayRule[];

export const FEEDING_STYLES = [
  "feed_alone",
  "with_housemate",
  "hand_feed",
  "slow_feeder",
  "elevated_bowl",
  "puzzle_feeder",
  "free_feed",
  "pick_up_after_20",
] as const;
export type FeedingStyle = (typeof FEEDING_STYLES)[number];

export const EATING_HABITS = [
  "eats_fast",
  "picky",
  "grazes",
  "guards_food",
  "needs_encouragement",
] as const;
export type EatingHabit = (typeof EATING_HABITS)[number];

/** "If {pet} skips a meal" — the first is the default. */
export const SKIP_ACTIONS = [
  "offer_again_30",
  "add_water_or_topper",
  "tell_after_1",
  "tell_after_2",
] as const;
export type SkipAction = (typeof SKIP_ACTIONS)[number];

export const TREATS = ["house", "mine", "none"] as const;
export type TreatsChoice = (typeof TREATS)[number];

/**
 * The allergies one tap marks. These ARE stored — in `allergies`, which the
 * daily care board, the kennel card and the checkout gate read as they stand
 * — so the stored value is the canonical English word and only the pill's
 * face is translated (`allergyLabel`), as the pre-arrival form does. An
 * allergy typed by hand is stored as typed.
 */
// french-ok: stored canonical values, translated at display through ALLERGY_KEY
export const FOOD_ALLERGY_PRESETS = [
  "Chicken",
  "Beef",
  "Grain",
  "Dairy",
  "Fish",
  "Lamb",
  "Sensitive stomach",
] as const;

/**
 * The allergy quick picks as the facility's page lists them, by id, with the
 * word each stores on a booking.
 */
export const ALLERGY_PRESET_IDS = {
  chicken: "Chicken",
  beef: "Beef",
  grain: "Grain",
  dairy: "Dairy",
  fish: "Fish",
  lamb: "Lamb",
  sensitive_stomach: "Sensitive stomach",
} as const satisfies Record<string, (typeof FOOD_ALLERGY_PRESETS)[number]>;
export type AllergyPresetId = keyof typeof ALLERGY_PRESET_IDS;
export const ALLERGY_PRESET_ID_LIST = Object.keys(
  ALLERGY_PRESET_IDS,
) as AllergyPresetId[];

/**
 * The house foods the facility's page comes with: switched off, priced as the
 * design shows them, named in the reader's language until the facility names
 * them itself.
 */
export const BUILT_IN_HOUSE_FOODS = [
  "hf-house-kibble",
  "hf-sensitive-kibble",
  "hf-canned-wet",
] as const;
export type BuiltInHouseFood = (typeof BUILT_IN_HOUSE_FOODS)[number];

export const isBuiltInHouseFood = (value: unknown): value is BuiltInHouseFood =>
  typeof value === "string" &&
  (BUILT_IN_HOUSE_FOODS as readonly string[]).includes(value);

/** The catalogue key each stored preset is shown with. */
export const ALLERGY_KEY: Record<string, string> = {
  chicken: "feedAllergyChicken",
  beef: "feedAllergyBeef",
  grain: "feedAllergyGrain",
  dairy: "feedAllergyDairy",
  fish: "feedAllergyFish",
  lamb: "feedAllergyLamb",
  "sensitive stomach": "feedAllergySensitiveStomach",
};

const includes = <T extends string>(list: readonly T[], value: unknown) =>
  typeof value === "string" && (list as readonly string[]).includes(value);

export const isFoodType = (value: unknown): value is FoodType =>
  includes(FOOD_TYPES, value);
export const isFeedUnit = (value: unknown): value is FeedUnit =>
  includes(FEED_UNITS, value);
export const isMealSlot = (value: unknown): value is MealSlot =>
  includes(MEAL_SLOTS, value);
export const isFoodPrep = (value: unknown): value is FoodPrep =>
  includes(PREP, value);
export const isFoodPack = (value: unknown): value is FoodPack =>
  includes(PACKS, value);
export const isFeedingStyle = (value: unknown): value is FeedingStyle =>
  includes(FEEDING_STYLES, value);
export const isEatingHabit = (value: unknown): value is EatingHabit =>
  includes(EATING_HABITS, value);
export const isSkipAction = (value: unknown): value is SkipAction =>
  includes(SKIP_ACTIONS, value);
export const isTreatsChoice = (value: unknown): value is TreatsChoice =>
  includes(TREATS, value);

/** The amount a unit starts at: one, or its second quick pick. */
export function startingAmount(unit: FeedUnit): number {
  const { presets } = PORTION[unit];
  return presets.includes(1) ? 1 : (presets[1] ?? presets[0] ?? 1);
}

// ── READING WHAT OLDER BOOKINGS STORED ─────────────────────────────────────

/**
 * A kind of food from what an older booking stored. The old form kept the
 * facility's food-type WORD in the component's name ("Wet food") and left its
 * type "kibble"; older rows carry the old enum ("wet_food", "toppers"), and
 * some carry words outside it ("topper"). Anything unknown is "other".
 */
export function foodTypeFromStored(
  type: string | undefined,
  name: string | undefined,
): { type: FoodType; nameIsType: boolean } {
  const word = (name ?? "").trim().toLowerCase();
  const byName: Record<string, FoodType> = {
    kibble: "kibble",
    "dry kibble": "kibble",
    "wet food": "wet",
    wet: "wet",
    raw: "raw",
    prescription: "prescription",
    homemade: "homemade",
    topper: "topper",
    toppers: "topper",
  };
  if (byName[word]) return { type: byName[word], nameIsType: true };
  const byType: Record<string, FoodType> = {
    kibble: "kibble",
    wet_food: "wet",
    wet: "wet",
    raw: "raw",
    prescription: "prescription",
    toppers: "topper",
    topper: "topper",
    homemade: "homemade",
  };
  return { type: byType[type ?? ""] ?? "other", nameIsType: false };
}

/** A unit from what an older booking stored ("cups", "grams"…). */
export function feedUnitFromStored(unit: string | undefined): FeedUnit {
  const value = (unit ?? "").trim().toLowerCase();
  if (isFeedUnit(value)) return value;
  const old: Record<string, FeedUnit> = {
    cups: "cup",
    grams: "g",
    gram: "g",
    scoops: "scoop",
    cans: "can",
  };
  return old[value] ?? "custom";
}

/** The old form's free "feeding instruction" words that are now a style. */
export function styleFromStored(text: string | undefined): FeedingStyle | null {
  const word = (text ?? "").trim().toLowerCase();
  const map: Record<string, FeedingStyle> = {
    "feed alone": "feed_alone",
    "hand feed": "hand_feed",
    "slow feeder": "slow_feeder",
    "slow feeder bowl": "slow_feeder",
    "free feed": "free_feed",
  };
  return map[word] ?? null;
}
