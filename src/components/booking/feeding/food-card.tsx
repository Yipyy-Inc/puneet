"use client";

import { FieldLabel } from "@/components/booking/care/editor-section";
import { OptionCards } from "@/components/booking/care/option-cards";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { foodName } from "@/lib/feeding/describe";
import {
  brandPlaceholder,
  foodTypeLabel,
  houseFoodDescription,
  houseFoodName,
  mealLabel,
  packLabel,
  prepLabel,
  storageLabel,
} from "@/lib/feeding/labels";
import {
  asHouseFood,
  asOwnFood,
  toggledServedAt,
  withFoodType,
  withHouseFood,
  type PlanFood,
} from "@/lib/feeding/plan";
import { sortedMeals } from "@/lib/feeding/schedule";
import {
  FOOD,
  PACKS,
  type FeedUnit,
  type FoodType,
} from "@/lib/feeding/vocabulary";
import { formatMoney } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import {
  houseFoodFor,
  houseFoodIncluded,
  offeredHouseFoods,
  type HouseFood,
} from "@/lib/settings/feeding-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import { FoodPortion } from "./food-portion";
import { FoodSummary } from "./food-summary";
import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// One food of the plan: who provides it; the owner's — its kind, brand,
// where it is kept, how it is packed — or the facility's house food; the
// portion; which meals it is served at; how it is prepared; and what it comes
// to over the stay.
// ============================================================================

export function FoodCard({
  step,
  food,
  index,
}: {
  step: FeedingStepState;
  food: PlanFood;
  index: number;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const plan = step.plan!;
  const { settings } = step;
  const show = settings.show;
  const n = index + 1;
  const house =
    food.source === "house"
      ? houseFoodFor(settings, food.houseFoodId)
      : undefined;
  const houses = offeredHouseFoods(settings);
  const offersHouse = houses.length > 0 || food.source === "house";
  // Still on the facility's list, and house food still switched on.
  const stillOffered = Boolean(house && houses.includes(house));
  const packs = PACKS.filter(
    (pack) => settings.packs.includes(pack) || pack === food.pack,
  );
  const meals = sortedMeals(plan.meals);
  const types: FoodType[] = settings.foodTypes.includes(food.type)
    ? settings.foodTypes
    : [...settings.foodTypes, food.type];
  // The kind of food that decides the units and the preparation: the house
  // food's own, for the facility's.
  const kind: FoodType = house?.type ?? food.type;
  const units: readonly FeedUnit[] =
    food.source === "house"
      ? [house?.unit ?? food.unit]
      : FOOD[food.type].units;
  const storage = food.source === "own" ? FOOD[food.type].storage : null;
  const included = houseFoodIncluded(settings);
  const named = (h: HouseFood) => ({
    id: h.id,
    name: houseFoodName(t, h),
    unit: h.unit,
  });
  const price = (h: HouseFood) =>
    included
      ? t("feedIncluded")
      : settings.house.pricing === "day"
        ? fill(t("feedPricePerDayShort"), {
            price: formatMoney(h.pricePerDay, locale),
          })
        : fill(t("feedPricePerMealShort"), {
            price: formatMoney(h.pricePerMeal, locale),
          });

  return (
    <div className="border-line overflow-hidden rounded-[16px] border">
      <div className="bg-surface-inset flex flex-wrap items-center justify-between gap-3 border-b border-(--row-line) px-[18px] py-3.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
          <span className="text-body-ink text-[15px] font-semibold">
            {fill(t("feedFoodTitle"), { n })}
          </span>
          <span className="text-ink-tertiary text-[14px]">
            {food.source === "house"
              ? foodName(t, food, settings)
              : foodTypeLabel(t, food.type)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {offersHouse ? (
            <Segmented
              name={`feed-source-${index}`}
              label={fill(t("feedSourceLabel"), { n })}
              value={food.source}
              options={[
                { value: "own", label: t("feedSourceOwn") },
                { value: "house", label: t("feedSourceHouse") },
              ]}
              onChange={(source) => {
                if (source === food.source) return;
                const first = houses[0];
                if (source === "house" && !first) return;
                step.updateFood(food.id, (current) =>
                  source === "house" && first
                    ? asHouseFood(current, named(first))
                    : asOwnFood(current),
                );
              }}
              className="bg-surface-inset-2 rounded-[10px]"
            />
          ) : null}
          {plan.foods.length > 1 ? (
            <button
              type="button"
              aria-label={fill(t("feedRemoveFood"), { n })}
              onClick={() => step.removeFood(food.id)}
              className="text-ink-tertiary focus-visible:outline-primary flex size-9 items-center justify-center rounded-[10px] text-[22px] focus-visible:outline-2"
            >
              <span aria-hidden>×</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-[18px] p-4 sm:p-[18px]">
        {food.source === "own" ? (
          <>
            <fieldset className="flex min-w-0 flex-col gap-2.5">
              <legend className="text-body-ink mb-2.5 text-[14px] font-medium">
                {t("feedTypeLabel")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {types.map((type) => (
                  <ChoicePill
                    key={type}
                    type="radio"
                    name={`feed-type-${index}`}
                    value={type}
                    checked={food.type === type}
                    onChange={() =>
                      step.updateFood(food.id, (current) =>
                        withFoodType(current, type),
                      )
                    }
                  >
                    {foodTypeLabel(t, type)}
                  </ChoicePill>
                ))}
              </div>
            </fieldset>

            {show.brand || storage ? (
              <div className="grid items-end gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                {show.brand ? (
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <FieldLabel htmlFor={`feed-brand-${index}`}>
                      {t("feedBrandLabel")}{" "}
                      <span className="font-normal text-(--care-micro)">
                        {t("medsOptional")}
                      </span>
                    </FieldLabel>
                    <Input
                      id={`feed-brand-${index}`}
                      value={food.brand}
                      maxLength={120}
                      autoComplete="off"
                      placeholder={brandPlaceholder(t, food.type)}
                      onChange={(event) =>
                        step.updateFood(food.id, { brand: event.target.value })
                      }
                      className="h-12 rounded-[12px] px-3.5 text-[16px] max-lg:h-12"
                    />
                  </div>
                ) : null}
                {storage ? (
                  <div className="text-ink-secondary flex h-12 items-center gap-2 text-[14px]">
                    <span className="text-[12px] font-semibold tracking-[0.04em] text-(--care-micro) uppercase">
                      {t("feedStorageLabel")}
                    </span>
                    <span className="rounded-full bg-(--storage-bg) px-2.5 py-1.5 font-medium text-(--storage-ink)">
                      {storageLabel(t, storage)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {packs.length > 0 ? (
              <div className="flex min-w-0 flex-col gap-2.5">
                <FieldLabel id={`feed-pack-${index}`}>
                  {t("feedPackLabel")}
                </FieldLabel>
                <div
                  role="radiogroup"
                  aria-labelledby={`feed-pack-${index}`}
                  className="flex flex-wrap gap-2"
                >
                  {packs.map((pack) => (
                    <ChoicePill
                      key={pack}
                      type="radio"
                      name={`feed-pack-${index}`}
                      value={pack}
                      checked={food.pack === pack}
                      onChange={() => step.updateFood(food.id, { pack })}
                    >
                      {packLabel(t, pack)}
                    </ChoicePill>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex min-w-0 flex-col gap-2.5">
            <FieldLabel>{t("feedHouseLabel")}</FieldLabel>
            {houses.length > 0 ? (
              <OptionCards
                label={t("feedHouseLabel")}
                value={house?.id ?? ""}
                options={houses.map((h) => ({
                  value: h.id,
                  title: houseFoodName(t, h),
                  hint: houseFoodDescription(t, h) || undefined,
                  trailing: price(h),
                }))}
                onChange={(id) => {
                  const picked = houseFoodFor(settings, id);
                  if (picked) {
                    step.updateFood(food.id, (current) =>
                      withHouseFood(current, named(picked)),
                    );
                  }
                }}
              />
            ) : null}
            {!stillOffered ? (
              <p className="rounded-[10px] bg-(--note-bg) px-3 py-2.5 text-[13px] text-(--note-ink)">
                {t("feedHouseGone")}
              </p>
            ) : null}
          </div>
        )}

        <FoodPortion step={step} food={food} units={units} index={index} />

        {meals.length > 1 ? (
          <div className="flex min-w-0 flex-col gap-2.5">
            <FieldLabel id={`feed-served-${index}`}>
              {t("feedServedAt")}
            </FieldLabel>
            <div
              role="group"
              aria-labelledby={`feed-served-${index}`}
              className="flex flex-wrap gap-2"
            >
              <ChoicePill
                type="checkbox"
                checked={!food.servedAt}
                onChange={() => step.updateFood(food.id, { servedAt: null })}
              >
                {t("feedEveryMeal")}
              </ChoicePill>
              {meals.map((meal) => (
                <ChoicePill
                  key={meal.id}
                  type="checkbox"
                  value={meal.id}
                  checked={Boolean(food.servedAt?.includes(meal.id))}
                  onChange={() =>
                    step.updateFood(food.id, (current) => ({
                      servedAt: toggledServedAt(current, meal.id),
                    }))
                  }
                >
                  {mealLabel(t, meal, locale, settings)}
                </ChoicePill>
              ))}
            </div>
          </div>
        ) : null}

        {show.prep && FOOD[kind].prep.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2.5">
            <FieldLabel id={`feed-prep-${index}`}>
              {t("feedPrepLabel")}
            </FieldLabel>
            <div
              role="group"
              aria-labelledby={`feed-prep-${index}`}
              className="flex flex-wrap gap-2"
            >
              {FOOD[kind].prep.map((prep) => (
                <ChoicePill
                  key={prep}
                  type="checkbox"
                  value={prep}
                  checked={food.prep.includes(prep)}
                  onChange={() =>
                    step.updateFood(food.id, (current) => ({
                      prep: current.prep.includes(prep)
                        ? current.prep.filter((p) => p !== prep)
                        : [...current.prep, prep],
                    }))
                  }
                >
                  {prepLabel(t, prep)}
                </ChoicePill>
              ))}
            </div>
          </div>
        ) : null}

        {food.source === "own" && FOOD[food.type].note === "prescription" ? (
          <p className="rounded-[10px] bg-(--note-bg) px-3 py-2.5 text-[13px] text-(--note-ink)">
            {t("feedNotePrescription")}
          </p>
        ) : null}

        <FoodSummary step={step} food={food} />
      </div>
    </div>
  );
}
