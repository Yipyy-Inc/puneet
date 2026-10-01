import { z } from "zod";

import {
  DAY_RULES,
  DEFAULT_SLOT_TIMES,
  MED_FORMS,
  MED_METHODS,
  PROVIDABLE_METHODS,
  TIME_SLOT_IDS,
  type ProvidableMethod,
  type TimeSlotId,
} from "@/lib/medications/vocabulary";

// ============================================================================
// What the booking form's Medications step shows, decided by the facility
// (2026-10-01). Settings › Care tasks › Medication instructions.
//
// ── THE CHOICES ARE SWITCHES, NOT WORDS ───────────────────────────────────
//
// The page's forms, ways of giving a medication, times of day and day options
// are a fixed vocabulary (lib/medications/vocabulary.ts): each has a
// translation and an id stored on bookings. The facility turns them on and
// off, moves a time of day, and prices what it can supply. It does not type
// new ones — that is what made the old option lists English on a French
// screen, and unreadable to the code that stores a booking.
//
// ── WHAT IT SUPPLIES IS PRICED HERE ───────────────────────────────────────
//
// A pill pocket, a piece of cheese… charged per dose or per day, as a line on
// the booking's bill. Until 2026-10-01 these were "medication aids" in
// `care_fees`, a flat amount per medication, folded into the booking's price;
// no facility had set one up. The fallback supplies nothing: like every money
// domain, nothing is charged until a facility says so.
// ============================================================================

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const price = z.number().min(0).max(1000);

export const PROVIDED_PER = ["dose", "day"] as const;
export type ProvidedPer = (typeof PROVIDED_PER)[number];

const providedItemSchema = z.object({
  method: z.enum(PROVIDABLE_METHODS),
  price,
  per: z.enum(PROVIDED_PER),
});
export type ProvidedItem = z.infer<typeof providedItemSchema>;

const timeSlotSchema = z.object({
  id: z.enum(TIME_SLOT_IDS),
  enabled: z.boolean(),
  time: clockTime,
});
export type MedicationTimeSlot = z.infer<typeof timeSlotSchema>;

/** The parts of the page a facility can leave out. */
export const MEDICATION_PAGE_PARTS = [
  "strength",
  "food",
  "supply",
  "allergies",
  "notes",
  "saveToProfile",
] as const;
export type MedicationPagePart = (typeof MEDICATION_PAGE_PARTS)[number];

const unique = <T>(values: T[]) => new Set(values).size === values.length;

export const medicationInstructionsSchema = z
  .object({
    forms: z.array(z.enum(MED_FORMS)).min(1).refine(unique),
    methods: z.array(z.enum(MED_METHODS)).refine(unique),
    provided: z
      .array(providedItemSchema)
      .max(PROVIDABLE_METHODS.length)
      .refine((items) => unique(items.map((item) => item.method))),
    times: z
      .array(timeSlotSchema)
      .max(TIME_SLOT_IDS.length)
      .refine((slots) => unique(slots.map((slot) => slot.id))),
    customTimes: z.boolean(),
    dayRules: z.array(z.enum(DAY_RULES)).min(1).refine(unique),
    show: z.object({
      strength: z.boolean(),
      food: z.boolean(),
      supply: z.boolean(),
      allergies: z.boolean(),
      notes: z.boolean(),
      saveToProfile: z.boolean(),
    }),
  })
  // A page with no way to pick a time could never save a medication.
  .refine(
    (value) => value.customTimes || value.times.some((slot) => slot.enabled),
    { message: "Offer at least one time of day, or custom times." },
  );

export type MedicationInstructions = z.infer<
  typeof medicationInstructionsSchema
>;

/**
 * The client's design, whole: every form, every way of giving a medication,
 * the four times of day, custom times, all three day options, every part of
 * the page — and nothing supplied, so nothing charged.
 */
export const SHIPPED_MEDICATION_INSTRUCTIONS: MedicationInstructions = {
  forms: [...MED_FORMS],
  methods: [...MED_METHODS],
  provided: [],
  times: TIME_SLOT_IDS.map((id) => ({
    id,
    enabled: true,
    time: DEFAULT_SLOT_TIMES[id],
  })),
  customTimes: true,
  dayRules: [...DAY_RULES],
  show: {
    strength: true,
    food: true,
    supply: true,
    allergies: true,
    notes: true,
    saveToProfile: true,
  },
};

/** The item a facility supplies for this way of giving, or none. */
export function providedFor(
  settings: Pick<MedicationInstructions, "provided">,
  method: string | undefined,
): ProvidedItem | undefined {
  if (!method) return undefined;
  return settings.provided.find(
    (item) => item.method === (method as ProvidableMethod) && item.price > 0,
  );
}

/** The times of day the page offers, in the order of the day. */
export function offeredSlots(
  settings: Pick<MedicationInstructions, "times">,
): { id: TimeSlotId; time: string }[] {
  return settings.times
    .filter((slot) => slot.enabled)
    .map(({ id, time }) => ({ id, time }))
    .sort((a, b) => a.time.localeCompare(b.time));
}
