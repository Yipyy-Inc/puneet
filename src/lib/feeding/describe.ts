import {
  formatList,
  formatMoney,
  formatTimeOfDay,
  isPluralOne,
} from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { dayCount } from "@/lib/medications/describe";
import { fill, type Translate } from "@/lib/medications/dose";
import type { MedStay } from "@/lib/medications/schedule";
import {
  houseFoodFor,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";
import type { FeedingScheduleItem } from "@/types/booking";

import { foodCharge, type HouseFoodSettings } from "./charges";
import {
  allergyLabel,
  foodTypeLabel,
  habitLabel,
  houseFoodName,
  mealLabel,
  prepLabel,
  skipLabel,
  styleLabel,
  treatsLabel,
} from "./labels";
import { planFromItem, type FeedingPlan, type PlanFood } from "./plan";
import { portionAmount, portionWords, feedUnitWord } from "./portion";
import { planDays, servedMealIds, sortedMeals } from "./schedule";
import { isBuiltInHouseFood, isFoodPrep, isTreatsChoice } from "./vocabulary";

// ============================================================================
// A feeding plan in words, in the reader's language: the meals, one line per
// food, and what a person feeding the pet needs to know. The confirm step,
// the booking page, a booking request and the daily care board all say it
// this way, so staff read what the owner wrote.
// ============================================================================

/** "2 meals" · "2 repas". */
export function mealCount(
  t: Translate,
  count: number,
  locale: AppLocale,
): string {
  return fill(
    t(isPluralOne(count, locale) ? "feedMealsOne" : "feedMealsOther"),
    {
      count,
    },
  );
}

/** What a food is called: the house food, the brand, or the kind of food. */
export function foodName(
  t: Translate,
  food: PlanFood,
  settings?: HouseFoodSettings,
): string {
  if (food.source === "house") {
    return houseFoodName(
      t,
      settings ? houseFoodFor(settings, food.houseFoodId) : undefined,
      food.houseFoodName,
    );
  }
  return food.brand.trim() || foodTypeLabel(t, food.type);
}

const lower = (text: string, locale: AppLocale) =>
  text.toLocaleLowerCase(locale === "fr" ? "fr-CA" : "en-CA");

/**
 * A house food's name inside a sentence — "5 meals of House kibble". The
 * facility's name for it stays as it was typed: "Hill's Science Diet" is a
 * name, not a word to fold. Only our own words — the page's three house
 * foods, and the fallback — are lower-cased.
 */
export function houseFoodInline(
  t: Translate,
  food: PlanFood,
  locale: AppLocale,
  settings?: HouseFoodSettings,
): string {
  const house = settings ? houseFoodFor(settings, food.houseFoodId) : undefined;
  const own = house?.name?.trim();
  if (own) return own;
  if (house && isBuiltInHouseFood(house.id)) {
    return lower(houseFoodName(t, house), locale);
  }
  return food.houseFoodName.trim() || lower(t("feedHouseFood"), locale);
}

/**
 * One food at one meal, as the design's panel says it: "1 cup dry kibble",
 * "¼ can wet / canned" — the kind of food in lower case — or "1 cup House
 * kibble", the house food by the facility's own name.
 */
export function panelFoodWords(
  t: Translate,
  food: PlanFood,
  locale: AppLocale,
  settings?: HouseFoodSettings,
): string {
  const name =
    food.source === "house"
      ? houseFoodInline(t, food, locale, settings)
      : lower(foodTypeLabel(t, food.type), locale);
  return `${portionAmount(food.amount, food.unit, locale)} ${feedUnitWord(
    t,
    food.unit,
    food.amount,
    locale,
    food.customUnit,
  )} ${name}`;
}

/**
 * One food at one meal for the person serving it: the portion, the food by
 * its name, and its kind when the name is a brand — "1 cup Orijen Original
 * (dry kibble)".
 */
function servingWords(
  t: Translate,
  food: PlanFood,
  locale: AppLocale,
  settings?: HouseFoodSettings,
): string {
  const base = `${portionWords(t, food, locale)} ${foodName(t, food, settings)}`;
  return food.source === "own" && food.brand.trim()
    ? `${base} (${lower(foodTypeLabel(t, food.type), locale)})`
    : base;
}

/** The foods served at one meal, joined: "1 cup … + ¼ can …". */
export function mealWhat(
  t: Translate,
  plan: FeedingPlan,
  mealId: string,
  locale: AppLocale,
  settings?: HouseFoodSettings,
): string {
  const meals = sortedMeals(plan.meals);
  return plan.foods
    .filter((food) => servedMealIds(food, meals).includes(mealId))
    .map((food) => servingWords(t, food, locale, settings))
    .join(" + ");
}

/** How the foods served at one meal are prepared: "Serve dry · Mix into kibble". */
export function mealPrep(
  t: Translate,
  plan: FeedingPlan,
  mealId: string,
): string[] {
  const meals = sortedMeals(plan.meals);
  const preps = plan.foods
    .filter((food) => servedMealIds(food, meals).includes(mealId))
    .flatMap((food) => food.prep.filter(isFoodPrep));
  return [...new Set(preps)].map((prep) => prepLabel(t, prep));
}

/**
 * Everything about the plan that is not a meal or a food, one line each. What
 * to do about a skipped meal and treats are said only when the record says
 * them — a row written before the step asked did not, and the plan's defaults
 * are not the owner's words.
 */
export function planExtras(
  t: Translate,
  plan: FeedingPlan,
  locale: AppLocale,
  stated: { skip: boolean; treats: boolean; allergies?: boolean } = {
    skip: true,
    treats: true,
  },
): string[] {
  const extras: string[] = [];
  // The facility's own quick picks read as the facility wrote them.
  const styles = plan.styles.filter((style) => style.trim());
  if (styles.length > 0) {
    extras.push(
      fill(t("feedStyleLine"), {
        styles: formatList(
          styles.map((style) => styleLabel(t, style)),
          locale,
        ),
      }),
    );
  }
  const habits = plan.habits.filter((habit) => habit.trim());
  if (habits.length > 0) {
    extras.push(
      fill(t("feedHabitsLine"), {
        habits: formatList(
          habits.map((habit) => habitLabel(t, habit)),
          locale,
        ),
      }),
    );
  }
  const instruction = plan.carry.feedingInstruction?.trim();
  if (instruction) extras.push(instruction);
  const prepNotes = plan.carry.prepNotes?.trim();
  if (prepNotes) extras.push(prepNotes);
  if (stated.skip && plan.skip.trim()) {
    extras.push(fill(t("feedSkipLine"), { action: skipLabel(t, plan.skip) }));
  }
  const refusal = plan.carry.refusalNotes?.trim();
  if (refusal) extras.push(fill(t("feedRefusalLine"), { notes: refusal }));
  if (stated.treats && isTreatsChoice(plan.treats)) {
    extras.push(
      fill(t("feedTreatsLine"), { treats: treatsLabel(t, plan.treats) }),
    );
  }
  const allergies = plan.allergies.map((a) => a.trim()).filter(Boolean);
  // A screen that shows allergies on a line of their own says so.
  if (stated.allergies !== false && allergies.length > 0) {
    extras.push(
      fill(t("feedAllergiesLine"), {
        allergies: formatList(
          allergies.map((allergy) => allergyLabel(t, allergy)),
          locale,
        ),
      }),
    );
  }
  if (plan.notes.trim()) extras.push(plan.notes.trim());
  return extras;
}

export interface FeedingLines {
  /** "2 meals a day · 7:00 AM, 5:00 PM · 5 days" */
  meals: string;
  /** "1 cup Orijen Original (dry kibble) · Serve dry", one per food. */
  foods: string[];
  extras: string[];
}

/**
 * A booked plan in words — the step's own, or an older row read as a plan.
 * `priced` says what a house food costs: the booking form does; the booking
 * page does not, because the bill has the line and a price changed since
 * would make the two disagree.
 */
export function describeFeeding(
  item: FeedingScheduleItem,
  options: {
    t: Translate;
    locale: AppLocale;
    stay: MedStay;
    settings: FeedingInstructions;
    service?: string;
    priced?: boolean;
  },
): FeedingLines {
  const { t, locale, stay, settings, priced = true } = options;
  const plan = planFromItem(item, { settings, stay });
  const meals = sortedMeals(plan.meals);
  const days = stay.days.length > 0 ? planDays(plan, stay).length : null;
  const mealParts = [
    fill(t("feedMealsADay"), { meals: mealCount(t, meals.length, locale) }),
    meals.map((meal) => formatTimeOfDay(meal.time, locale)).join(", "),
  ];
  if (days !== null) mealParts.push(dayCount(t, days, locale));

  const foods = plan.foods.map((food) => {
    const parts = [servingWords(t, food, locale, settings)];
    const served = servedMealIds(food, meals);
    if (meals.length > 1 && served.length < meals.length) {
      parts.push(
        served
          .map((id) => meals.find((meal) => meal.id === id))
          .filter((meal): meal is (typeof meals)[number] => Boolean(meal))
          .map((meal) => mealLabel(t, meal, locale, settings))
          .join(", "),
      );
    }
    const preps = food.prep
      .filter(isFoodPrep)
      .map((prep) => prepLabel(t, prep));
    if (preps.length > 0) parts.push(preps.join(", "));
    if (food.source === "house" && days !== null) {
      const charge = foodCharge(food, { meals, days }, settings);
      if (charge && charge.quantity > 0) {
        const waived = plan.waivedFoods.includes(food.id);
        const what = fill(t("feedProvides"), {
          quantity:
            charge.per === "day"
              ? dayCount(t, charge.quantity, locale)
              : mealCount(t, charge.quantity, locale),
        });
        parts.push(
          priced || waived
            ? `${what} (${
                charge.included
                  ? t("feedIncluded")
                  : waived
                    ? t("medsWaived")
                    : formatMoney(charge.amount, locale)
              })`
            : what,
        );
      }
    }
    return parts.join(" · ");
  });

  return {
    meals: meals.length > 0 ? mealParts.join(" · ") : t("feedPickMeal"),
    foods,
    extras: planExtras(t, plan, locale, {
      skip: typeof item.skipMeal === "string",
      treats: typeof item.treats === "string",
    }),
  };
}
