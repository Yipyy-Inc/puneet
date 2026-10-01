import { z } from "zod";

// ============================================================================
// The choices the booking form's Feeding step offers — meal times, portion
// units, food types, feeding instructions, allergy presets… Settings › Care
// tasks › Feeding instructions.
//
// ── IT SAVED NOTHING UNTIL 2026-10-01 ─────────────────────────────────────
//
// The screen spliced its edits into `facilityConfig.feedingOptions`, a literal
// in src/data/facility-config.ts, and the booking form read that literal in a
// module-level const — so an edit reached nobody, not even after a reload (the
// debt map, "check:settings-persistence counts useMutation…"). It is a
// facility_settings domain now, and the form reads it.
//
// The shipped lists are COPIED from that literal rather than imported: they
// are what every facility has seen until now, so a facility that never opens
// the screen sees no change at all.
// ============================================================================

const listItem = z.string().trim().min(1).max(80);
const list = z.array(listItem).max(40);

const mealTimeSchema = z.object({
  id: z.string().max(60).optional(),
  label: z.string().trim().min(1).max(60),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type MealTime = z.infer<typeof mealTimeSchema>;

export const feedingInstructionsSchema = z.object({
  schedules: z.array(mealTimeSchema).max(12),
  units: list,
  foodTypes: list,
  sources: list,
  destinations: list,
  frequencies: list,
  allowedProteins: list,
  instructions: list,
  allergyPresets: list,
});

export type FeedingInstructions = z.infer<typeof feedingInstructionsSchema>;

/** The lists every facility has been offered so far. */
export const SHIPPED_FEEDING_INSTRUCTIONS: FeedingInstructions = {
  schedules: [
    { id: "s1", label: "AM", time: "09:00" },
    { id: "s2", label: "Noon", time: "12:00" },
    { id: "s3", label: "PM", time: "18:00" },
  ],
  units: ["Scoop", "Cup", "Oz", "Tbsp", "Grams"],
  foodTypes: ["Kibble", "Wet food", "Raw", "Prescription", "Homemade"],
  sources: ["House provide", "Owner provide"],
  destinations: ["Kennel", "Crate", "Play yard", "Feeding station"],
  frequencies: ["Once daily", "Twice daily", "Three times daily", "Free feed"],
  allowedProteins: ["Chicken", "Beef", "Lamb", "Fish", "Turkey", "Duck"],
  instructions: ["Feed alone", "Free feed", "Hand feed", "Slow feeder"],
  allergyPresets: [
    "Chicken",
    "Beef",
    "Grain-free",
    "Sensitive stomach",
    "Dairy",
  ],
};

/** The list editors, in the order the screen shows them. */
export const FEEDING_LISTS = [
  "units",
  "foodTypes",
  "instructions",
  "sources",
  "destinations",
  "frequencies",
  "allowedProteins",
  "allergyPresets",
] as const satisfies readonly Exclude<keyof FeedingInstructions, "schedules">[];
export type FeedingList = (typeof FEEDING_LISTS)[number];
