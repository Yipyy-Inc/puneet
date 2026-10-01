"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/ui/save-bar";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useFeedingInstructions,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { foodTypeLabel, mealSlotLabel } from "@/lib/feeding/labels";
import { FEEDING_DAY_RULES, FOOD_TYPES } from "@/lib/feeding/vocabulary";
import {
  FEEDING_PAGE_PARTS,
  FEEDING_SERVICES,
  feedingInstructionsSchema,
  type FeedingInstructions,
  type FeedingPagePart,
  type FeedingService,
} from "@/lib/settings/feeding-instructions";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { MedDayRule } from "@/types/base";

import { HouseFoodList } from "./feeding-house-foods";

// ============================================================================
// Feeding instructions — what the booking form's Feeding step shows, and the
// house food the facility provides, at what price (2026-10-01). The words are
// the booking form's own (the kinds of food, the meal times, the days), so a
// facility reads here exactly what a customer will read there. It replaced
// nine lists of words the facility typed, which the form could not translate
// and nobody had saved.
// ============================================================================

const DAY_RULE_KEY: Record<MedDayRule, string> = {
  every_day: "medsDaysEveryDay",
  except_checkout: "medsDaysExceptCheckout",
  certain_dates: "medsDaysCertain",
};

const PART_KEY: Record<FeedingPagePart, string> = {
  brand: "partBrand",
  packing: "partPacking",
  prep: "partPrep",
  styles: "partStyles",
  habits: "partHabits",
  skip: "partSkip",
  treats: "partTreats",
  allergies: "partFoodAllergies",
  notes: "partFeedingNotes",
  saveToProfile: "partSaveToProfile",
};

const SERVICE_KEY: Record<FeedingService, string> = {
  boarding: "feedIncludedBoarding",
  daycare: "feedIncludedDaycare",
};

function toggled<T>(list: readonly T[], value: T, order: readonly T[]): T[] {
  const next = list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
  return order.filter((item) => next.includes(item));
}

// Nothing renders until the row has arrived — the editor seeds `useState`, and
// a first Save against the fallback would write it over the facility's own
// (check:settings-seeding).
export function FeedingInstructionsCard() {
  const { instructions, configured, isPending } = useFeedingInstructions();
  if (isPending) return <Skeleton className="h-160 w-full rounded-2xl" />;
  return (
    <FeedingInstructionsEditor
      key={configured ? "stored" : "shipped"}
      initial={instructions}
    />
  );
}

function Group({
  id,
  title,
  help,
  children,
}: {
  id: string;
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border-line space-y-3 border-t pt-6 first:border-t-0 first:pt-0"
      aria-labelledby={id}
    >
      <div className="min-w-0">
        <h3 id={id} className="text-body-strong text-body-ink">
          {title}
        </h3>
        <p className="text-meta text-ink-tertiary">{help}</p>
      </div>
      {children}
    </section>
  );
}

function FeedingInstructionsEditor({
  initial,
}: {
  initial: FeedingInstructions;
}) {
  const t = useSettingsText().section("care-tasks");
  const words = useShellText("booking");
  const save = useSaveFacilitySetting();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (patch: Partial<FeedingInstructions>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const handleSave = () => {
    if (draft.foodTypes.length === 0) {
      toast.error(t("feedTypesAtLeastOne"));
      return;
    }
    if (draft.dayRules.length === 0) {
      toast.error(t("medDaysAtLeastOne"));
      return;
    }
    if (!draft.customTimes && !draft.meals.some((slot) => slot.enabled)) {
      toast.error(t("feedMealsAtLeastOne"));
      return;
    }
    if (draft.houseFoods.some((food) => !food.name.trim())) {
      toast.error(t("feedHouseNameNeeded"));
      return;
    }
    const parsed = feedingInstructionsSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(t("feedingInvalid"));
      return;
    }
    save.mutate(
      { domain: "feeding_instructions", value: parsed.data },
      {
        onSuccess: () => {
          setSaved(parsed.data);
          setDraft(parsed.data);
          toast.success(t("feedingSaved"));
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : t("instructionsNotSaved"),
          ),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section text-heading">
          {t("feedingInstructionsTitle")}
        </CardTitle>
        <p className="text-meta text-ink-tertiary mt-1">
          {t("feedingInstructionsHelp")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Group
          id="feed-types"
          title={t("feedTypesTitle")}
          help={t("feedTypesHelp")}
        >
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map((type) => (
              <ChoicePill
                key={type}
                type="checkbox"
                checked={draft.foodTypes.includes(type)}
                onChange={() =>
                  set({ foodTypes: toggled(draft.foodTypes, type, FOOD_TYPES) })
                }
              >
                {foodTypeLabel(words, type)}
              </ChoicePill>
            ))}
          </div>
        </Group>

        <Group
          id="feed-meals"
          title={t("feedMealsTitle")}
          help={t("feedMealsHelp")}
        >
          <ul className="space-y-2">
            {draft.meals.map((slot) => {
              const name = mealSlotLabel(words, slot.id);
              return (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <label className="flex min-w-0 items-center gap-3">
                    <Switch
                      checked={slot.enabled}
                      onCheckedChange={(enabled) =>
                        set({
                          meals: draft.meals.map((s) =>
                            s.id === slot.id ? { ...s, enabled } : s,
                          ),
                        })
                      }
                    />
                    <span className="text-body text-body-ink">{name}</span>
                  </label>
                  <Input
                    type="time"
                    aria-label={t("medTimeFor").replace("{slot}", name)}
                    value={slot.time}
                    onChange={(event) =>
                      set({
                        meals: draft.meals.map((s) =>
                          s.id === slot.id
                            ? { ...s, time: event.target.value }
                            : s,
                        ),
                      })
                    }
                    className="w-36 tabular-nums"
                  />
                </li>
              );
            })}
          </ul>
          <label className="flex items-center gap-3">
            <Switch
              checked={draft.customTimes}
              onCheckedChange={(customTimes) => set({ customTimes })}
            />
            <span className="text-body text-body-ink">
              {t("medCustomTimes")}
            </span>
          </label>
        </Group>

        <Group
          id="feed-days"
          title={t("medDaysTitle")}
          help={t("feedDaysHelp")}
        >
          <div className="flex flex-wrap gap-2">
            {FEEDING_DAY_RULES.map((rule) => (
              <ChoicePill
                key={rule}
                type="checkbox"
                checked={draft.dayRules.includes(rule)}
                onChange={() =>
                  set({
                    dayRules: toggled(draft.dayRules, rule, FEEDING_DAY_RULES),
                  })
                }
              >
                {words(DAY_RULE_KEY[rule])}
              </ChoicePill>
            ))}
          </div>
        </Group>

        <Group
          id="feed-house"
          title={t("feedHouseTitle")}
          help={t("feedHouseHelp")}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body text-body-ink">
              {t("feedPricingLabel")}
            </span>
            <Segmented
              name="feed-pricing"
              label={t("feedPricingLabel")}
              value={draft.pricing}
              options={[
                { value: "meal", label: t("perMeal") },
                { value: "day", label: t("perDay") },
              ]}
              onChange={(pricing) => set({ pricing })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-body text-body-ink">
              {t("feedIncludedWith")}
            </span>
            {FEEDING_SERVICES.map((service) => (
              <label key={service} className="flex items-center gap-3">
                <Switch
                  checked={draft.includedWith.includes(service)}
                  onCheckedChange={() =>
                    set({
                      includedWith: toggled(
                        draft.includedWith,
                        service,
                        FEEDING_SERVICES,
                      ),
                    })
                  }
                />
                <span className="text-body text-body-ink">
                  {t(SERVICE_KEY[service])}
                </span>
              </label>
            ))}
          </div>
          <HouseFoodList
            foods={draft.houseFoods}
            onChange={(houseFoods) => set({ houseFoods })}
            t={t}
            words={words}
          />
        </Group>

        <Group
          id="feed-parts"
          title={t("medPartsTitle")}
          help={t("medPartsHelp")}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEEDING_PAGE_PARTS.map((part) => (
              <li key={part}>
                <Label className="text-body text-body-ink flex items-center gap-3 font-normal">
                  <Switch
                    checked={draft.show[part]}
                    onCheckedChange={(on) =>
                      set({ show: { ...draft.show, [part]: on } })
                    }
                  />
                  {t(PART_KEY[part])}
                </Label>
              </li>
            ))}
          </ul>
        </Group>

        <SaveBar
          placement="card"
          dirty={dirty}
          saving={save.isPending}
          onSave={handleSave}
          onReset={() => setDraft(saved)}
        />
      </CardContent>
    </Card>
  );
}
