"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useSaveFacilitySetting } from "@/lib/api/facility-settings";
import { resetRows } from "@/lib/settings/care-setup";
import {
  ALLERGY_PRESET_ID_LIST,
  BUILT_IN_HOUSE_FOODS,
  EATING_HABITS,
  FEEDING_STYLES,
  MEAL_SLOTS,
  SKIP_ACTIONS,
} from "@/lib/feeding/vocabulary";
import { MED_METHODS, TIME_SLOT_IDS } from "@/lib/medications/vocabulary";
import {
  feedingInstructionsSchema,
  SHIPPED_FEEDING_INSTRUCTIONS,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";
import {
  medicationInstructionsSchema,
  SHIPPED_MEDICATION_INSTRUCTIONS,
  type MedicationInstructions,
} from "@/lib/settings/medication-instructions";
import { fill } from "@/lib/medications/dose";
import type { SettingDomain } from "@/lib/settings/domains";

// ============================================================================
// The Feeding & medications page's state: both settings domains, as saved and
// as being edited. One Save writes whichever of them changed — the page has
// one save bar, as the client's design does — and a part that fails stays
// changed, named in the toast.
//
// "Changed from default" is measured per card, against the defaults with the
// facility's own rows kept — what "Reset to default" leaves, so a card that
// differs only by a meal time the facility added is not "changed".
// ============================================================================

export const SETUP_TABS = ["feeding", "medications"] as const;
export type SetupTab = (typeof SETUP_TABS)[number];

interface Drafts {
  feeding: FeedingInstructions;
  medications: MedicationInstructions;
}

const DOMAIN: Record<SetupTab, SettingDomain> = {
  feeding: "feeding_instructions",
  medications: "medication_instructions",
};

const FAILED: Record<SetupTab, string> = {
  feeding: "feedingNotSaved",
  medications: "medicationsNotSaved",
};

type Patch<T> = Partial<T> | ((current: T) => Partial<T>);

/** The defaults for `current`: shipped values, with the facility's own rows kept. */
function feedingDefaults(current: FeedingInstructions): FeedingInstructions {
  const shipped = SHIPPED_FEEDING_INSTRUCTIONS;
  return {
    ...shipped,
    meals: resetRows(shipped.meals, current.meals, MEAL_SLOTS),
    house: {
      ...shipped.house,
      foods: resetRows(
        shipped.house.foods,
        current.house.foods,
        BUILT_IN_HOUSE_FOODS,
      ),
    },
    styles: resetRows(shipped.styles, current.styles, FEEDING_STYLES),
    habits: resetRows(shipped.habits, current.habits, EATING_HABITS),
    skip: resetRows(shipped.skip, current.skip, SKIP_ACTIONS),
    allergies: resetRows(
      shipped.allergies,
      current.allergies,
      ALLERGY_PRESET_ID_LIST,
    ),
  };
}

function medicationDefaults(
  current: MedicationInstructions,
): MedicationInstructions {
  const shipped = SHIPPED_MEDICATION_INSTRUCTIONS;
  return {
    ...shipped,
    times: resetRows(shipped.times, current.times, TIME_SLOT_IDS),
    methods: resetRows(shipped.methods, current.methods, MED_METHODS),
  };
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** What stops a feeding draft being saved, as a key of the page's words. */
function feedingProblem(value: FeedingInstructions): string | null {
  if (value.foodTypes.length === 0) return "invalidFoodTypes";
  if (value.packs.length === 0) return "invalidPacks";
  if (value.dayRules.length === 0) return "invalidDays";
  if (
    value.meals.some(
      (row) => !MEAL_SLOTS.includes(row.id as never) && !row.label?.trim(),
    )
  ) {
    return "invalidMealNames";
  }
  if (
    value.house.foods.some(
      (food) =>
        !BUILT_IN_HOUSE_FOODS.includes(food.id as never) && !food.name?.trim(),
    )
  ) {
    return "invalidHouseNames";
  }
  return feedingInstructionsSchema.safeParse(value).success
    ? null
    : "invalidFeeding";
}

function medicationProblem(value: MedicationInstructions): string | null {
  if (value.forms.length === 0) return "invalidForms";
  if (value.dayRules.length === 0) return "invalidDays";
  if (!value.customTimes && !value.times.some((row) => row.on)) {
    return "invalidDoseTimes";
  }
  if (
    value.times.some(
      (row) => !TIME_SLOT_IDS.includes(row.id as never) && !row.label?.trim(),
    )
  ) {
    return "invalidDoseNames";
  }
  return medicationInstructionsSchema.safeParse(value).success
    ? null
    : "invalidMedications";
}

export interface CareSetup {
  tab: SetupTab;
  setTab: (tab: SetupTab) => void;
  feeding: FeedingInstructions;
  medications: MedicationInstructions;
  setFeeding: (patch: Patch<FeedingInstructions>) => void;
  setMedications: (patch: Patch<MedicationInstructions>) => void;
  /** Some keys of a domain differ from their defaults. */
  feedingChanged: (keys: readonly (keyof FeedingInstructions)[]) => boolean;
  medicationsChanged: (
    keys: readonly (keyof MedicationInstructions)[],
  ) => boolean;
  resetFeeding: (keys: readonly (keyof FeedingInstructions)[]) => void;
  resetMedications: (keys: readonly (keyof MedicationInstructions)[]) => void;
  /**
   * A row taken off a list, with an Undo toast that puts it back where it
   * was (§5h: an undo, not a confirmation).
   */
  removed: (name: string, undo: () => void) => void;
  dirty: boolean;
  saving: boolean;
  save: () => Promise<void>;
  discard: () => void;
}

export function useCareSetup(
  initial: Drafts,
  t: (key: string) => string,
): CareSetup {
  const mutation = useSaveFacilitySetting();
  const [tab, setTab] = useState<SetupTab>("feeding");
  const [saved, setSaved] = useState<Drafts>(initial);
  const [draft, setDraft] = useState<Drafts>(initial);
  const [saving, setSaving] = useState(false);

  const dirty = SETUP_TABS.some((key) => !same(draft[key], saved[key]));

  const setFeeding = (patch: Patch<FeedingInstructions>) =>
    setDraft((current) => ({
      ...current,
      feeding: {
        ...current.feeding,
        ...(typeof patch === "function" ? patch(current.feeding) : patch),
      },
    }));
  const setMedications = (patch: Patch<MedicationInstructions>) =>
    setDraft((current) => ({
      ...current,
      medications: {
        ...current.medications,
        ...(typeof patch === "function" ? patch(current.medications) : patch),
      },
    }));

  const save = async () => {
    const keys = SETUP_TABS.filter((key) => !same(draft[key], saved[key]));
    for (const key of keys) {
      const problem =
        key === "feeding"
          ? feedingProblem(draft.feeding)
          : medicationProblem(draft.medications);
      if (problem) {
        setTab(key);
        toast.error(t(problem));
        return;
      }
    }
    setSaving(true);
    const done: SetupTab[] = [];
    for (const key of keys) {
      const value = draft[key];
      try {
        const response = await mutation.mutateAsync({
          domain: DOMAIN[key],
          value,
        });
        // The stored value — what the server kept, trimmed and parsed.
        const stored = response.value as Drafts[typeof key];
        setSaved((current) => ({ ...current, [key]: stored }));
        setDraft((current) =>
          same(current[key], value) ? { ...current, [key]: stored } : current,
        );
        done.push(key);
      } catch (error) {
        toast.error(
          fill(t(FAILED[key]), {
            reason: error instanceof Error ? error.message : "",
          }),
        );
      }
    }
    setSaving(false);
    if (done.length === 2) toast.success(t("savedBoth"));
    else if (done[0] === "feeding") toast.success(t("savedFeeding"));
    else if (done[0] === "medications") toast.success(t("savedMedications"));
  };

  return {
    tab,
    setTab,
    feeding: draft.feeding,
    medications: draft.medications,
    setFeeding,
    setMedications,
    feedingChanged: (keys) => {
      const defaults = feedingDefaults(draft.feeding);
      return keys.some((key) => !same(draft.feeding[key], defaults[key]));
    },
    medicationsChanged: (keys) => {
      const defaults = medicationDefaults(draft.medications);
      return keys.some((key) => !same(draft.medications[key], defaults[key]));
    },
    resetFeeding: (keys) =>
      setFeeding((current) => {
        const defaults = feedingDefaults(current);
        return Object.fromEntries(keys.map((key) => [key, defaults[key]]));
      }),
    resetMedications: (keys) =>
      setMedications((current) => {
        const defaults = medicationDefaults(current);
        return Object.fromEntries(keys.map((key) => [key, defaults[key]]));
      }),
    removed: (name, undo) =>
      toast(fill(t("removed"), { name }), {
        duration: 8000,
        action: { label: t("undo"), onClick: undo },
      }),
    dirty,
    saving,
    save,
    discard: () => setDraft(saved),
  };
}
