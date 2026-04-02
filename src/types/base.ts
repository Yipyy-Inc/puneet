import { z } from "zod";

// ============================================================================
// Brand Utility & Branded IDs
// ============================================================================

export type Brand<T, B> = T & { __brand: B };

export type PetId = Brand<string, "PetId">;
export type ClientId = Brand<string, "ClientId">;
export type BookingId = Brand<string, "BookingId">;
export type StaffId = Brand<string, "StaffId">;
export type FacilityId = Brand<string, "FacilityId">;

// Zod branded ID schemas are intentionally omitted until the backend arrives.
// The Brand<T,B> types above provide compile-time safety; runtime parse transforms
// will be added when real API responses need validation.

// ============================================================================
// Shared Enums
// ============================================================================

export const petSizeEnum = z.enum(["small", "medium", "large", "giant"]);
export type PetSize = z.infer<typeof petSizeEnum>;

export const serviceTypeEnum = z.enum([
  "daycare",
  "boarding",
  "grooming",
  "training",
  "evaluation",
  "custom",
]);
export type ServiceType = z.infer<typeof serviceTypeEnum>;

export const bookingStatusEnum = z.enum([
  "pending",
  "estimate_sent",
  "request_submitted",
  "waitlisted",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
  "no_show",
  "cancelled",
  "declined",
]);
export type BookingStatus = z.infer<typeof bookingStatusEnum>;

export const bookingPaymentStatusEnum = z.enum([
  "unpaid",
  "deposit",
  "partial",
  "paid",
]);
export type BookingPaymentStatus = z.infer<typeof bookingPaymentStatusEnum>;

export const transactionStatusEnum = z.enum([
  "success",
  "failed",
  "pending",
  "refunded",
]);
export type TransactionStatus = z.infer<typeof transactionStatusEnum>;

export const kennelStatusEnum = z.enum([
  "vacant",
  "occupied",
  "reserved",
  "maintenance",
]);
export type KennelStatus = z.infer<typeof kennelStatusEnum>;

export const notifyModeEnum = z.enum(["none", "text", "email", "both"]);
export type NotifyMode = z.infer<typeof notifyModeEnum>;

export const checkInStatusEnum = z.enum([
  "scheduled",
  "checked-in",
  "checked-out",
]);
export type CheckInStatus = z.infer<typeof checkInStatusEnum>;

export const depositTypeEnum = z.enum(["none", "fixed", "percentage"]);
export type DepositType = z.infer<typeof depositTypeEnum>;

export const classTypeEnum = z.enum(["group", "private"]);
export type ClassType = z.infer<typeof classTypeEnum>;

export const userTypeEnum = z.enum(["platform", "facility", "client"]);
export type UserType = z.infer<typeof userTypeEnum>;

export const feedbackTypeEnum = z.enum(["rating", "text", "select", "yes_no"]);
export type FeedbackType = z.infer<typeof feedbackTypeEnum>;

export const cartItemTypeEnum = z.enum([
  "product",
  "service",
  "package",
  "membership",
]);
export type CartItemType = z.infer<typeof cartItemTypeEnum>;

// ============================================================================
// Feeding Enums (from src/lib/types.ts)
// ============================================================================

export const foodComponentTypeEnum = z.enum([
  "kibble",
  "wet_food",
  "raw",
  "supplement",
  "toppers",
  "prescription",
  "other",
]);
export type FoodComponentType = z.infer<typeof foodComponentTypeEnum>;

export const foodUnitEnum = z.enum([
  "cups",
  "tbsp",
  "grams",
  "oz",
  "scoop",
  "other",
]);
export type FoodUnit = z.infer<typeof foodUnitEnum>;

export const foodSourceEnum = z.enum([
  "parent_brings",
  "facility_provides",
  "mix",
]);
export type FoodSource = z.infer<typeof foodSourceEnum>;

export const prepInstructionEnum = z.enum([
  "soak",
  "microwave",
  "mix_powder",
  "serve_separately",
  "warm_water",
  "other",
]);
export type PrepInstruction = z.infer<typeof prepInstructionEnum>;

export const refusalActionEnum = z.enum([
  "plain_kibble",
  "warm_water",
  "skip_notify",
  "call_parent",
  "try_again_1hr",
  "add_toppers",
]);
export type RefusalAction = z.infer<typeof refusalActionEnum>;

export const feedingFrequencyEnum = z.enum([
  "daily",
  "specific_days",
  "every_other_day",
  "custom_dates",
  "day_before_checkout",
]);
export type FeedingFrequency = z.infer<typeof feedingFrequencyEnum>;

// ============================================================================
// Medication Enums (from src/lib/types.ts)
// ============================================================================

export const medFormEnum = z.enum([
  "pill",
  "liquid",
  "topical",
  "injection",
  "powder",
  "ear_drops",
  "eye_drops",
]);
export type MedForm = z.infer<typeof medFormEnum>;

export const medFrequencyEnum = z.enum([
  "once_daily",
  "twice_daily",
  "every_8hrs",
  "every_other_day",
  "specific_days",
  "prn",
  "other",
]);
export type MedFrequency = z.infer<typeof medFrequencyEnum>;

export const medAdminInstructionEnum = z.enum([
  "with_food",
  "empty_stomach",
  "hide_in_treat",
  "crush_and_mix",
  "give_whole",
  "after_cleaning",
  "refrigerate",
  "other",
]);
export type MedAdminInstruction = z.infer<typeof medAdminInstructionEnum>;

export const missedDoseActionEnum = z.enum([
  "skip_continue",
  "give_when_remembered",
  "call_parent",
  "do_not_double",
]);
export type MissedDoseAction = z.infer<typeof missedDoseActionEnum>;
