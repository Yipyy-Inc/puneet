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
    type: daycareRateTypeEnum,
    basePrice: z.number(),
    description: z.string(),
    durationHours: z.number(),
    isActive: z.boolean(),
    sizePricing: z.object({
      small: z.number(),
      medium: z.number(),
      large: z.number(),
      giant: z.number(),
    }),
    color: z.string().optional(),
  })
  .catchall(z.unknown());

export type DaycareRate = z.infer<typeof daycareRateSchema>;

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
