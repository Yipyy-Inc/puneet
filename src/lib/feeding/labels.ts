import { formatTimeOfDay } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type { Translate } from "@/lib/medications/dose";

import {
  ALLERGY_KEY,
  ALLERGY_PRESET_IDS,
  isBuiltInHouseFood,
  isEatingHabit,
  isFeedingStyle,
  isMealSlot,
  isSkipAction,
  type BuiltInHouseFood,
} from "./vocabulary";

// ============================================================================
// The Feeding step's vocabulary in the reader's language: one key per id, in
// the booking form's catalogue (`shell.booking.feed*`). The booking form, its
// confirm step, the settings card and the staff screens all name a food, a
// meal or a preparation this way, so staff read what the owner picked.
// ============================================================================

const pascal = (id: string) =>
  id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/** "Dry kibble", "Topper / broth". */
export function foodTypeLabel(t: Translate, type: string): string {
  return t(`feedType${pascal(type)}`);
}

/** "e.g., Orijen Original" — the brand field's example for a kind of food. */
export function brandPlaceholder(t: Translate, type: string): string {
  return t(`feedBrandPh${pascal(type)}`);
}

/** "Pantry", "Keep frozen". */
export function storageLabel(t: Translate, storage: string): string {
  return t(`feedStore${pascal(storage)}`);
}

/** "Soak in warm water". */
export function prepLabel(t: Translate, prep: string): string {
  return t(`feedPrep${pascal(prep)}`);
}

/** "Pre-portioned, one bag per meal". */
export function packLabel(t: Translate, pack: string): string {
  return t(`feedPack${pascal(pack)}`);
}

/** "Breakfast", "Bedtime snack". */
export function mealSlotLabel(t: Translate, slot: string): string {
  return t(`feedSlot${pascal(slot)}`);
}

/**
 * A meal time's name on the facility's page: its own words, else the
 * vocabulary's — "Breakfast", or "Mid-morning snack" the facility added.
 */
function mealTimeName(
  t: Translate,
  row: { id: string; label?: string },
): string {
  return (
    row.label?.trim() || (isMealSlot(row.id) ? mealSlotLabel(t, row.id) : "")
  );
}

/**
 * A meal by its meal time's name, or a custom one by its time. The facility's
 * row names it while it has one; a meal time it has since deleted keeps the
 * name the booking stored.
 */
export function mealLabel(
  t: Translate,
  meal: { slot?: string; label?: string; time: string },
  locale: AppLocale,
  settings?: { meals: readonly { id: string; label?: string }[] },
): string {
  if (meal.slot) {
    const row = settings?.meals.find((candidate) => candidate.id === meal.slot);
    if (row) return mealTimeName(t, row) || formatTimeOfDay(meal.time, locale);
    if (isMealSlot(meal.slot)) return mealSlotLabel(t, meal.slot);
    if (meal.label?.trim()) return meal.label.trim();
  }
  return formatTimeOfDay(meal.time, locale);
}

/** "Feed alone" — or a style the facility added, as it wrote it. */
export function styleLabel(t: Translate, style: string): string {
  return isFeedingStyle(style) ? t(`feedStyle${pascal(style)}`) : style;
}

/** "Eats fast" — or a habit the facility added, as it wrote it. */
export function habitLabel(t: Translate, habit: string): string {
  return isEatingHabit(habit) ? t(`feedHabit${pascal(habit)}`) : habit;
}

/** "Offer again in 30 min" — or the facility's own, as it wrote it. */
export function skipLabel(t: Translate, skip: string): string {
  return isSkipAction(skip) ? t(`feedSkip${pascal(skip)}`) : skip;
}

/** "House treats OK". */
export function treatsLabel(t: Translate, treats: string): string {
  return t(`feedTreats${pascal(treats)}`);
}

/** A stored allergy in the reader's words: a preset translated, a typed one as typed. */
export function allergyLabel(t: Translate, stored: string): string {
  const key = ALLERGY_KEY[stored.trim().toLowerCase()];
  return key ? t(key) : stored;
}

const HOUSE_FOOD_KEY: Record<BuiltInHouseFood, string> = {
  "hf-house-kibble": "feedHfHouseKibble",
  "hf-sensitive-kibble": "feedHfSensitiveKibble",
  "hf-canned-wet": "feedHfCannedWet",
};

/**
 * A house food's name: the facility's words, else — for one the page came
 * with — the reader's "House kibble". `fallback` is a name a booking stored.
 */
export function houseFoodName(
  t: Translate,
  food: { id?: string; name?: string } | undefined,
  fallback = "",
): string {
  const own = food?.name?.trim();
  if (own) return own;
  if (food?.id && isBuiltInHouseFood(food.id)) {
    return t(HOUSE_FOOD_KEY[food.id]);
  }
  return fallback.trim() || t("feedHouseFood");
}

/** A house food's short description: the facility's words, else the page's. */
export function houseFoodDescription(
  t: Translate,
  food: { id: string; description?: string },
): string {
  const own = food.description?.trim();
  if (own !== undefined && own !== "") return own;
  if (food.description === undefined && isBuiltInHouseFood(food.id)) {
    return t(`${HOUSE_FOOD_KEY[food.id]}Desc`);
  }
  return "";
}

/**
 * A quick pick's name on the facility's page and the booking form: the
 * vocabulary's words for one of its own, else the facility's.
 */
export function optionLabel(
  t: Translate,
  list: "styles" | "habits" | "skip" | "allergies",
  row: { id: string; label?: string },
): string {
  if (row.label?.trim()) return row.label.trim();
  if (list === "styles") return styleLabel(t, row.id);
  if (list === "habits") return habitLabel(t, row.id);
  if (list === "skip") return skipLabel(t, row.id);
  const word = ALLERGY_PRESET_IDS[row.id as keyof typeof ALLERGY_PRESET_IDS];
  return word ? allergyLabel(t, word) : row.id;
}

/**
 * What a quick pick stores on a booking: the vocabulary's id — for an allergy,
 * its canonical word — or the facility's own words.
 */
export function optionValue(
  list: "styles" | "habits" | "skip" | "allergies",
  row: { id: string; label?: string },
): string {
  if (row.label?.trim()) return row.label.trim();
  if (list === "allergies") {
    return (
      ALLERGY_PRESET_IDS[row.id as keyof typeof ALLERGY_PRESET_IDS] ?? row.id
    );
  }
  return row.id;
}
