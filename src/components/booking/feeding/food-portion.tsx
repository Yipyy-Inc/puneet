"use client";

import { AmountStepper } from "@/components/booking/care/amount-stepper";
import { FieldLabel } from "@/components/booking/care/editor-section";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { withFoodUnit, type PlanFood } from "@/lib/feeding/plan";
import {
  feedUnitOption,
  feedUnitWord,
  portionAmount,
  portionWords,
} from "@/lib/feeding/portion";
import { PORTION, type FeedUnit } from "@/lib/feeding/vocabulary";
import { fill, stepDown, stepUp } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// PORTION PER MEAL: the unit, the quick picks, − / + by the unit's own step
// (a number typed for grams, ounces, nuggets and ml), and the portion in
// words above it — "1½ cups per meal".
// ============================================================================

export function FoodPortion({
  step,
  food,
  units,
  index,
}: {
  step: FeedingStepState;
  food: PlanFood;
  /** The units this food can be measured in. */
  units: readonly FeedUnit[];
  index: number;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const spec = PORTION[food.unit];
  const id = `feed-portion-${index}`;
  const portion = portionWords(t, food, locale);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <FieldLabel
        id={id}
        aside={
          <span className="text-body-strong text-body-ink" aria-live="polite">
            {fill(t("feedPerMeal"), { portion })}
          </span>
        }
      >
        {t("feedPortionLabel")}
      </FieldLabel>

      <Segmented
        name={`feed-unit-${index}`}
        label={t("feedUnitLabel")}
        value={food.unit}
        options={units.map((unit) => ({
          value: unit,
          label: feedUnitOption(t, unit),
        }))}
        onChange={(unit) =>
          step.updateFood(food.id, (current) => withFoodUnit(current, unit))
        }
        className="self-start"
      />

      {food.unit === "custom" ? (
        <Input
          aria-label={t("feedCustomUnitLabel")}
          value={food.customUnit}
          maxLength={40}
          placeholder={t("feedCustomUnitPlaceholder")}
          onChange={(event) =>
            step.updateFood(food.id, { customUnit: event.target.value })
          }
          className="max-w-80"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-labelledby={id}
          className="flex flex-wrap gap-2"
        >
          {spec.presets.map((preset) => (
            <ChoicePill
              key={preset}
              type="radio"
              name={`feed-preset-${index}`}
              value={String(preset)}
              checked={food.amount === preset}
              onChange={() => step.updateFood(food.id, { amount: preset })}
              className="min-w-13 justify-center px-3"
            >
              {portionAmount(preset, food.unit, locale)}
            </ChoicePill>
          ))}
        </div>
        {/* Below 640px the stepper wraps under the picks, and a divider
            would be left at the end of their row. */}
        <span aria-hidden className="bg-line mx-1 h-7 w-px max-sm:hidden" />
        <AmountStepper
          amount={food.amount}
          label={portionAmount(food.amount, food.unit, locale)}
          typed={!spec.fraction}
          step={spec.step}
          onDown={() =>
            step.updateFood(food.id, (current) => ({
              amount: stepDown(current.amount, PORTION[current.unit].step),
            }))
          }
          onUp={() =>
            step.updateFood(food.id, (current) => ({
              amount: stepUp(current.amount, PORTION[current.unit].step),
            }))
          }
          onType={(amount) => step.updateFood(food.id, { amount })}
          decreaseLabel={t("feedDecrease")}
          increaseLabel={t("feedIncrease")}
          inputLabel={t("feedAmountInput")}
        />
        <span className="text-body text-ink-secondary">
          {feedUnitWord(t, food.unit, food.amount, locale, food.customUnit)}
        </span>
      </div>

      {!(food.amount > 0) ? (
        <p className="text-meta text-warning" aria-live="polite">
          {t("feedHintAmount")}
        </p>
      ) : null}
    </div>
  );
}
