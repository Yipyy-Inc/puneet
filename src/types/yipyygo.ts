import { z } from "zod";

// ============================================================================
// YipyyGo Config Enums
// ============================================================================

export const yipyyGoServiceTypeEnum = z.enum([
  "daycare",
  "boarding",
  "grooming",
  "training",
  "custom",
]);
export type YipyyGoServiceType = z.infer<typeof yipyyGoServiceTypeEnum>;

export const yipyyGoRequirementEnum = z.enum(["mandatory", "optional"]);
export type YipyyGoRequirement = z.infer<typeof yipyyGoRequirementEnum>;

export const deliveryChannelEnum = z.enum(["email", "sms", "push"]);
export type DeliveryChannel = z.infer<typeof deliveryChannelEnum>;

export const customQuestionTypeEnum = z.enum([
  "short_text",
  "dropdown",
  "checkbox",
  "number",
  "date",
  "file_upload",
]);
export type CustomQuestionType = z.infer<typeof customQuestionTypeEnum>;

export const multiPetBehaviorEnum = z.enum([
  "one_form_per_pet",
  "combined_form_with_sections",
]);
export type MultiPetBehavior = z.infer<typeof multiPetBehaviorEnum>;

export const yipyyGoAddOnsApprovalEnum = z.enum(["auto", "staff_approval"]);
export type YipyyGoAddOnsApproval = z.infer<typeof yipyyGoAddOnsApprovalEnum>;

// ============================================================================
// Config Schemas
// ============================================================================

export const serviceYipyyGoConfigSchema = z.object({
  serviceType: yipyyGoServiceTypeEnum,
  customServiceName: z.string().optional(),
  enabled: z.boolean(),
  requirement: yipyyGoRequirementEnum,
});
export type ServiceYipyyGoConfig = z.infer<typeof serviceYipyyGoConfigSchema>;

export const reminderRuleSchema = z.object({
  id: z.string(),
  sendTime: z.number(),
  channel: deliveryChannelEnum,
  template: z.string().optional(),
});
export type ReminderRule = z.infer<typeof reminderRuleSchema>;

export const timingConfigSchema = z.object({
  initialSendTime: z.number(),
  deadline: z.number(),
  reminderRules: z.array(reminderRuleSchema),
  deliveryChannels: z.array(deliveryChannelEnum),
});
export type TimingConfig = z.infer<typeof timingConfigSchema>;

export const customQuestionSchema = z.object({
  id: z.string(),
  type: customQuestionTypeEnum,
  label: z.string(),
  required: z.boolean(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  defaultChecked: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  order: z.number(),
});
export type CustomQuestion = z.infer<typeof customQuestionSchema>;

export const formSectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  required: z.boolean(),
  order: z.number(),
  customQuestions: z.array(customQuestionSchema).optional(),
});
export type FormSection = z.infer<typeof formSectionSchema>;

export const formTemplateConfigSchema = z.object({
  sections: z.object({
    petInfo: formSectionSchema,
    careInstructions: formSectionSchema,
    medications: formSectionSchema,
    feedingSchedule: formSectionSchema,
    emergencyContact: formSectionSchema,
    specialRequests: formSectionSchema,
    customSections: z.array(formSectionSchema),
  }),
  features: z.object({
    photoUploads: z.boolean(),
    addOnsSection: z.boolean(),
    tipSection: z.boolean(),
  }),
  multiPetBehavior: multiPetBehaviorEnum,
  addOnsScope: z.enum(["booking", "per_pet"]),
  globalCustomQuestions: z.array(customQuestionSchema),
});
export type FormTemplateConfig = z.infer<typeof formTemplateConfigSchema>;

export const yipyyGoConfigSchema = z.object({
  facilityId: z.number(),
  enabled: z.boolean(),
  serviceConfigs: z.array(serviceYipyyGoConfigSchema),
  timing: timingConfigSchema,
  formTemplate: formTemplateConfigSchema,
  addOnsApproval: yipyyGoAddOnsApprovalEnum,
  notifyStaffEmailOnSubmit: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.number(),
});
export type YipyyGoConfig = z.infer<typeof yipyyGoConfigSchema>;

// ============================================================================
// Form Data Schemas
// ============================================================================

export const belongingItemSchema = z.object({
  id: z.string(),
  type: z.enum([
    "food",
    "treats",
    "bedding",
    "toys",
    "crate",
    "leash_collar",
    "medication_bag",
    "other",
  ]),
  quantity: z.number().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});
export type BelongingItem = z.infer<typeof belongingItemSchema>;

export const feedingInstructionSchema = z.object({
  foodType: z.string(),
  portionSize: z.string(),
  portionUnit: z.enum(["cups", "grams", "other"]),
  feedingSchedule: z.array(
    z.object({
      time: z.string(),
      amount: z.string(),
    }),
  ),
  prePortionedBagCount: z.number().optional(),
  notes: z.string().optional(),
  occasions: z.custom<import("@/types/booking").FeedingOccasion[]>().optional(),
  source: z.custom<import("@/types/booking").FoodSource>().optional(),
  prepInstructions: z
    .custom<import("@/types/booking").PrepInstruction[]>()
    .optional(),
  prepNotes: z.string().optional(),
  ifRefuses: z.custom<import("@/types/booking").RefusalAction[]>().optional(),
  refusalNotes: z.string().optional(),
  allergies: z.array(z.string()).optional(),
});
export type FeedingInstruction = z.infer<typeof feedingInstructionSchema>;

export const medicationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  frequencyNotes: z.string().optional(),
  times: z.array(z.string()),
  method: z.enum(["pill_pocket", "with_food", "syringe", "topical", "other"]),
  methodNotes: z.string().optional(),
  photoUrl: z.string().optional(),
  purpose: z.string().optional(),
  strength: z.string().optional(),
  form: z.custom<import("@/types/booking").MedForm>().optional(),
  adminInstructions: z
    .custom<import("@/types/booking").MedAdminInstruction[]>()
    .optional(),
  adminNotes: z.string().optional(),
  ifMissed: z.custom<import("@/types/booking").MissedDoseAction>().optional(),
  isHighRisk: z.boolean().optional(),
  parentConfirmed: z.boolean().optional(),
  prnMaxPerDay: z.number().optional(),
  prnTrigger: z.string().optional(),
});
export type MedicationItem = z.infer<typeof medicationItemSchema>;

export const behaviorNotesSchema = z.object({
  energyLevel: z.enum(["low", "medium", "high", "very_high"]),
  socialization: z.object({
    withDogs: z.enum(["friendly", "selective", "not_friendly", "unknown"]),
    withHumans: z.enum(["friendly", "shy", "fearful", "unknown"]),
  }),
  anxietyTriggers: z.array(z.string()).optional(),
  specialNotes: z.string().optional(),
});
export type BehaviorNotes = z.infer<typeof behaviorNotesSchema>;

export const yipyyGoAddOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  selected: z.boolean(),
  quantity: z.number().optional(),
});
export type YipyyGoAddOn = z.infer<typeof yipyyGoAddOnSchema>;

export const tipSelectionSchema = z.object({
  type: z.enum(["percentage", "custom"]),
  percentage: z.number().optional(),
  customAmount: z.number().optional(),
  appliesTo: z.enum(["stay_total", "selected_services"]),
});
export type TipSelection = z.infer<typeof tipSelectionSchema>;

export const yipyyGoStaffStatusEnum = z.enum([
  "approved",
  "needs_review",
  "corrections_requested",
]);

export const yipyyGoFormDataSchema = z.object({
  bookingId: z.union([z.number(), z.string()]),
  clientId: z.number(),
  petId: z.number(),
  petName: z.string(),
  facilityId: z.number(),
  belongings: z.array(belongingItemSchema),
  belongingsPhotoUrl: z.string().optional(),
  feedingInstructions: feedingInstructionSchema.optional(),
  medications: z.array(medicationItemSchema),
  noMedications: z.boolean(),
  behaviorNotes: behaviorNotesSchema.optional(),
  addOns: z.array(yipyyGoAddOnSchema),
  tip: tipSelectionSchema.optional(),
  submittedAt: z.string().optional(),
  submittedBy: z.number().optional(),
  isLocked: z.boolean(),
  deadline: z.string(),
  canEdit: z.boolean(),
  staffStatus: yipyyGoStaffStatusEnum.optional(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.number().optional(),
  requestChangesMessage: z.string().optional(),
  internalEditReason: z.string().optional(),
  manuallyCompletedAt: z.string().optional(),
  manuallyCompletedBy: z.number().optional(),
  qrCheckInToken: z.string().optional(),
});
export type YipyyGoFormData = z.infer<typeof yipyyGoFormDataSchema>;

// ============================================================================
// Verification Code
// ============================================================================

export const yipyyGoVerificationCodeSchema = z.object({
  code: z.string(),
  bookingId: z.union([z.number(), z.string()]),
  email: z.string().optional(),
  phone: z.string().optional(),
  expiresAt: z.string(),
  attempts: z.number(),
  maxAttempts: z.number(),
});
export type YipyyGoVerificationCode = z.infer<
  typeof yipyyGoVerificationCodeSchema
>;

// ============================================================================
// Display Status
// ============================================================================

export const yipyyGoDisplayStatusEnum = z.enum([
  "not_sent",
  "sent",
  "incomplete",
  "submitted",
  "approved",
  "needs_review",
  "precheck_missing",
]);
export type YipyyGoDisplayStatus = z.infer<typeof yipyyGoDisplayStatusEnum>;

// ============================================================================
// Trigger Types
// ============================================================================

export interface YipyyGoTriggerResult {
  shouldTrigger: boolean;
  reason?: string;
  sendImmediately: boolean;
  scheduledSendTime?: Date;
  message?: YipyyGoMessage;
}

export interface YipyyGoMessage {
  subject: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  summary: {
    petName: string;
    serviceType: string;
    date: string;
    time: string;
  };
  channels: DeliveryChannel[];
}

export interface BookingForYipyyGo {
  id: number | string;
  clientId: number;
  petId: number;
  petName: string;
  facilityId: number;
  service: string;
  startDate: string | Date;
  checkInTime?: string;
  status: string;
  createdAt?: string | Date;
}

// ============================================================================
// Check-in Audit
// ============================================================================

export const checkInAuditActionEnum = z.enum([
  "customer_submission",
  "staff_edit",
  "staff_manual_complete",
  "staff_override",
  "check_in_completed",
]);
export type CheckInAuditAction = z.infer<typeof checkInAuditActionEnum>;

export const checkInAuditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: checkInAuditActionEnum,
  facilityId: z.number(),
  bookingId: z.number(),
  petId: z.number().optional(),
  userId: z.union([z.number(), z.string()]),
  userName: z.string().optional(),
  actorType: z.enum(["customer", "staff", "system"]),
  details: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CheckInAuditEntry = z.infer<typeof checkInAuditEntrySchema>;

// ============================================================================
// Form Section Props (shared across all 7 form section components)
// ============================================================================

export interface YipyyGoFormSectionBooking {
  totalCost?: number;
}

export interface YipyyGoFormSectionProps {
  formData: YipyyGoFormData;
  updateFormData: (updates: Partial<YipyyGoFormData>) => void;
  booking: YipyyGoFormSectionBooking;
  pet: import("@/types/pet").Pet;
  customer: import("@/types/client").Client;
  config: YipyyGoConfig | null;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isLastSection: boolean;
}
