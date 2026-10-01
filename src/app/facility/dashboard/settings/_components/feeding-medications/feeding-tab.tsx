"use client";

import { foodTypeLabel, mealSlotLabel } from "@/lib/feeding/labels";
import {
  FEEDING_DAY_RULES,
  FOOD_TYPES,
  MEAL_SLOTS,
  type FoodType,
} from "@/lib/feeding/vocabulary";
import type { AppLocale } from "@/lib/language-settings";
import type { CareService } from "@/lib/settings/care-setup";
import {
  FEEDING_PAGE_PARTS,
  type FeedingInstructions,
  type FeedingPagePart,
} from "@/lib/settings/feeding-instructions";

import { HouseFoodCard } from "./house-food-card";
import { MoreOptionsCard } from "./more-options-card";
import { OptionListsCard } from "./option-lists-card";
import { PackingCard } from "./packing-card";
import { ServiceUseCard } from "./service-use-card";
import { TimeRowsCard } from "./time-rows-card";
import { TypeCardsCard } from "./type-cards-card";
import type { CareSetup } from "./use-care-setup";

// ============================================================================
// THE FEEDING TAB, in the client's order: where the step appears, meal times,
// food types, house food, packing, the quick picks — then what the design
// leaves out and the step still needs (which days, parts of the page).
// ============================================================================

/** Each card's keys: what "Changed from default" and "Reset" measure. */
export const FEEDING_SECTIONS = {
  "f-services": ["services"],
  "f-times": ["meals"],
  "f-types": ["foodTypes"],
  "f-house": ["house"],
  "f-packing": ["packs", "extraMeals"],
  "f-options": ["styles", "habits", "skip", "allergies"],
  "f-more": ["dayRules", "show"],
} as const satisfies Record<string, readonly (keyof FeedingInstructions)[]>;

/** Where each kind of food is kept — the line under its name. */
const FOOD_TYPE_SUB: Record<FoodType, string> = {
  kibble: "subPantry",
  wet: "subFridgeAfterOpening",
  raw: "subFreezer",
  patties: "subFreezer",
  freeze_dried: "subPantry",
  dehydrated: "subPantry",
  fresh: "subFridge",
  homemade: "subFridge",
  prescription: "subVetLabel",
  topper: "subFridgeAfterOpening",
  other: "subDescribes",
};

const PART_KEY: Record<FeedingPagePart, string> = {
  brand: "partBrand",
  prep: "partPrep",
  treats: "partTreats",
  notes: "partFeedingNotes",
  saveToProfile: "partSaveToProfile",
};

export function FeedingTab({
  setup,
  others,
  t,
  bt,
  locale,
}: {
  setup: CareSetup;
  others: CareService[];
  t: (key: string) => string;
  bt: (key: string) => string;
  locale: AppLocale;
}) {
  const { feeding, setFeeding, feedingChanged, resetFeeding, removed } = setup;
  const section = (id: keyof typeof FEEDING_SECTIONS) => ({
    changed: feedingChanged(FEEDING_SECTIONS[id]),
    onReset: () => resetFeeding(FEEDING_SECTIONS[id]),
  });

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ServiceUseCard
        id="f-services"
        title={t("feedServicesTitle")}
        help={t("feedServicesHelp")}
        services={feeding.services}
        others={others}
        onChange={(services) => setFeeding({ services })}
        t={t}
        {...section("f-services")}
      />
      <TimeRowsCard
        id="f-times"
        title={t("mealsTitle")}
        help={t("mealsHelp")}
        rows={feeding.meals}
        builtIn={MEAL_SLOTS}
        builtInName={(id) => mealSlotLabel(bt, id)}
        prefix="meal"
        newName={t("newMeal")}
        addLabel={t("addMealTime")}
        onChange={(change) =>
          setFeeding((current) => ({ meals: change(current.meals) }))
        }
        removed={removed}
        t={t}
        {...section("f-times")}
      />
      <TypeCardsCard<FoodType>
        id="f-types"
        title={t("foodTypesTitle")}
        help={t("foodTypesHelp")}
        items={FOOD_TYPES.map((type) => ({
          id: type,
          label: foodTypeLabel(bt, type),
          sub: t(FOOD_TYPE_SUB[type]),
        }))}
        on={feeding.foodTypes}
        onChange={(foodTypes) => setFeeding({ foodTypes })}
        t={t}
        {...section("f-types")}
      />
      <HouseFoodCard
        house={feeding.house}
        onChange={(change) =>
          setFeeding((current) => ({ house: change(current.house) }))
        }
        removed={removed}
        t={t}
        bt={bt}
        locale={locale}
        {...section("f-house")}
      />
      <PackingCard
        packs={feeding.packs}
        extraMeals={feeding.extraMeals}
        onPacks={(packs) => setFeeding({ packs })}
        onExtra={(extraMeals) => setFeeding({ extraMeals })}
        t={t}
        bt={bt}
        locale={locale}
        {...section("f-packing")}
      />
      <OptionListsCard
        lists={{
          styles: feeding.styles,
          habits: feeding.habits,
          skip: feeding.skip,
          allergies: feeding.allergies,
        }}
        onChange={(list, change) =>
          setFeeding((current) => ({ [list]: change(current[list]) }))
        }
        removed={removed}
        t={t}
        bt={bt}
        {...section("f-options")}
      />
      <MoreOptionsCard<FeedingPagePart>
        id="f-more"
        rules={FEEDING_DAY_RULES}
        dayRules={feeding.dayRules}
        onDayRules={(dayRules) =>
          setFeeding({ dayRules: dayRules as FeedingInstructions["dayRules"] })
        }
        parts={FEEDING_PAGE_PARTS}
        partKey={PART_KEY}
        show={feeding.show}
        onShow={(show) => setFeeding({ show })}
        t={t}
        bt={bt}
        {...section("f-more")}
      />
    </div>
  );
}
