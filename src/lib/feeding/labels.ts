import { formatTimeOfDay } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type { Translate } from "@/lib/medications/dose";

import { ALLERGY_KEY, isMealSlot } from "./vocabulary";

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

/** A meal by its meal time's name, or a custom one by its time. */
export function mealLabel(
  t: Translate,
  meal: { slot?: string; time: string },
  locale: AppLocale,
): string {
  return isMealSlot(meal.slot)
    ? mealSlotLabel(t, meal.slot)
    : formatTimeOfDay(meal.time, locale);
}

/** "Feed alone". */
export function styleLabel(t: Translate, style: string): string {
  return t(`feedStyle${pascal(style)}`);
}

/** "Eats fast". */
export function habitLabel(t: Translate, habit: string): string {
  return t(`feedHabit${pascal(habit)}`);
}

/** "Offer again in 30 min". */
export function skipLabel(t: Translate, skip: string): string {
  return t(`feedSkip${pascal(skip)}`);
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
