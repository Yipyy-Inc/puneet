import { z } from "zod";

import {
  DAY_RULES,
  DEFAULT_SLOT_TIMES,
  MED_FORMS,
  MED_METHODS,
  PROVIDABLE_METHODS,
  TIME_SLOT_IDS,
  type MedPageForm,
} from "@/lib/medications/vocabulary";

import {
  careServicesSchema,
  careStepUse,
  careTimeSchema,
  offeredTimes,
  rowsAreSound,
  unique,
  type CareServices,
  type CareTime,
} from "./care-setup";

// ============================================================================
// What the booking form's Medications step shows, decided by the facility on
// Settings › Services › Feeding & medications (2026-10-01, the client's page).
//
// ── THE CHOICES ARE THE VOCABULARY'S, AND THE FACILITY'S ──────────────────
//
// Forms, ways of giving and dose rounds are the vocabulary in
// lib/medications/vocabulary.ts — translated, with ids stored on bookings. The
// facility switches them on and off, renames and moves a dose round, adds its
// own rounds and ways of giving, and decides the step's safety rules.
//
// ── WHAT IT CHARGES IS PRICED HERE ────────────────────────────────────────
//
// The administration fee (per dose, per pet per day, or per medication per
// day), an extra fee per injection, and what the facility sells to give a
// medication with — pill pockets, cheese, its own — per dose or per day. Lines
// on the booking's bill. The fee moved here from `care_fees` with the page;
// no facility had set one. Nothing sells and the fee is "none" until a
// facility says so.
//
// ── NEW KEYS HAVE DEFAULTS ────────────────────────────────────────────────
//
// `settingsFromRows` replaces a stored row that fails this schema with the
// fallback, silently; every key here defaults instead.
// ============================================================================

const price = z.number().min(0).max(1000);

export const PROVIDED_PER = ["dose", "day"] as const;
export type ProvidedPer = (typeof PROVIDED_PER)[number];

/** How the administration fee is counted. */
export const MED_FEE_MODES = ["none", "dose", "pet_day", "med_day"] as const;
export type MedFeeMode = (typeof MED_FEE_MODES)[number];

export const SUPPLY_RULES = ["warn", "block"] as const;
export type SupplyRule = (typeof SUPPLY_RULES)[number];

/** A way of giving: on or off, and sold by the facility or not. */
const methodRowSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,40}$/),
  /** The facility's own words, for one it added. */
  label: z.string().trim().max(40).optional(),
  on: z.boolean(),
  sell: z.boolean(),
  price,
  per: z.enum(PROVIDED_PER),
});
export type MethodRow = z.infer<typeof methodRowSchema>;

/** What a facility can sell: the four things the vocabulary supplies, and its own. */
export function canSell(id: string): boolean {
  return (
    (PROVIDABLE_METHODS as readonly string[]).includes(id) ||
    !(MED_METHODS as readonly string[]).includes(id)
  );
}

/** A way of giving the facility added — offered for every form. */
export function isCustomMethod(id: string | undefined): boolean {
  return Boolean(id) && !(MED_METHODS as readonly string[]).includes(id!);
}

/** The parts of the page a facility can leave out (More options). */
export const MEDICATION_PAGE_PARTS = [
  "strength",
  "food",
  "supply",
  "allergies",
  "notes",
  "saveToProfile",
] as const;
export type MedicationPagePart = (typeof MEDICATION_PAGE_PARTS)[number];

/** The design's prices for what can be sold — pre-filled, not sold. */
const SHIPPED_PRICES: Partial<Record<string, number>> = {
  pill_pocket: 0.75,
  cheese: 0.5,
  peanut_butter: 0.5,
  wrapped_in_treat: 0.5,
};

const SHIPPED_METHODS: MethodRow[] = MED_METHODS.map((id) => ({
  id,
  on: true,
  sell: false,
  price: SHIPPED_PRICES[id] ?? 0,
  per: "dose",
}));

/** The design's dose rounds: morning picked for a new medication. */
const SHIPPED_TIMES: CareTime[] = TIME_SLOT_IDS.map((id) => ({
  id,
  time: DEFAULT_SLOT_TIMES[id],
  on: true,
  preselected: id === "morning",
}));

const SHIPPED_SERVICES: CareServices = {
  boarding: "required",
  daycare: "optional",
  grooming: "disabled",
  training: "disabled",
};

const SHIPPED_FEE = {
  mode: "none" as MedFeeMode,
  amount: 2,
  injection: 5,
};

const SHIPPED_RULES = {
  label: true,
  vetContact: true,
  photo: false,
  controlled: false,
};

const SHIPPED_SHOW = {
  strength: true,
  food: true,
  supply: true,
  allergies: true,
  notes: true,
  saveToProfile: true,
};

export const medicationInstructionsSchema = z
  .object({
    services: careServicesSchema.default(SHIPPED_SERVICES),
    forms: z
      .array(z.enum(MED_FORMS))
      .min(1)
      .refine(unique)
      .default(MED_FORMS.filter((form) => form !== "injection")),
    /** Staff split tablets; off, the owner brings them split. */
    split: z.boolean().default(true),
    fee: z
      .object({
        mode: z.enum(MED_FEE_MODES),
        amount: price,
        /** Per injection given, on top of the administration fee. */
        injection: price,
      })
      .default(SHIPPED_FEE),
    times: z
      .array(careTimeSchema)
      .max(12)
      .refine((rows) => rowsAreSound(rows, TIME_SLOT_IDS), {
        message: "Each dose time needs a name.",
      })
      .default(SHIPPED_TIMES),
    customTimes: z.boolean().default(true),
    methods: z
      .array(methodRowSchema)
      .max(40)
      .refine((rows) => rowsAreSound(rows, MED_METHODS), {
        message: "Each way of giving needs a name.",
      })
      .refine((rows) => rows.every((row) => !row.sell || canSell(row.id)), {
        message: "Only what the facility can supply can be sold.",
      })
      .default(SHIPPED_METHODS),
    supply: z.enum(SUPPLY_RULES).default("warn"),
    rules: z
      .object({
        /** The owner confirms the original pharmacy label. */
        label: z.boolean(),
        /** The step asks for the vet's contact once a medication is added. */
        vetContact: z.boolean(),
        /** An optional photo of the label, per medication. */
        photo: z.boolean(),
        /** Controlled substances (gabapentin, trazodone…) are accepted. */
        controlled: z.boolean(),
      })
      .default(SHIPPED_RULES),
    dayRules: z
      .array(z.enum(DAY_RULES))
      .min(1)
      .refine(unique)
      .default([...DAY_RULES]),
    show: z
      .object({
        strength: z.boolean(),
        food: z.boolean(),
        supply: z.boolean(),
        allergies: z.boolean(),
        notes: z.boolean(),
        saveToProfile: z.boolean(),
      })
      .default(SHIPPED_SHOW),
  })
  // A page with no way to pick a time could never save a medication.
  .refine((value) => value.customTimes || value.times.some((slot) => slot.on), {
    message: "Offer at least one dose time, or custom times.",
  });

export type MedicationInstructions = z.infer<
  typeof medicationInstructionsSchema
>;

/**
 * The client's page as it ships: required for boarding, optional for daycare;
 * every form but injections; staff split tablets; no fee; every dose round
 * with morning picked; every way of giving, nothing sold; a short supply
 * warns; the pharmacy label and the vet's contact asked for.
 */
export const SHIPPED_MEDICATION_INSTRUCTIONS: MedicationInstructions = {
  services: SHIPPED_SERVICES,
  forms: MED_FORMS.filter((form) => form !== "injection"),
  split: true,
  fee: SHIPPED_FEE,
  times: SHIPPED_TIMES,
  customTimes: true,
  methods: SHIPPED_METHODS,
  supply: "warn",
  rules: SHIPPED_RULES,
  dayRules: [...DAY_RULES],
  show: SHIPPED_SHOW,
};

/** A way of giving's row here, or none. */
export function methodRow(
  settings: Pick<MedicationInstructions, "methods">,
  id: string | undefined,
): MethodRow | undefined {
  if (!id) return undefined;
  return settings.methods.find((row) => row.id === id);
}

/** What the facility sells for this way of giving, at a price — or nothing. */
export function providedFor(
  settings: Pick<MedicationInstructions, "methods">,
  method: string | undefined,
): MethodRow | undefined {
  const row = methodRow(settings, method);
  return row && row.on && row.sell && canSell(row.id) && row.price > 0
    ? row
    : undefined;
}

/** The dose rounds the page offers, in the order of the day. */
export function offeredSlots(
  settings: Pick<MedicationInstructions, "times">,
): CareTime[] {
  return offeredTimes(settings.times);
}

/** The administration fee applies to this service, at a price above nothing. */
export function medicationFeeApplies(
  settings: Pick<MedicationInstructions, "fee" | "services">,
  service: string | undefined,
): boolean {
  return (
    careStepUse(settings, service) !== "disabled" &&
    settings.fee.mode !== "none" &&
    settings.fee.amount > 0
  );
}

/** Injections cost extra here: the form is offered and the fee is above nothing. */
export function injectionFeeApplies(
  settings: Pick<MedicationInstructions, "fee" | "services" | "forms">,
  service: string | undefined,
): boolean {
  return (
    careStepUse(settings, service) !== "disabled" &&
    settings.forms.includes("injection" satisfies MedPageForm) &&
    settings.fee.injection > 0
  );
}
