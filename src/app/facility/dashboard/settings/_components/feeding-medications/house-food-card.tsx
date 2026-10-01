"use client";

import { Plus } from "lucide-react";

import { OptionCards } from "@/components/booking/care/option-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  foodTypeLabel,
  houseFoodDescription,
  houseFoodName,
} from "@/lib/feeding/labels";
import { feedUnitOption } from "@/lib/feeding/portion";
import {
  FOOD,
  FOOD_TYPES,
  isBuiltInHouseFood,
  type FeedUnit,
  type FoodType,
} from "@/lib/feeding/vocabulary";
import type { AppLocale } from "@/lib/language-settings";
import { fill } from "@/lib/medications/dose";
import { newRowId } from "@/lib/settings/care-setup";
import type {
  FeedingInstructions,
  HouseFood,
  HouseFoodPricing,
} from "@/lib/settings/feeding-instructions";

import { MoneyInput } from "./money-input";
import { SetupCard } from "./setup-card";

// ============================================================================
// HOUSE FOOD: the food the facility provides — "Facility provides" on the
// booking form. Switched on or off as a whole; charged per meal, per day, or
// included in the price; each food on or off, named, measured, priced. The
// three the page comes with are the facility's to rename, price or switch
// off, not to delete; the ones it adds it can remove, with an Undo.
// ============================================================================

export function HouseFoodCard({
  house,
  onChange,
  changed,
  onReset,
  removed,
  t,
  bt,
  locale,
}: {
  house: FeedingInstructions["house"];
  /** Changes house food as it is then — an Undo restores into the current list. */
  onChange: (
    change: (
      house: FeedingInstructions["house"],
    ) => FeedingInstructions["house"],
  ) => void;
  changed: boolean;
  onReset: () => void;
  removed: (name: string, undo: () => void) => void;
  /** The page's words. */
  t: (key: string) => string;
  /** The booking form's vocabulary: kinds of food, units, house food names. */
  bt: (key: string) => string;
  locale: AppLocale;
}) {
  const setFood = (id: string, patch: Partial<HouseFood>) =>
    onChange((current) => ({
      ...current,
      foods: current.foods.map((food) =>
        food.id === id ? { ...food, ...patch } : food,
      ),
    }));
  const priceKey =
    house.pricing === "day" ? "pricePerDay" : ("pricePerMeal" as const);

  return (
    <SetupCard
      id="f-house"
      title={t("houseTitle")}
      help={t("houseHelp")}
      aside={
        <Switch
          checked={house.on}
          onCheckedChange={(on) => onChange((current) => ({ ...current, on }))}
          aria-label={t("houseSwitch")}
        />
      }
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      {house.on ? (
        <>
          <div className="flex min-w-0 flex-col gap-2.5 px-5 py-4 sm:px-6">
            <span className="text-body-strong text-body-ink">
              {t("houseCharge")}
            </span>
            <OptionCards<HouseFoodPricing>
              label={t("houseCharge")}
              value={house.pricing}
              columns="sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]"
              options={[
                {
                  value: "included",
                  title: t("pricingIncluded"),
                  hint: t("pricingIncludedSub"),
                },
                {
                  value: "meal",
                  title: t("pricingMeal"),
                  hint: t("pricingMealSub"),
                },
                {
                  value: "day",
                  title: t("pricingDay"),
                  hint: t("pricingDaySub"),
                },
              ]}
              onChange={(pricing) =>
                onChange((current) => ({ ...current, pricing }))
              }
            />
          </div>

          <div
            aria-hidden
            className="border-line text-micro text-ink-tertiary hidden grid-cols-[3.25rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,9rem)_6rem] gap-3 border-t px-6 py-2.5 uppercase sm:grid"
          >
            <span>{t("colOn")}</span>
            <span>{t("colFood")}</span>
            <span>{t("colUnit")}</span>
            <span>
              {house.pricing === "day"
                ? t("colPricePerDay")
                : house.pricing === "meal"
                  ? t("colPricePerMeal")
                  : t("colPrice")}
            </span>
            <span />
          </div>

          <div className="flex flex-col">
            {house.foods.map((food, index) => {
              const builtIn = isBuiltInHouseFood(food.id);
              const name = builtIn
                ? (food.name ?? houseFoodName(bt, { id: food.id }))
                : (food.name ?? "");
              const description = builtIn
                ? (food.description ?? houseFoodDescription(bt, food))
                : (food.description ?? "");
              const shown = name.trim() || houseFoodName(bt, food);
              return (
                <div
                  key={food.id}
                  // Below 640px: the switch and its tag, the food, then its
                  // unit and price side by side (§6 rule 6).
                  className="border-line flex min-w-0 flex-wrap items-center gap-3 border-t px-5 py-3.5 sm:grid sm:grid-cols-[3.25rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,9rem)_6rem] sm:px-6"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <Switch
                      checked={food.on}
                      onCheckedChange={(on) => setFood(food.id, { on })}
                      aria-label={fill(t("houseFoodOn"), { name: shown })}
                    />
                    <span className="text-meta text-ink-tertiary sm:hidden">
                      {t("colOn")}
                    </span>
                  </div>
                  <div className="flex min-w-0 basis-full flex-col gap-2 max-sm:order-2 sm:basis-auto">
                    <Input
                      value={name}
                      maxLength={80}
                      placeholder={t("houseNamePlaceholder")}
                      aria-label={fill(t("houseNameLabel"), { n: index + 1 })}
                      aria-invalid={!builtIn && !name.trim() ? true : undefined}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFood(food.id, {
                          name:
                            builtIn &&
                            value === houseFoodName(bt, { id: food.id })
                              ? undefined
                              : value,
                        });
                      }}
                      onBlur={() => {
                        if (builtIn && !food.name?.trim()) {
                          setFood(food.id, { name: undefined });
                        }
                      }}
                    />
                    <Input
                      value={description}
                      maxLength={120}
                      placeholder={t("houseDescriptionPlaceholder")}
                      aria-label={fill(t("houseDescriptionLabel"), {
                        name: shown,
                      })}
                      onChange={(event) =>
                        setFood(food.id, { description: event.target.value })
                      }
                    />
                    <Select
                      value={food.type}
                      onValueChange={(value) => {
                        const type = value as FoodType;
                        setFood(food.id, { type, unit: FOOD[type].units[0] });
                      }}
                    >
                      <SelectTrigger
                        aria-label={fill(t("houseTypeLabel"), { name: shown })}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {foodTypeLabel(bt, type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex min-w-0 basis-full gap-3 max-sm:order-3 sm:contents">
                    <div className="min-w-0">
                      <Select
                        value={food.unit}
                        onValueChange={(value) =>
                          setFood(food.id, { unit: value as FeedUnit })
                        }
                      >
                        <SelectTrigger
                          aria-label={fill(t("houseUnitLabel"), {
                            name: shown,
                          })}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FOOD[food.type].units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {feedUnitOption(bt, unit)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 flex-1">
                      {house.pricing === "included" ? (
                        <span className="text-meta text-success flex min-h-10 items-center font-semibold max-lg:min-h-12">
                          {t("houseIncluded")}
                        </span>
                      ) : (
                        <MoneyInput
                          value={food[priceKey]}
                          onChange={(amount) =>
                            setFood(food.id, { [priceKey]: amount })
                          }
                          label={fill(
                            t(
                              house.pricing === "day"
                                ? "housePricePerDayLabel"
                                : "housePricePerMealLabel",
                            ),
                            { name: shown },
                          )}
                          locale={locale}
                        />
                      )}
                    </div>
                  </div>
                  <div className="ml-auto flex min-h-10 items-center max-lg:min-h-12 max-sm:order-1 sm:ml-0 sm:justify-end">
                    {builtIn ? (
                      <span className="text-micro text-ink-tertiary uppercase">
                        {t("defaultTag")}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        aria-label={fill(t("removeNamed"), { name: shown })}
                        onClick={() => {
                          onChange((current) => ({
                            ...current,
                            foods: current.foods.filter(
                              (candidate) => candidate.id !== food.id,
                            ),
                          }));
                          removed(shown, () =>
                            onChange((current) =>
                              current.foods.some(
                                (candidate) => candidate.id === food.id,
                              )
                                ? current
                                : {
                                    ...current,
                                    foods: [
                                      ...current.foods.slice(0, index),
                                      food,
                                      ...current.foods.slice(index),
                                    ],
                                  },
                            ),
                          );
                        }}
                      >
                        {t("remove")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-line border-t px-5 py-3.5 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="border-dashed"
              disabled={house.foods.length >= 30}
              onClick={() => {
                const food: HouseFood = {
                  id: newRowId("hf"),
                  name: "",
                  description: "",
                  type: "kibble",
                  unit: "cup",
                  pricePerMeal: 0,
                  pricePerDay: 0,
                  on: true,
                };
                onChange((current) => ({
                  ...current,
                  foods: [...current.foods, food],
                }));
              }}
            >
              <Plus aria-hidden />
              {t("addHouseFood")}
            </Button>
          </div>
        </>
      ) : null}
    </SetupCard>
  );
}
