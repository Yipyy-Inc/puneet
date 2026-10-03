"use client";

import {
  EditorSection,
  FieldLabel,
} from "@/components/booking/care/editor-section";
import { OptionCards } from "@/components/booking/care/option-cards";
import { ChoicePill } from "@/components/ui/choice-pill";
import { mealCount } from "@/lib/feeding/describe";
import { mealLabel } from "@/lib/feeding/labels";
import { offeredFeedingDayRules } from "@/lib/feeding/plan";
import { planDays, sortedMeals } from "@/lib/feeding/schedule";
import {
  formatCalendarDayLong,
  formatDayRange,
  formatTimeOfDay,
  formatWeekday,
} from "@/lib/i18n/format";
import { dayCount } from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import { hasCheckoutDay } from "@/lib/medications/schedule";
import { offeredMealTimes } from "@/lib/settings/feeding-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { MedDayRule } from "@/types/base";

import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// MEAL TIMES: when the pet eats — the meal times with one tap, custom times —
// and which days of the stay.
// ============================================================================

/** 0 = Sunday, read from the calendar day itself, in UTC. */
function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function PlanMealTimes({
  step,
  petName,
}: {
  step: FeedingStepState;
  petName: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const plan = step.plan!;
  const { settings, stay } = step;
  const overnight = hasCheckoutDay(stay);

  const offered = offeredFeedingDayRules(settings, stay);
  const rules: MedDayRule[] = offered.includes(plan.dayRule)
    ? offered
    : [...offered, plan.dayRule];
  const rangeOf = (days: string[]) =>
    days.length === 0
      ? ""
      : fill(t("medsDaysRangeSub"), {
          range: formatDayRange(days[0], days[days.length - 1], locale),
          days: dayCount(t, days.length, locale),
        });
  const ruleCard = (rule: MedDayRule) => {
    if (rule === "except_checkout") {
      return {
        value: rule,
        title: t("medsDaysExceptCheckout"),
        hint: rangeOf(stay.days.slice(0, -1)),
      };
    }
    if (rule === "every_day") {
      return {
        value: rule,
        title: t(overnight ? "medsDaysEveryDay" : "medsDaysEveryBooked"),
        hint: rangeOf(stay.days),
      };
    }
    return {
      value: rule,
      title: t("medsDaysCertain"),
      hint: t("medsDaysCertainSub"),
    };
  };

  // A meal time the facility has since turned off — or deleted — stays on
  // the plan that uses it, rather than vanishing from under it.
  const slots: { id: string; label?: string; time: string }[] =
    offeredMealTimes(settings);
  for (const meal of plan.meals) {
    if (meal.slot && !slots.some((slot) => slot.id === meal.slot)) {
      slots.push({ id: meal.slot, label: meal.label, time: meal.time });
    }
  }
  slots.sort((a, b) => a.time.localeCompare(b.time));
  const custom = plan.meals.filter((meal) => !meal.slot);
  const meals = sortedMeals(plan.meals);
  const days = planDays(plan, stay);
  const summary =
    step.problem === "time"
      ? t("feedPickTime")
      : meals.length === 0
        ? t("feedPickMeal")
        : fill(t("feedMealsSummary"), {
            meals: mealCount(t, meals.length, locale),
            days: dayCount(t, days.length, locale),
          });

  return (
    <EditorSection label={t("feedSectionMeals")}>
      <div className="flex min-w-0 flex-col gap-2.5">
        <FieldLabel
          id="feed-meals-label"
          aside={
            <span className="text-ink-tertiary text-[13px]" aria-live="polite">
              {summary}
            </span>
          }
        >
          {fill(t("feedWhenEats"), { pet: petName })}
        </FieldLabel>
        <div
          role="group"
          aria-labelledby="feed-meals-label"
          className="flex flex-wrap gap-2"
        >
          {slots.map((slot) => (
            <ChoicePill
              key={slot.id}
              type="checkbox"
              value={slot.id}
              checked={plan.meals.some((meal) => meal.slot === slot.id)}
              onChange={() => step.toggleSlot(slot.id)}
            >
              <span>
                {mealLabel(
                  t,
                  { slot: slot.id, label: slot.label, time: slot.time },
                  locale,
                  settings,
                )}
              </span>
              <span className="text-[13px] font-normal tabular-nums opacity-70">
                {formatTimeOfDay(slot.time, locale)}
              </span>
            </ChoicePill>
          ))}
          {custom.map((meal) => (
            <span
              key={meal.id}
              className="border-primary bg-acc-soft text-acc-soft-text flex min-h-11 items-center gap-1 rounded-full border-[1.5px] pr-1.5 pl-3"
            >
              <input
                type="time"
                aria-label={t("medsCustomTimeLabel")}
                value={meal.time}
                onChange={(event) =>
                  step.setMealTime(meal.id, event.target.value)
                }
                className="focus-visible:outline-primary bg-transparent text-[15px] font-medium tabular-nums focus-visible:outline-2"
              />
              <button
                type="button"
                aria-label={fill(t("medsRemoveTime"), {
                  time: formatTimeOfDay(meal.time, locale),
                })}
                onClick={() => step.removeMeal(meal.id)}
                className="focus-visible:outline-primary flex size-[30px] items-center justify-center rounded-full text-[18px] focus-visible:outline-2"
              >
                <span aria-hidden>×</span>
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={step.addCustomMeal}
            className="text-ink-tertiary focus-visible:outline-primary flex min-h-11 items-center gap-1 rounded-full border-[1.5px] border-dashed border-(--care-dash-2) bg-transparent px-4 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span aria-hidden>+</span>
            {t("medsAddCustomTime")}
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <FieldLabel id="feed-days-label">{t("medsWhichDays")}</FieldLabel>
        <OptionCards
          label={t("medsWhichDays")}
          value={plan.dayRule}
          options={rules.map(ruleCard)}
          onChange={(dayRule) => step.update({ dayRule })}
        />
        {plan.dayRule === "certain_dates" ? (
          <div
            role="group"
            aria-labelledby="feed-days-label"
            className="flex flex-wrap gap-2 pt-1"
          >
            {stay.days.map((day) => (
              <ChoicePill
                key={day}
                type="checkbox"
                value={day}
                aria-label={formatCalendarDayLong(day, locale)}
                checked={plan.certainDays.includes(day)}
                onChange={() =>
                  step.update((current) => ({
                    certainDays: current.certainDays.includes(day)
                      ? current.certainDays.filter((d) => d !== day)
                      : [...current.certainDays, day].sort(),
                  }))
                }
                className="h-[60px] w-16 flex-col justify-center gap-0 rounded-[14px] px-0"
              >
                <span className="text-[12px] opacity-75">
                  {formatWeekday(weekdayOf(day), locale)}
                </span>
                <span className="text-[17px] font-semibold tabular-nums">
                  {Number(day.slice(8))}
                </span>
              </ChoicePill>
            ))}
          </div>
        ) : null}
      </div>
    </EditorSection>
  );
}
