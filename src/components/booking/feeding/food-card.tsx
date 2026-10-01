"use client";

import {
  Info,
  Package,
  Refrigerator,
  Snowflake,
  Tag,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";

import { FieldLabel } from "@/components/booking/care/editor-section";
import { OptionCards } from "@/components/booking/care/option-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { foodName } from "@/lib/feeding/describe";
import {
  brandPlaceholder,
  foodTypeLabel,
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
  type FoodStorage,
  type FoodType,
} from "@/lib/feeding/vocabulary";
import { formatMoney } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import {
  houseFoodFor,
  houseFoodIncluded,
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

const STORAGE_GLYPH: Record<FoodStorage, LucideIcon> = {
  pantry: Package,
  fridge_after_opening: Refrigerator,
  frozen: Snowflake,
  fridge: Refrigerator,
  follow_label: Tag,
};

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
  const offersHouse = settings.houseFoods.length > 0 || food.source === "house";
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
  const StorageGlyph = storage ? STORAGE_GLYPH[storage] : null;
  const included = houseFoodIncluded(settings, step.service);
  const price = (h: (typeof settings.houseFoods)[number]) =>
    included
      ? t("feedIncluded")
      : settings.pricing === "day"
        ? fill(t("feedPricePerDayShort"), {
            price: formatMoney(h.pricePerDay, locale),
          })
        : fill(t("feedPricePerMealShort"), {
            price: formatMoney(h.pricePerMeal, locale),
          });

  return (
    <div className="border-line overflow-hidden rounded-xl border">
      <div className="border-line bg-card flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
          <span className="text-body-strong text-body-ink">
            {fill(t("feedFoodTitle"), { n })}
          </span>
          <span className="text-body text-ink-secondary">
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
                const first = settings.houseFoods[0];
                if (source === "house" && !first) return;
                step.updateFood(food.id, (current) =>
                  source === "house" && first
                    ? asHouseFood(current, first)
                    : asOwnFood(current),
                );
              }}
            />
          ) : null}
          {plan.foods.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={fill(t("feedRemoveFood"), { n })}
              onClick={() => step.removeFood(food.id)}
            >
              <X className="size-5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        {food.source === "own" ? (
          <>
            <fieldset className="flex min-w-0 flex-col gap-2.5">
              <legend className="text-body-ink text-meta mb-2.5 font-semibold">
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
              <div className="grid items-end gap-3.5 sm:grid-cols-[minmax(0,1fr)_auto]">
                {show.brand ? (
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <FieldLabel htmlFor={`feed-brand-${index}`}>
                      {t("feedBrandLabel")}{" "}
                      <span className="text-ink-tertiary font-normal">
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
                    />
                  </div>
                ) : null}
                {storage && StorageGlyph ? (
                  <div className="flex min-h-10 items-center gap-2 max-lg:min-h-12">
                    <span className="text-micro text-ink-tertiary uppercase">
                      {t("feedStorageLabel")}
                    </span>
                    <Badge variant="checkedIn">
                      <StorageGlyph aria-hidden />
                      {storageLabel(t, storage)}
                    </Badge>
                  </div>
                ) : null}
              </div>
            ) : null}

            {show.packing ? (
              <div className="flex min-w-0 flex-col gap-2.5">
                <FieldLabel id={`feed-pack-${index}`}>
                  {t("feedPackLabel")}
                </FieldLabel>
                <div
                  role="radiogroup"
                  aria-labelledby={`feed-pack-${index}`}
                  className="flex flex-wrap gap-2"
                >
                  {PACKS.map((pack) => (
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
            {settings.houseFoods.length > 0 ? (
              <OptionCards
                label={t("feedHouseLabel")}
                value={house?.id ?? ""}
                options={settings.houseFoods.map((h) => ({
                  value: h.id,
                  title: h.name,
                  hint: h.description || undefined,
                  trailing: price(h),
                }))}
                onChange={(id) => {
                  const picked = houseFoodFor(settings, id);
                  if (picked) {
                    step.updateFood(food.id, (current) =>
                      withHouseFood(current, picked),
                    );
                  }
                }}
              />
            ) : null}
            {!house ? (
              <p className="text-meta text-warning flex items-center gap-2">
                <TriangleAlert className="size-4 shrink-0" aria-hidden />
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
                  {mealLabel(t, meal, locale)}
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
          <p className="text-meta text-warning flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("feedNotePrescription")}
          </p>
        ) : null}

        <FoodSummary step={step} food={food} />
      </div>
    </div>
  );
}
