"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { foodTypeLabel } from "@/lib/feeding/labels";
import { feedUnitOption } from "@/lib/feeding/portion";
import { FOOD, FOOD_TYPES, type FoodType } from "@/lib/feeding/vocabulary";
import type { HouseFood } from "@/lib/settings/feeding-instructions";
import type { Translate } from "@/lib/medications/dose";

// ============================================================================
// The facility's house foods: each one's name and description as the booking
// form shows them, the kind of food and the unit it is measured in, and its
// price per meal and per day — the facility's pricing choice decides which
// one a booking is charged.
// ============================================================================

/** A typed price, as a number the schema can judge. Blank is nothing. */
const priceOf = (value: string) => (value.trim() === "" ? 0 : Number(value));

function newHouseFood(): HouseFood {
  return {
    id: `hf-${crypto.randomUUID()}`,
    name: "",
    description: "",
    type: "kibble",
    unit: FOOD.kibble.units[0],
    pricePerMeal: 0,
    pricePerDay: 0,
  };
}

export function HouseFoodList({
  foods,
  onChange,
  t,
  words,
}: {
  foods: HouseFood[];
  onChange: (foods: HouseFood[]) => void;
  /** The settings section's words. */
  t: Translate;
  /** The booking form's words, for the vocabulary. */
  words: Translate;
}) {
  const set = (id: string, patch: Partial<HouseFood>) =>
    onChange(
      foods.map((food) => (food.id === id ? { ...food, ...patch } : food)),
    );

  return (
    <div className="space-y-3">
      {foods.length === 0 ? (
        <p className="text-meta text-ink-tertiary">{t("feedHouseEmpty")}</p>
      ) : null}
      <ul className="space-y-3">
        {foods.map((food) => {
          const named = food.name.trim() || t("feedHouseUnnamed");
          return (
            <li
              key={food.id}
              className="border-line grid gap-3 rounded-xl border p-3 sm:grid-cols-2"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={`${food.id}-name`}>{t("feedHouseName")}</Label>
                <Input
                  id={`${food.id}-name`}
                  value={food.name}
                  maxLength={80}
                  placeholder={t("feedHouseNamePh")}
                  onChange={(event) =>
                    set(food.id, { name: event.target.value })
                  }
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={`${food.id}-description`}>
                  {t("feedHouseDescription")}
                </Label>
                <Input
                  id={`${food.id}-description`}
                  value={food.description}
                  maxLength={120}
                  placeholder={t("feedHouseDescriptionPh")}
                  onChange={(event) =>
                    set(food.id, { description: event.target.value })
                  }
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={`${food.id}-type`}>{t("feedHouseType")}</Label>
                <Select
                  value={food.type}
                  onValueChange={(value) => {
                    const type = value as FoodType;
                    set(food.id, { type, unit: FOOD[type].units[0] });
                  }}
                >
                  <SelectTrigger id={`${food.id}-type`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {foodTypeLabel(words, type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={`${food.id}-unit`}>{t("feedHouseUnit")}</Label>
                <Select
                  value={food.unit}
                  onValueChange={(unit) =>
                    set(food.id, { unit: unit as HouseFood["unit"] })
                  }
                >
                  <SelectTrigger id={`${food.id}-unit`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD[food.type].units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {feedUnitOption(words, unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={`${food.id}-meal`}>
                  {t("feedHousePriceMeal")}
                </Label>
                <Input
                  id={`${food.id}-meal`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1000}
                  step={0.01}
                  value={String(food.pricePerMeal)}
                  onChange={(event) =>
                    set(food.id, { pricePerMeal: priceOf(event.target.value) })
                  }
                  className="tabular-nums"
                />
              </div>
              <div className="flex min-w-0 items-end gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label htmlFor={`${food.id}-day`}>
                    {t("feedHousePriceDay")}
                  </Label>
                  <Input
                    id={`${food.id}-day`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={1000}
                    step={0.01}
                    value={String(food.pricePerDay)}
                    onChange={(event) =>
                      set(food.id, { pricePerDay: priceOf(event.target.value) })
                    }
                    className="tabular-nums"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("feedHouseRemove").replace("{name}", named)}
                  onClick={() =>
                    onChange(
                      foods.filter((candidate) => candidate.id !== food.id),
                    )
                  }
                >
                  <Trash2 className="size-5" aria-hidden />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...foods, newHouseFood()])}
      >
        <Plus className="size-4" aria-hidden />
        {t("feedHouseAdd")}
      </Button>
    </div>
  );
}
