import type { MedDayRule, MedForm, MedGivenWith } from "@/types/base";

// ============================================================================
// What the medications step offers, and how each form doses (2026-10-01).
//
// The client's design fixed all of it: which forms there are, the quick-pick
// amounts and the − / + step that suit each, which forms can be split, which
// carry a note, and which ways of giving a medication make sense for which
// form. A facility chooses which of these its page shows (the
// `care_instructions` setting); it does not invent new ones, because every
// word here has a translation and every id is stored on a booking.
// ============================================================================

/** The forms the step offers, in the order it shows them. */
export const MED_FORMS = [
  "tablet",
  "capsule",
  "chewable",
  "liquid",
  "powder",
  "topical",
  "drops",
  "injection",
  "other",
] as const;
export type MedPageForm = (typeof MED_FORMS)[number];

/** What a dose is counted in. `custom` is the "Other" form's own word. */
export const MED_UNITS = [
  "tablet",
  "capsule",
  "chew",
  "ml",
  "scoop",
  "packet",
  "tsp",
  "pump",
  "application",
  "patch",
  "drop",
  "units",
  "custom",
] as const;
export type MedUnit = (typeof MED_UNITS)[number];

export interface DoseSpec {
  /** The first is the default; a choice is offered only when there are two. */
  units: readonly MedUnit[];
  /** One tap each. */
  presets: readonly number[];
  /** What − and + move by, and the smallest amount they reach. */
  step: number;
  /** Shown as ¼ ½ ¾; otherwise typed as a decimal. */
  fraction: boolean;
  /** Halves and quarters raise "who splits them?". */
  splittable: boolean;
  /** One line of guidance under the amount. */
  note?: "capsule" | "liquid" | "injection";
}

export const DOSE: Record<MedPageForm, DoseSpec> = {
  tablet: {
    units: ["tablet"],
    presets: [0.25, 0.5, 1, 1.5, 2],
    step: 0.25,
    fraction: true,
    splittable: true,
  },
  // Whole numbers only: a capsule cannot be split.
  capsule: {
    units: ["capsule"],
    presets: [1, 2, 3],
    step: 1,
    fraction: true,
    splittable: false,
    note: "capsule",
  },
  chewable: {
    units: ["chew"],
    presets: [0.5, 1, 1.5, 2],
    step: 0.5,
    fraction: true,
    splittable: true,
  },
  liquid: {
    units: ["ml"],
    presets: [0.25, 0.5, 1, 2.5, 5],
    step: 0.1,
    fraction: false,
    splittable: false,
    note: "liquid",
  },
  powder: {
    units: ["scoop", "packet", "tsp"],
    presets: [0.25, 0.5, 1, 2],
    step: 0.25,
    fraction: true,
    splittable: false,
  },
  topical: {
    units: ["pump", "application", "patch"],
    presets: [1, 2],
    step: 1,
    fraction: true,
    splittable: false,
  },
  drops: {
    units: ["drop"],
    presets: [1, 2, 3],
    step: 1,
    fraction: true,
    splittable: false,
  },
  injection: {
    units: ["ml", "units"],
    presets: [0.1, 0.25, 0.5, 1],
    step: 0.05,
    fraction: false,
    splittable: false,
    note: "injection",
  },
  other: {
    units: ["custom"],
    presets: [0.5, 1, 2],
    step: 0.5,
    fraction: true,
    splittable: false,
  },
};

/** Every way of giving a medication the step can offer, in display order. */
export const MED_METHODS = [
  "pill_pocket",
  "cheese",
  "peanut_butter",
  "wrapped_in_treat",
  "given_as_treat",
  "mixed_in_food",
  "by_hand",
  "syringe",
  "poured_over_food",
  "mixed_in_water",
  "applied_to_skin",
  "eye",
  "ear",
  "administered_by_staff",
  "other",
] as const satisfies readonly MedGivenWith[];
export type MedMethod = (typeof MED_METHODS)[number];

const SOLID: readonly MedMethod[] = [
  "pill_pocket",
  "cheese",
  "peanut_butter",
  "wrapped_in_treat",
  "mixed_in_food",
  "by_hand",
  "other",
];

/** The ways that suit each form, in the order the step lists them. */
export const METHODS_BY_FORM: Record<MedPageForm, readonly MedMethod[]> = {
  tablet: SOLID,
  capsule: SOLID,
  chewable: [
    "given_as_treat",
    "pill_pocket",
    "mixed_in_food",
    "by_hand",
    "other",
  ],
  liquid: ["syringe", "mixed_in_food", "poured_over_food", "other"],
  powder: ["mixed_in_food", "mixed_in_water", "other"],
  topical: ["applied_to_skin", "other"],
  drops: ["eye", "ear", "other"],
  injection: ["administered_by_staff", "other"],
  other: ["by_hand", "mixed_in_food", "other"],
};

/** The methods that use something a facility can supply, at a price. */
export const PROVIDABLE_METHODS = [
  "pill_pocket",
  "cheese",
  "peanut_butter",
  "wrapped_in_treat",
] as const satisfies readonly MedMethod[];
export type ProvidableMethod = (typeof PROVIDABLE_METHODS)[number];

export function isProvidable(
  method: string | null | undefined,
): method is ProvidableMethod {
  return (
    PROVIDABLE_METHODS as readonly (string | null | undefined)[]
  ).includes(method);
}

/** Eye and ear drops ask which side. */
export function asksForSide(method: string | undefined): boolean {
  return method === "eye" || method === "ear";
}

/** The times of day a dose can be picked at with one tap. */
export const TIME_SLOT_IDS = ["morning", "noon", "evening", "bedtime"] as const;
export type TimeSlotId = (typeof TIME_SLOT_IDS)[number];

export const DEFAULT_SLOT_TIMES: Record<TimeSlotId, string> = {
  morning: "08:00",
  noon: "12:00",
  evening: "18:00",
  bedtime: "20:00",
};

/** What "+ Custom time" starts at. */
export const CUSTOM_TIME_DEFAULT = "14:00";

export const DAY_RULES = [
  "except_checkout",
  "every_day",
  "certain_dates",
] as const satisfies readonly MedDayRule[];

/**
 * A form the step offers, from any stored form. The step's forms are kept;
 * `pill` was the old name for a tablet, and eye or ear drops are drops given
 * in an eye or an ear. Nothing stored is unknown to it, so anything else is
 * read as "other".
 */
export function pageFormOf(form: MedForm | string | undefined): MedPageForm {
  if (!form) return "tablet";
  if ((MED_FORMS as readonly string[]).includes(form)) {
    return form as MedPageForm;
  }
  if (form === "pill") return "tablet";
  if (form === "eye_drops" || form === "ear_drops") return "drops";
  return "other";
}

/** The method an older form implied, when the row names none. */
export function methodImpliedBy(
  form: MedForm | string | undefined,
): MedMethod | undefined {
  if (form === "eye_drops") return "eye";
  if (form === "ear_drops") return "ear";
  return undefined;
}

/** True when `unit` is one the step knows. */
export function isMedUnit(unit: string | undefined): unit is MedUnit {
  return Boolean(unit) && (MED_UNITS as readonly string[]).includes(unit!);
}
