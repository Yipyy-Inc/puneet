import { isPluralOne } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { formatAmount, type Translate } from "@/lib/medications/dose";

import { PORTION, type FeedUnit } from "./vocabulary";

// ============================================================================
// One portion, in words: "1 cup", "½ can", "1½ cups", "150 g", "2 handfuls".
// ============================================================================

const UNIT_KEY: Record<Exclude<FeedUnit, "custom">, string> = {
  cup: "Cup",
  scoop: "Scoop",
  g: "G",
  oz: "Oz",
  can: "Can",
  tbsp: "Tbsp",
  lb: "Lb",
  patty: "Patty",
  nugget: "Nugget",
  pack: "Pack",
  container: "Container",
  pouch: "Pouch",
  ml: "Ml",
};

/**
 * Whether `amount` takes the singular. The design says "½ cup", "1 cup",
 * "1½ cups" and "0 cups". French has its own rule — singular below two,
 * "1,5 tasse" — and `Intl` knows it.
 */
function portionSingular(amount: number, locale: AppLocale): boolean {
  if (locale === "fr") return isPluralOne(amount, "fr");
  return amount > 0 && amount <= 1;
}

/** The word for a unit, singular or plural as `amount` needs. */
export function feedUnitWord(
  t: Translate,
  unit: FeedUnit,
  amount: number,
  locale: AppLocale,
  customUnit?: string,
): string {
  const one = portionSingular(amount, locale);
  if (unit === "custom") {
    const typed = customUnit?.trim();
    if (!typed) return t(one ? "feedUnitPortionOne" : "feedUnitPortionOther");
    // The owner's own word, made plural the regular way.
    return one || /[sxz]$/i.test(typed) ? typed : `${typed}s`;
  }
  return t(`feedUnit${UNIT_KEY[unit]}${one ? "One" : "Other"}`);
}

/** The unit as an option in the unit choice: "cup", "grams", "Custom". */
export function feedUnitOption(t: Translate, unit: FeedUnit): string {
  return t(`feedUnitOption${unit === "custom" ? "Custom" : UNIT_KEY[unit]}`);
}

/** An amount as the portion shows it: ¼ ½ ¾ for counted units, a number otherwise. */
export function portionAmount(
  amount: number,
  unit: FeedUnit,
  locale: AppLocale,
): string {
  return formatAmount(amount, PORTION[unit].fraction, locale);
}

/** "1½ cups". */
export function portionWords(
  t: Translate,
  portion: { amount: number; unit: FeedUnit; customUnit?: string },
  locale: AppLocale,
): string {
  return `${portionAmount(portion.amount, portion.unit, locale)} ${feedUnitWord(
    t,
    portion.unit,
    portion.amount,
    locale,
    portion.customUnit,
  )}`;
}
