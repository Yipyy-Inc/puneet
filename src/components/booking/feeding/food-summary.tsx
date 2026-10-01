"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { foodCharge } from "@/lib/feeding/charges";
import { houseFoodInline, mealCount } from "@/lib/feeding/describe";
import type { PlanFood } from "@/lib/feeding/plan";
import { portionWords } from "@/lib/feeding/portion";
import {
  foodServings,
  planDays,
  servedMealIds,
  sortedMeals,
} from "@/lib/feeding/schedule";
import { formatMoney, isPluralOne } from "@/lib/i18n/format";
import { dayCount } from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// What one food comes to over the stay. The owner's: how much to pack — so
// many labelled portions, or at least so much — and the sum behind it. The
// facility's: how many meals or days of it, what that adds to the booking,
// and staff's waiver.
// ============================================================================

export function FoodSummary({
  step,
  food,
}: {
  step: FeedingStepState;
  food: PlanFood;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const plan = step.plan!;
  const meals = sortedMeals(plan.meals);
  const days = planDays(plan, step.stay).length;
  const servings = foodServings(plan, food, step.stay);
  const perDay = servedMealIds(food, meals).length;

  if (food.source === "own") {
    const prePortioned = food.pack === "pre_portioned";
    const total = Math.round(servings * food.amount * 100) / 100;
    return (
      <div className="border-line flex flex-col gap-0.5 rounded-xl border px-4 py-3.5">
        <span className="text-body-strong text-body-ink">
          {prePortioned
            ? fill(t("feedPackPortions"), { count: servings })
            : fill(t("feedPackAtLeast"), {
                amount: portionWords(t, { ...food, amount: total }, locale),
              })}
        </span>
        <span className="text-meta text-ink-tertiary">
          {fill(t(prePortioned ? "feedCalcOwnEach" : "feedCalcOwn"), {
            meals: mealCount(t, servings, locale),
            portion: portionWords(t, food, locale),
          })}
        </span>
      </div>
    );
  }

  const charge = foodCharge(food, { meals, days }, step.settings, step.service);
  if (!charge) return null;
  const waived = plan.waivedFoods.includes(food.id);
  const name = houseFoodInline(t, food, locale, step.settings);
  const price = formatMoney(charge.unitPrice, locale);
  const quantity =
    charge.per === "day"
      ? dayCount(t, charge.quantity, locale)
      : mealCount(t, charge.quantity, locale);
  const withService = t(
    step.service === "daycare" ? "feedWithDaycare" : "feedWithBoarding",
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="border-line flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-strong text-body-ink">
            {fill(t("feedHouseTotal"), { quantity, name })}
          </span>
          <span className="text-meta text-ink-tertiary">
            {charge.per === "day"
              ? fill(t("feedCalcPerDay"), {
                  days: dayCount(t, charge.quantity, locale),
                  price,
                })
              : fill(t("feedCalcPerMeal"), {
                  days: dayCount(t, days, locale),
                  meals: fill(
                    t(
                      isPluralOne(perDay, locale)
                        ? "feedMealsOne"
                        : "feedMealsOther",
                    ),
                    { count: perDay },
                  ),
                  price,
                })}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            data-waived={waived && !charge.included}
            className="text-body-ink text-section data-[waived=true]:text-ink-tertiary tabular-nums data-[waived=true]:line-through"
          >
            {charge.included
              ? t("feedIncluded")
              : formatMoney(charge.quantity * charge.unitPrice, locale)}
          </span>
          <span className="text-meta text-ink-tertiary">
            {charge.included
              ? withService
              : waived
                ? t("medsWaivedByStaff")
                : t("medsAddedToBooking")}
          </span>
        </div>
      </div>
      {step.staff && !charge.included ? (
        <div className="flex items-center gap-2.5">
          <Checkbox
            id={`feed-waive-${food.id}`}
            checked={waived}
            onCheckedChange={(on) =>
              step.update((current) => ({
                waivedFoods:
                  on === true
                    ? [...new Set([...current.waivedFoods, food.id])]
                    : current.waivedFoods.filter((id) => id !== food.id),
              }))
            }
          />
          <label
            htmlFor={`feed-waive-${food.id}`}
            className="text-body text-ink-secondary cursor-pointer"
          >
            {t("medsWaiveLabel")}
          </label>
        </div>
      ) : null}
    </div>
  );
}
