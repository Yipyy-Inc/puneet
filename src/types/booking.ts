import { z } from "zod";
import {
  bookingStatusEnum,
  foodComponentTypeEnum,
  foodUnitEnum,
  foodSourceEnum,
  prepInstructionEnum,
  refusalActionEnum,
  feedingFrequencyEnum,
  medFormEnum,
  medFrequencyEnum,
  medAdminInstructionEnum,
  missedDoseActionEnum,
} from "@/types/base";

export type {
  FoodComponentType,
  FoodUnit,
  FoodSource,
  PrepInstruction,
  RefusalAction,
  FeedingFrequency,
  MedForm,
  MedFrequency,
  MedAdminInstruction,
  MissedDoseAction,
} from "@/types/base";

// ============================================================================
// Feeding Types — Modular Meal Builder
// ============================================================================

export const mealComponentSchema = z.object({
  id: z.string(),
  type: foodComponentTypeEnum,
  name: z.string(),
  amount: z.string(),
  unit: foodUnitEnum,
  mixWith: z.string().optional(),
});
export type MealComponent = z.infer<typeof mealComponentSchema>;

export const feedingOccasionSchema = z.object({
  id: z.string(),
  label: z.string(),
  time: z.string(),
  components: z.array(mealComponentSchema),
});
export type FeedingOccasion = z.infer<typeof feedingOccasionSchema>;

export const feedingScheduleItemSchema = z.object({
  id: z.string(),
  petId: z.number().optional(),
  occasions: z.array(feedingOccasionSchema),
  source: foodSourceEnum,
  prepInstructions: z.array(prepInstructionEnum),
  prepNotes: z.string().optional(),
  ifRefuses: z.array(refusalActionEnum),
  refusalNotes: z.string().optional(),
  frequency: feedingFrequencyEnum,
  frequencyDays: z.array(z.string()).optional(),
  allergies: z.array(z.string()),
  notes: z.string(),
});
export type FeedingScheduleItem = z.infer<typeof feedingScheduleItemSchema>;

// ============================================================================
// Medication Types — Per-Med Card Builder
// ============================================================================

export const medicationItemSchema = z.object({
  id: z.string(),
  petId: z.number().optional(),
  name: z.string(),
  purpose: z.string().optional(),
  amount: z.string(),
  strength: z.string().optional(),
  form: medFormEnum,
  frequency: medFrequencyEnum,
  frequencyNotes: z.string().optional(),
  times: z.array(z.string()),
  specificDays: z.array(z.string()).optional(),
  prnMaxPerDay: z.number().optional(),
  prnTrigger: z.string().optional(),
  adminInstructions: z.array(medAdminInstructionEnum),
  adminNotes: z.string().optional(),
  ifMissed: missedDoseActionEnum,
  isHighRisk: z.boolean().optional(),
  parentConfirmed: z.boolean().optional(),
  notes: z.string(),
});
export type MedicationItem = z.infer<typeof medicationItemSchema>;

// ============================================================================
// Supporting Schemas
// ============================================================================

export const daycareDateTimeSchema = z.object({
  date: z.string(),
  checkInTime: z.string(),
  checkOutTime: z.string(),
});

export type DaycareDateTime = z.infer<typeof daycareDateTimeSchema>;

export const extraServiceSchema = z.object({
  serviceId: z.string(),
  quantity: z.number(),
  petId: z.number(),
});

export type ExtraService = z.infer<typeof extraServiceSchema>;

export const taskTypeEnum = z.enum([
  "feeding",
  "medication",
  "service",
  "walking",
]);

export const taskCompletionStatusEnum = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const taskSchema = z.object({
  id: z.string(),
  bookingId: z.number(),
  petId: z.number(),
  type: taskTypeEnum,
  title: z.string(),
  time: z.string().nullable(),
  details: z.string(),
  assignedStaff: z.string().optional(),
  completionStatus: taskCompletionStatusEnum,
  assignable: z.boolean(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;

// ============================================================================
// NewBooking Schema
// ============================================================================

export const newBookingPaymentStatusEnum = z.enum([
  "pending",
  "paid",
  "refunded",
]);

export const newBookingSchema = z.object({
  clientId: z.number(),
  petId: z.union([z.number(), z.array(z.number())]),
  facilityId: z.number(),
  service: z.string(),
  serviceType: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: bookingStatusEnum,
  basePrice: z.number(),
  discount: z.number(),
  discountReason: z.string().optional(),
  totalCost: z.number(),
  paymentStatus: newBookingPaymentStatusEnum,
  specialRequests: z.string().optional(),
  notificationEmail: z.boolean().optional(),
  notificationSMS: z.boolean().optional(),
  // Service-specific fields
  daycareSelectedDates: z.array(z.string()).optional(),
  daycareDateTimes: z.array(daycareDateTimeSchema).optional(),
  groomingStyle: z.string().optional(),
  groomingAddOns: z.array(z.string()).optional(),
  stylistPreference: z.string().optional(),
  trainingType: z.string().optional(),
  trainerId: z.string().optional(),
  trainingGoals: z.string().optional(),
  vetReason: z.string().optional(),
  vetSymptoms: z.string().optional(),
  isEmergency: z.boolean().optional(),
  evaluationEvaluator: z.string().optional(),
  evaluationSpace: z.string().optional(),
  kennel: z.string().optional(),
  feedingSchedule: z.array(feedingScheduleItemSchema).optional(),
  walkSchedule: z.string().optional(),
  medications: z.array(medicationItemSchema).optional(),
  extraServices: z.array(z.union([extraServiceSchema, z.string()])).optional(),
});

export type NewBooking = z.infer<typeof newBookingSchema>;

// ============================================================================
// Booking Schema (extends NewBooking)
// ============================================================================

export const bookingPaymentMethodEnum = z.enum(["cash", "card"]);
export const bookingRefundMethodEnum = z.enum(["card", "store_credit"]);

export const invoiceLineItemSchema = z.object({
  name: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  price: z.number(),
  type: z
    .enum(["service", "product", "addon", "discount", "tip", "package_credit"])
    .optional(),
  taxable: z.boolean().optional(), // defaults to true for services/products
  moduleId: z.string().optional(), // links to custom module
  staffName: z.string().optional(), // for tips assigned to staff
});
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const invoicePaymentSchema = z.object({
  date: z.string(),
  method: z.string(),
  amount: z.number(),
  transactionId: z.string().optional(),
});
export type InvoicePayment = z.infer<typeof invoicePaymentSchema>;

export const invoiceStatusEnum = z.enum(["estimate", "open", "closed"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

export const invoiceTaxLineSchema = z.object({
  name: z.string(), // "GST", "QST", "Sales Tax"
  rate: z.number(), // 0.05
  amount: z.number(),
});
export type InvoiceTaxLine = z.infer<typeof invoiceTaxLineSchema>;

export const invoiceSchema = z.object({
  id: z.string(),
  status: invoiceStatusEnum,
  items: z.array(invoiceLineItemSchema),
  fees: z.array(invoiceLineItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  discountLabel: z.string().optional(),
  discounts: z.array(invoiceLineItemSchema).optional(), // itemized discounts
  taxRate: z.number(),
  taxAmount: z.number(),
  taxes: z.array(invoiceTaxLineSchema).optional(), // multi-tax breakdown
  total: z.number(),
  depositCollected: z.number(),
  remainingDue: z.number(),
  payments: z.array(invoicePaymentSchema),
  membershipApplied: z.string().optional(), // "Gold — 15%"
  packageCreditsUsed: z.number().optional(),
  tipTotal: z.number().optional(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const bookingSchema = newBookingSchema.extend({
  id: z.number(),
  paymentMethod: bookingPaymentMethodEnum.optional(),
  refundMethod: bookingRefundMethodEnum.optional(),
  refundAmount: z.number().optional(),
  cancellationReason: z.string().optional(),
  invoice: invoiceSchema.optional(),
});

export type Booking = z.infer<typeof bookingSchema>;

// ============================================================================
// Facility Booking Flow Config
// ============================================================================

export const facilityBookingFlowConfigSchema = z.object({
  evaluationRequired: z.boolean(),
  hideServicesUntilEvaluationCompleted: z.boolean(),
  servicesRequiringEvaluation: z.array(z.string()),
  hiddenServices: z.array(z.string()),
});

export type FacilityBookingFlowConfig = z.infer<
  typeof facilityBookingFlowConfigSchema
>;

// ============================================================================
// Booking Requests (from booking-requests.ts)
// ============================================================================

export const bookingRequestStatusEnum = z.enum([
  "pending",
  "declined",
  "waitlisted",
  "scheduled",
]);

export const bookingRequestServiceEnum = z.enum([
  "daycare",
  "boarding",
  "grooming",
  "training",
]);

export const bookingRequestSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  createdAt: z.string(),
  appointmentAt: z.string(),
  clientId: z.number(),
  clientName: z.string(),
  clientContact: z.string(),
  petId: z.number(),
  petName: z.string(),
  services: z.array(bookingRequestServiceEnum),
  status: bookingRequestStatusEnum,
  notes: z.string().optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingRequestStatus = z.infer<typeof bookingRequestStatusEnum>;
export type BookingRequestService = z.infer<typeof bookingRequestServiceEnum>;

// ============================================================================
// Booking Pet Line (from boarding-ops.ts)
// ============================================================================

export const bookingPetLineSchema = z.object({
  petId: z.number(),
  petName: z.string(),
  petType: z.enum(["dog", "cat"]),
  breed: z.string(),
  evaluationRequired: z.boolean(),
  behaviorTags: z.array(z.string()),
});

export type BookingPetLine = z.infer<typeof bookingPetLineSchema>;

// ============================================================================
// Booking Add-On Line (from boarding-ops.ts)
// ============================================================================

export const bookingAddOnLineSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(["flat", "day"]),
  unitPrice: z.number(),
  quantity: z.number(),
});

export type BookingAddOnLine = z.infer<typeof bookingAddOnLineSchema>;

// ============================================================================
// Step Config Types (from booking-step-config.ts)
// ============================================================================

export const detailsSubStepIdEnum = z.enum([
  "schedule",
  "roomType",
  "addons",
  "feedingMeds",
  "package",
  "dateTime",
]);

export type DetailsSubStepId = z.infer<typeof detailsSubStepIdEnum>;

export const mainStepIdEnum = z.enum([
  "pets",
  "service",
  "details",
  "forms",
  "tip",
  "confirm",
]);

export type MainStepId = z.infer<typeof mainStepIdEnum>;

// ============================================================================
// Form Schemas
// ============================================================================

export const createBookingSchema = newBookingSchema.omit({
  status: true,
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const editBookingSchema = bookingSchema.partial().required({
  id: true,
});

export type EditBookingInput = z.infer<typeof editBookingSchema>;
