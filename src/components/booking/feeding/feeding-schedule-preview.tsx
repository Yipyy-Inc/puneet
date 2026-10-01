"use client";

import { foodName, mealCount, panelFoodWords } from "@/lib/feeding/describe";
import { feedUnitWord, portionAmount } from "@/lib/feeding/portion";
import {
  formatDayRange,
  formatMoney,
  formatStayDay,
  formatTimeOfDay,
  isPluralOne,
} from "@/lib/i18n/format";
import { dayCount } from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import { hasCheckoutDay } from "@/lib/medications/schedule";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { cn } from "@/lib/utils";

import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// The stay and its meals, for the pet being looked at: a row per day with
// each meal's time and food, what the owner has to pack, the total meals, and
// the house food on the bill. The client's design puts it beside the plan;
// Yipyy puts it in the booking form's LEFT rail, under the steps, and after
// the plan where there is no rail (below 1024px).
// ============================================================================

export function FeedingSchedulePreview({
  step,
  className,
}: {
  step: FeedingStepState;
  className?: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const { stay, panel } = step;
  if (!step.ready || stay.days.length === 0 || !panel.petName) return null;

  const first = stay.days[0];
  const last = stay.days[stay.days.length - 1];
  const overnight = hasCheckoutDay(stay);
  const nights = stay.days.length - 1;
  const length = overnight
    ? fill(
        t(isPluralOne(nights, locale) ? "medsNightsOne" : "medsNightsOther"),
        { count: nights },
      )
    : dayCount(t, stay.days.length, locale);
  const service =
    step.service === "boarding"
      ? t("medsServiceBoarding")
      : step.service === "daycare"
        ? t("medsServiceDaycare")
        : "";

  return (
    <section
      aria-label={fill(t("feedPanelLabel"), { pet: panel.petName })}
      className={cn(
        "border-line bg-card flex flex-col gap-4 rounded-xl border p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-meta text-ink-tertiary">
          {service
            ? fill(t("medsPanelHeading"), { service, pet: panel.petName })
            : panel.petName}
        </span>
        <span className="text-body-strong text-body-ink">
          {fill(t("medsPanelRange"), {
            range: formatDayRange(first, last, locale),
            length,
          })}
        </span>
      </div>

      <ol className="flex flex-col">
        {panel.rows.map((row) => (
          <li
            key={row.day}
            className="border-line grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-t py-2.5"
          >
            <div className="flex flex-col">
              <span className="text-meta text-body-ink font-semibold">
                {formatStayDay(row.day, locale)}
              </span>
              {row.tag ? (
                <span className="text-micro text-ink-tertiary whitespace-nowrap uppercase">
                  {t(
                    row.tag === "check_in"
                      ? "medsTagCheckIn"
                      : "medsTagCheckout",
                  )}
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              {row.meals.length > 0 ? (
                row.meals.map(({ meal, foods }) => (
                  <div key={meal.id} className="text-meta flex gap-2">
                    <span className="text-body-ink min-w-17 font-semibold tabular-nums">
                      {formatTimeOfDay(meal.time, locale)}
                    </span>
                    <span className="text-ink-secondary min-w-0">
                      {foods.length > 0
                        ? foods
                            .map((food) =>
                              panelFoodWords(t, food, locale, step.settings),
                            )
                            .join(" + ")
                        : "—"}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-meta text-ink-tertiary">
                  {t("feedNoMeals")}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {panel.packing.length > 0 ? (
        <div className="border-line flex flex-col gap-2 border-t pt-3">
          <span className="text-micro text-ink-tertiary uppercase">
            {t("feedPackingList")}
          </span>
          {panel.packing.map(({ food, servings, total }) => (
            <div key={food.id} className="text-meta flex justify-between gap-2">
              <span className="text-ink-secondary min-w-0">
                {foodName(t, food, step.settings)}
              </span>
              <span className="text-body-ink shrink-0 font-semibold whitespace-nowrap tabular-nums">
                {food.pack === "pre_portioned"
                  ? fill(
                      t(
                        isPluralOne(servings, locale)
                          ? "feedPortionsOne"
                          : "feedPortionsOther",
                      ),
                      { count: servings },
                    )
                  : `${portionAmount(total, food.unit, locale)} ${feedUnitWord(
                      t,
                      food.unit,
                      total,
                      locale,
                      food.customUnit,
                    )}`}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <dl className="border-line flex flex-col gap-2 border-t pt-3">
        <div className="text-meta flex justify-between gap-2">
          <dt className="text-ink-tertiary">{t("feedTotalMeals")}</dt>
          <dd className="text-body-ink font-semibold tabular-nums">
            {panel.totalMeals}
          </dd>
        </div>
        {panel.addons.map((addon) => (
          <div
            key={`${addon.houseFoodId}:${addon.waived}`}
            className="text-meta flex justify-between gap-2"
          >
            <dt className="text-ink-tertiary min-w-0">
              {`${
                addon.per === "day"
                  ? dayCount(t, addon.quantity, locale)
                  : mealCount(t, addon.quantity, locale)
              } · ${addon.name}`}
            </dt>
            <dd className="text-body-ink shrink-0 font-semibold tabular-nums">
              {addon.included
                ? t("feedIncluded")
                : addon.waived
                  ? t("medsWaived")
                  : formatMoney(addon.amount, locale)}
            </dd>
          </div>
        ))}
        <div className="border-line-strong text-body flex justify-between gap-2 border-t border-dashed pt-2">
          <dt className="text-body-ink font-medium">{t("feedAddonsTotal")}</dt>
          <dd className="text-body-ink font-bold tabular-nums">
            {panel.included
              ? t("feedIncluded")
              : formatMoney(panel.addonTotal, locale)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
