"use client";

import { foodName, mealCount, panelFoodWords } from "@/lib/feeding/describe";
import { houseFoodName } from "@/lib/feeding/labels";
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
import { LookScope } from "@/components/look/look-context";
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
    <LookScope name="care-step">
      <section
        aria-label={fill(t("feedPanelLabel"), { pet: panel.petName })}
        className={cn(
          "border-line bg-card flex flex-col gap-4 rounded-[20px] border p-5",
          className,
        )}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-ink-tertiary text-[13px]">
            {service
              ? fill(t("medsPanelHeading"), { service, pet: panel.petName })
              : panel.petName}
          </span>
          <span className="text-body-ink text-[17px] font-semibold">
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
              className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-t border-(--care-row-2) py-2.5"
            >
              <div className="flex flex-col">
                <span className="text-body-ink text-[14px] font-semibold">
                  {formatStayDay(row.day, locale)}
                </span>
                {row.tag ? (
                  <span className="text-[11px] whitespace-nowrap text-(--care-micro)">
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
                    <div key={meal.id} className="flex gap-2 text-[13px]">
                      <span className="text-acc-soft-text min-w-[62px] font-semibold tabular-nums">
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
                  <span className="text-ink-disabled text-[13px]">
                    {t("feedNoMeals")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>

        {panel.packing.length > 0 ? (
          <div className="border-line flex flex-col gap-2 border-t pt-3">
            <span className="text-[12px] font-semibold tracking-[0.08em] text-(--care-micro) uppercase">
              {t("feedPackingList")}
            </span>
            {panel.packing.map(({ food, servings, extra, total }) => (
              <div
                key={food.id}
                className="flex justify-between gap-2 text-[14px]"
              >
                <span className="text-ink-secondary min-w-0">
                  {foodName(t, food, step.settings)}
                </span>
                <span className="text-body-ink shrink-0 font-semibold whitespace-nowrap tabular-nums">
                  {food.pack === "pre_portioned"
                    ? fill(
                        t(
                          isPluralOne(servings + extra, locale)
                            ? "feedPortionsOne"
                            : "feedPortionsOther",
                        ),
                        { count: servings + extra },
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
          <div className="flex justify-between gap-2 text-[14px]">
            <dt className="text-ink-tertiary">{t("feedTotalMeals")}</dt>
            <dd className="text-body-ink font-semibold tabular-nums">
              {panel.totalMeals}
            </dd>
          </div>
          {panel.addons
            .filter((addon) => addon.offered)
            .map((addon) => (
              <div
                key={`${addon.houseFoodId}:${addon.waived}`}
                className="flex justify-between gap-2 text-[14px]"
              >
                <dt className="text-ink-tertiary min-w-0">
                  {`${
                    addon.per === "day"
                      ? dayCount(t, addon.quantity, locale)
                      : mealCount(t, addon.quantity, locale)
                  } · ${houseFoodName(t, {
                    id: addon.houseFoodId,
                    name: addon.name,
                  })}`}
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
          <div className="border-line-strong flex justify-between gap-2 border-t border-dashed pt-2 text-[15px]">
            <dt className="text-body-ink font-medium">
              {t("feedAddonsTotal")}
            </dt>
            <dd className="text-body-ink font-bold tabular-nums">
              {panel.included
                ? t("feedIncluded")
                : formatMoney(panel.addonTotal, locale)}
            </dd>
          </div>
        </dl>
      </section>
    </LookScope>
  );
}
