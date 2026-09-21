import { z } from "zod";
import { petSizeEnum } from "@/types/base";

// ============================================================================
// Daycare Enums
// ============================================================================

export const daycareRateTypeEnum = z.enum(["hourly", "half-day", "full-day"]);
export type DaycareRateType = z.infer<typeof daycareRateTypeEnum>;

export const daycareCheckInStatusEnum = z.enum([
  "checked-in",
  "checked-out",
  "scheduled",
]);
export type DaycareCheckInStatus = z.infer<typeof daycareCheckInStatusEnum>;

export const overallMoodEnum = z.enum(["excellent", "good", "fair", "poor"]);
export type OverallMood = z.infer<typeof overallMoodEnum>;

export const energyLevelEnum = z.enum(["high", "medium", "low"]);
export type EnergyLevel = z.infer<typeof energyLevelEnum>;

export const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof mealTypeEnum>;

export const eatenAmountEnum = z.enum(["all", "most", "some", "none"]);
export type EatenAmount = z.infer<typeof eatenAmountEnum>;

// ============================================================================
// Daycare Check-In
// ============================================================================

export const daycareCheckInSchema = z
  .object({
    id: z.string(),
    petId: z.number(),
    petName: z.string(),
    petBreed: z.string(),
    petSize: petSizeEnum,
    ownerId: z.number(),
    ownerName: z.string(),
    ownerPhone: z.string(),
    checkInTime: z.string(),
    checkOutTime: z.string().nullable(),
    scheduledCheckOut: z.string(),
    rateType: daycareRateTypeEnum,
    status: daycareCheckInStatusEnum,
    notes: z.string(),
    playGroup: z.string().nullable(),
    photoUrl: z.string().optional(),
    // The booking's money, so a screen taking a payment at pickup charges the
    // BALANCE rather than a figure it worked out from the rate card. Optional
    // because the fixture predates them; every row from Postgres carries all
    // three. `amountDue` is the price plus anything added at the counter and
    // `amountPaid` is the ledger's sum — both derived, neither editable.
    totalCost: z.number().optional(),
    amountDue: z.number().optional(),
    amountPaid: z.number().optional(),
    /**
     * What was added at the counter, and whether the SERVICE is taxed.
     *
     * Carried so the board's till applies the same tax the booking page does:
     * a facility can mark a rate tax-free (2026-09-21) and a board that did
     * not know would charge tax on it. Absent means taxed — service-tax.ts.
     */
    extrasTotal: z.number().optional(),
    taxable: z.boolean().optional(),
    includesEvaluation: z.boolean().optional(),
    evaluationStatus: z
      .enum(["pending", "in_progress", "completed", "skipped"])
      .optional(),
  })
  .catchall(z.unknown());

export type DaycareCheckIn = z.infer<typeof daycareCheckInSchema>;

// ============================================================================
// Daycare Rate
// ============================================================================

export const daycareRateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /**
     * LEGACY, and optional since 2026-09-21.
     *
     * "hourly | half-day | full-day" used to decide which rate priced a
     * booking, and a facility's own words could not. Half a day means five
     * hours at one business and three at another, so the label carried a
     * number it never stated — and `daycareDayRate` asked for a `full-day`
     * rate by name. Doggieville had set ONE rate, "Daycare Half Day", so
     * every full-day booking there found none and the wizard said "This
     * facility has no daycare rate yet" to a facility that had just set one.
     *
     * `maxDurationHours` replaces it: the facility says how long their service
     * runs, in their own hours, and the booking picks the rate that covers it.
     *
     * Kept optional rather than deleted because it is in stored settings, and
     * `settingsFromRows` DROPS a domain whose value no longer parses — a
     * required-field change here would have deleted every facility's rate card
     * on deploy, silently.
     */
    type: daycareRateTypeEnum.optional(),
    basePrice: z.number(),
    description: z.string(),
    durationHours: z.number(),
    /**
     * The longest stay this rate covers, in the facility's own hours.
     *
     * Optional for the same reason `type` is: rates saved before this existed
     * must keep parsing. `maxRateHours()` derives it for those, so no stored
     * value has to be rewritten and a facility that never opens the screen
     * keeps working.
     */
    maxDurationHours: z.number().optional(),
    /**
     * Which animals this rate is for, in the facility's own words.
     *
     * Empty or absent means EVERY species — a facility that never touches the
     * field keeps every rate working, which is the only safe default when the
     * alternative is a booking that cannot be priced.
     *
     * Compared with `sameSpecies`, never `===`: `pets.species` is free text and
     * already disagrees with itself in the data (one facility holds a "dog" and
     * a "Dog"), so an exact match would hide a rate from half its animals.
     */
    species: z.array(z.string()).optional(),
    /**
     * Whether this rate is charged the facility's tax.
     *
     * OPTIONAL, and absent means TAXED — the same reasoning as `species` and
     * `maxDurationHours` above for why it is optional, plus one of its own for
     * why the default is tax: charging tax that was not owed is a refund, while
     * failing to charge tax that WAS owed is the facility's own money, paid to
     * the government at year end for every booking since the mistake. So no
     * rate is ever tax-free by omission. See lib/payments/service-tax.ts.
     */
    taxable: z.boolean().optional(),
    isActive: z.boolean(),
    sizePricing: z.object({
      small: z.number(),
      medium: z.number(),
      large: z.number(),
      giant: z.number(),
    }),
    color: z.string().optional(),
    /** IDs of ServiceAddOns included free of charge with this rate */
    includedAddOnIds: z.array(z.string()).optional(),
    /**
     * Which daycare section IDs this rate is valid for.
     * Empty array or undefined = available in all sections.
     */
    allowedSectionIds: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

export type DaycareRate = z.infer<typeof daycareRateSchema>;

// ============================================================================
// Daycare Add-On
// ============================================================================

export const daycareAddOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  duration: z.number(),
  isActive: z.boolean(),
});
export type DaycareAddOn = z.infer<typeof daycareAddOnSchema>;

// ============================================================================
// Daycare Package
// ============================================================================

export const daycarePackageSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    rateType: daycareRateTypeEnum,
    quantity: z.number(),
    price: z.number(),
    savings: z.number(),
    validityDays: z.number(),
    isActive: z.boolean(),
    popular: z.boolean().optional(),
  })
  .catchall(z.unknown());

export type DaycarePackage = z.infer<typeof daycarePackageSchema>;

// ============================================================================
// Daycare Report Card
// ============================================================================

export const reportCardActivitySchema = z.object({
  time: z.string(),
  activity: z.string(),
  notes: z.string().optional(),
});

export type ReportCardActivity = z.infer<typeof reportCardActivitySchema>;

export const reportCardMealSchema = z.object({
  time: z.string(),
  type: mealTypeEnum,
  foodType: z.string(),
  amount: z.string(),
  eaten: eatenAmountEnum,
});

export type ReportCardMeal = z.infer<typeof reportCardMealSchema>;

export const daycareReportCardSchema = z
  .object({
    id: z.string(),
    checkInId: z.string(),
    petId: z.number(),
    petName: z.string(),
    date: z.string(),
    overallMood: overallMoodEnum,
    energyLevel: energyLevelEnum,
    activities: z.array(reportCardActivitySchema),
    meals: z.array(reportCardMealSchema),
    photos: z.array(z.string()),
    notes: z.string(),
    staffName: z.string(),
    sentToOwner: z.boolean(),
    sentAt: z.string().nullable(),
  })
  .catchall(z.unknown());

export type DaycareReportCard = z.infer<typeof daycareReportCardSchema>;
