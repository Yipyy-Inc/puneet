import { z } from "zod";
import { petSizeEnum } from "@/types/base";

// ============================================================================
// Enums
// ============================================================================

export const dayOfWeekEnum = z.enum([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);
export type DayOfWeek = z.infer<typeof dayOfWeekEnum>;

export const evaluationDurationEnum = z.enum([
  "half-day",
  "full-day",
  "custom",
]);

export const reportCardThemeEnum = z.enum([
  "everyday",
  "christmas",
  "halloween",
  "easter",
  "thanksgiving",
  "new_year",
  "valentines",
]);
export type ReportCardTheme = z.infer<typeof reportCardThemeEnum>;

export const reportCardAutoSendModeEnum = z.enum([
  "immediate",
  "scheduled",
  "checkout",
  "end_of_day",
  "manual",
]);

export const reportCardServiceIdEnum = z.enum([
  "daycare",
  "boarding",
  "grooming",
  "training",
]);
export type ReportCardServiceId =
  | z.infer<typeof reportCardServiceIdEnum>
  | (string & {});

export const reportCardSectionIdEnum = z.enum([
  "todaysVibe",
  "friendsAndFun",
  "careMetrics",
  "holidaySparkle",
  "closingNote",
  "overallFeedback",
  "customFeedback",
  "petCondition",
  "nextAppointment",
  "reviewBooster",
  "photoShowcase",
]);
export type ReportCardSectionId = z.infer<typeof reportCardSectionIdEnum>;

export const customFeedbackTypeEnum = z.enum([
  "rating",
  "text",
  "select",
  "yes_no",
]);
export type CustomFeedbackType = z.infer<typeof customFeedbackTypeEnum>;

export const customServiceCategoryEnum = z.enum([
  "timed_session",
  "stay_based",
  "transport",
  "event_based",
  "addon_only",
  "one_time_appointment",
]);
export type CustomServiceCategory = z.infer<typeof customServiceCategoryEnum>;

export const customServiceStatusEnum = z.enum([
  "draft",
  "active",
  "disabled",
  "archived",
]);
export type CustomServiceStatus = z.infer<typeof customServiceStatusEnum>;

export const pricingModelTypeEnum = z.enum([
  "flat_rate",
  "duration_based",
  "per_pet",
  "per_booking",
  "per_route",
  "dynamic",
  "addon_only",
]);
export type PricingModelType = z.infer<typeof pricingModelTypeEnum>;

export const facilityNotificationTypeEnum = z.enum([
  "yipyygo_submitted",
  "form_submission_new",
  "form_submission_red_flag",
  "form_submission_has_files",
  "booking_new",
  "booking_cancelled",
  "checkin",
  "checkout",
  "attendance_alert",
  "appointment_confirmed",
  "appointment_completed",
  "session_update",
  "customer_registered",
  "customer_message",
  "incident",
  "info",
  "warning",
]);
export type FacilityNotificationType = z.infer<
  typeof facilityNotificationTypeEnum
>;

export const facilityRequestTypeEnum = z.enum([
  "Trial",
  "Plan Upgrade",
  "Plan Downgrade",
  "Add Service",
  "Remove Service",
]);

export const facilityRequestStatusEnum = z.enum([
  "pending",
  "approved",
  "denied",
]);

export const subscriptionStatusEnum = z.enum([
  "active",
  "trial",
  "suspended",
  "cancelled",
  "expired",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;

export const facilityResourceTypeEnum = z.enum([
  "room",
  "pool",
  "van",
  "equipment",
  "yard",
  "other",
]);

export const paymentGatewayProviderEnum = z.enum([
  "stripe",
  "square",
  "paypal",
]);

export const kennelSizeEnum = z.enum(["small", "medium", "large", "xlarge"]);

export const settingsAuditActionEnum = z.enum([
  "created",
  "updated",
  "deleted",
]);

// ============================================================================
// Evaluation Config
// ============================================================================

export const evaluationConfigSchema = z.object({
  internalName: z.string(),
  customerName: z.string(),
  description: z.string(),
  price: z.number(),
  duration: evaluationDurationEnum,
  customHours: z.number().optional(),
  colorCode: z.string().optional(),
  // Validity
  validityMode: z.enum(["always_valid", "expires_after_inactivity"]).optional(),
  expirationDays: z.number().optional(),
  // Staff assignment
  staffAssignment: z.enum(["auto", "manual"]).optional(),
  assignedStaffIds: z.array(z.string()).optional(),
  // Booking window
  minLeadTimeHours: z.number().optional(),
  maxAdvanceDays: z.number().optional(),
  // Daily capacity
  dailyPetLimits: z
    .object({
      enabled: z.boolean(),
      defaultLimit: z.number(),
      perDay: z
        .object({
          mon: z.number().optional(),
          tue: z.number().optional(),
          wed: z.number().optional(),
          thu: z.number().optional(),
          fri: z.number().optional(),
          sat: z.number().optional(),
          sun: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  schedule: z.object({
    durationOptionsMinutes: z.array(z.number()),
    defaultDurationMinutes: z.number().optional(),
    timeWindows: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      }),
    ),
    slotMode: z.enum(["fixed", "window"]),
    fixedStartTimes: z.array(z.string()),
  }),
  taxSettings: z.object({
    taxable: z.boolean(),
    taxRate: z.number().optional(),
  }),
});
export type EvaluationConfig = z.infer<typeof evaluationConfigSchema>;

// ============================================================================
// Business Profile & Location
// ============================================================================

export const businessProfileSchema = z.object({
  businessName: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  logo: z.string(),
  description: z.string(),
  socialMedia: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
  }),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

export type BusinessHours = {
  [K in DayOfWeek]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
};

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  capacity: z.number(),
  isActive: z.boolean(),
});
export type Location = z.infer<typeof locationSchema>;

// ============================================================================
// Booking Rules & Configuration
// ============================================================================

export const bookingRulesSchema = z.object({
  minimumAdvanceBooking: z.number(),
  maximumAdvanceBooking: z.number(),
  cancelPolicyHours: z.number(),
  cancelFeePercentage: z.number(),
  depositPercentage: z.number(),
  depositRequired: z.boolean(),
  capacityLimit: z.number(),
  dailyCapacityLimit: z.number(),
  allowOverBooking: z.boolean(),
  overBookingPercentage: z.number(),
});
export type BookingRules = z.infer<typeof bookingRulesSchema>;

// ============================================================================
// Evaluation Form Template (configurable by facility)
// ============================================================================

export const evalFieldTypeEnum = z.enum([
  "yes_no",
  "scale",
  "single_select",
  "multi_select",
  "text",
  "number",
]);
export type EvalFieldType = z.infer<typeof evalFieldTypeEnum>;

export const evalQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: evalFieldTypeEnum,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  scaleLabels: z
    .object({
      low: z.string().optional(),
      mid: z.string().optional(),
      high: z.string().optional(),
    })
    .optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  allowNotes: z.boolean().optional(),
});
export type EvalQuestion = z.infer<typeof evalQuestionSchema>;

export const evalSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(evalQuestionSchema),
});
export type EvalSection = z.infer<typeof evalSectionSchema>;

export const evaluationFormTemplateSchema = z.object({
  sections: z.array(evalSectionSchema),
  behaviorCodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      color: z.string(),
    }),
  ),
  internalNotesEnabled: z.boolean(),
});
export type EvaluationFormTemplate = z.infer<
  typeof evaluationFormTemplateSchema
>;

export const facilityBookingFlowConfigSchema = z.object({
  evaluationRequired: z.boolean(),
  hideServicesUntilEvaluationCompleted: z.boolean(),
  servicesRequiringEvaluation: z.array(z.string()),
  hiddenServices: z.array(z.string()),
  evaluationLockedMessage: z.string().optional(),
});
export type FacilityBookingFlowConfig = z.infer<
  typeof facilityBookingFlowConfigSchema
>;

export const evaluationReportCardConfigSchema = z.object({
  enabled: z.boolean(),
  headerMessage: z.string(),
  passMessage: z.string(),
  failMessage: z.string(),
  footerNote: z.string(),
  showEvaluatorName: z.boolean(),
  showEvaluationDate: z.boolean(),
  showTemperament: z.boolean(),
  showPlayStyle: z.boolean(),
  showPlayGroup: z.boolean(),
  showBehaviorTags: z.boolean(),
  showStaffNotes: z.boolean(),
  showApprovedServices: z.boolean(),
  notifyViaEmail: z.boolean(),
  notifyViaSMS: z.boolean(),
});
export type EvaluationReportCardConfig = z.infer<
  typeof evaluationReportCardConfigSchema
>;

// ============================================================================
// Kennel, Pet Size, Vaccination
// ============================================================================

export const kennelTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: kennelSizeEnum,
  dimensions: z.string(),
  amenities: z.array(z.string()),
  dailyRate: z.number(),
  quantity: z.number(),
});
export type KennelType = z.infer<typeof kennelTypeSchema>;

export const petSizeClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  weightMin: z.number(),
  weightMax: z.number(),
  unit: z.enum(["lbs", "kg"]),
});
export type PetSizeClass = z.infer<typeof petSizeClassSchema>;

export const vaccinationRuleSchema = z.object({
  id: z.string(),
  vaccineName: z.string(),
  required: z.boolean(),
  expiryWarningDays: z.number(),
  applicableServices: z.array(z.string()),
});
export type VaccinationRule = z.infer<typeof vaccinationRuleSchema>;

// ============================================================================
// Payment, Tax, Currency
// ============================================================================

export const paymentGatewaySchema = z.object({
  provider: paymentGatewayProviderEnum,
  isEnabled: z.boolean(),
  apiKey: z.string(),
  webhookSecret: z.string(),
  testMode: z.boolean(),
});
export type PaymentGateway = z.infer<typeof paymentGatewaySchema>;

export const taxRateSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.number(),
  applicableServices: z.array(z.string()),
  isDefault: z.boolean(),
});
export type TaxRate = z.infer<typeof taxRateSchema>;

export const currencySettingsSchema = z.object({
  currency: z.string(),
  symbol: z.string(),
  decimalPlaces: z.number(),
  thousandSeparator: z.string(),
  decimalSeparator: z.string(),
});
export type CurrencySettings = z.infer<typeof currencySettingsSchema>;

// ============================================================================
// Roles, Notifications, Integrations
// ============================================================================

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.record(z.string(), z.boolean()),
});
export type Role = z.infer<typeof roleSchema>;

export const notificationToggleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  category: z.enum(["client", "staff", "system"]),
});
export type NotificationToggle = z.infer<typeof notificationToggleSchema>;

export const serviceNotificationDefaultSchema = z.object({
  serviceId: z.string(),
  serviceLabel: z.string(),
  email: z.boolean(),
  sms: z.boolean(),
});
export type ServiceNotificationDefault = z.infer<
  typeof serviceNotificationDefaultSchema
>;

export const tipOptionSchema = z.object({
  type: z.enum(["percentage", "fixed"]),
  value: z.number(),
});
export type TipOption = z.infer<typeof tipOptionSchema>;

export const tipTierConfigSchema = z.object({
  options: z.tuple([tipOptionSchema, tipOptionSchema, tipOptionSchema]),
  preferredIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});
export type TipTierConfig = z.infer<typeof tipTierConfigSchema>;

export const tipConfigSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["general", "smart"]),
  general: tipTierConfigSchema,
  smart: z.object({
    thresholdAmount: z.number(),
    belowThreshold: tipTierConfigSchema,
    aboveThreshold: tipTierConfigSchema,
  }),
});
export type TipConfig = z.infer<typeof tipConfigSchema>;

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["communication", "accounting", "ai", "phone"]),
  isEnabled: z.boolean(),
  config: z.record(
    z.string(),
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.record(z.string(), z.boolean()),
    ]),
  ),
});
export type Integration = z.infer<typeof integrationSchema>;

// ============================================================================
// Subscription & Modules
// ============================================================================

export const subscriptionPlanSchema = z.object({
  planName: z.string(),
  planTier: z.enum(["starter", "professional", "enterprise"]),
  billingCycle: z.enum(["monthly", "annual"]),
  price: z.number(),
  nextBillingDate: z.string(),
  status: z.enum(["active", "trial", "cancelled"]),
});
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const moduleAddonSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  monthlyPrice: z.number(),
  isEnabled: z.boolean(),
  isIncludedInPlan: z.boolean(),
});
export type ModuleAddon = z.infer<typeof moduleAddonSchema>;

// ============================================================================
// Settings Audit Log (distinct from loyalty AuditLogEntry)
// ============================================================================

export const settingsAuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  userName: z.string(),
  action: settingsAuditActionEnum,
  section: z.string(),
  settingName: z.string(),
  oldValue: z.string(),
  newValue: z.string(),
  ipAddress: z.string(),
});
/** Settings audit log entry — not to be confused with loyalty AuditLogEntry */
export type SettingsAuditLogEntry = z.infer<typeof settingsAuditLogEntrySchema>;
/** @deprecated Use SettingsAuditLogEntry — kept as AuditLogEntry for backward compat in src/lib/types.ts */
export type AuditLogEntry = SettingsAuditLogEntry;

// ============================================================================
// Schedule Overrides & Date Blocks
// ============================================================================

export const scheduleTimeOverrideSchema = z.object({
  id: z.string(),
  date: z.string(),
  services: z.array(z.string()).optional(),
  openTime: z.string(),
  closeTime: z.string(),
});
export type ScheduleTimeOverride = z.infer<typeof scheduleTimeOverrideSchema>;

export const dropOffPickUpOverrideSchema = z.object({
  id: z.string(),
  date: z.string(),
  services: z.array(z.string()),
  dropOffStart: z.string(),
  dropOffEnd: z.string(),
  pickUpStart: z.string(),
  pickUpEnd: z.string(),
});
export type DropOffPickUpOverride = z.infer<typeof dropOffPickUpOverrideSchema>;

export const serviceDateBlockSchema = z.object({
  id: z.string(),
  date: z.string(),
  services: z.array(z.string()),
  closed: z.boolean(),
  blockCheckIn: z.boolean().optional(),
  blockCheckOut: z.boolean().optional(),
  closureMessage: z.string().optional(),
});
export type ServiceDateBlock = z.infer<typeof serviceDateBlockSchema>;

// ============================================================================
// Service Add-Ons
// ============================================================================

export const addOnPricingTypeEnum = z.enum([
  "flat",
  "per_day",
  "per_session",
  "per_hour",
]);
export type AddOnPricingType = z.infer<typeof addOnPricingTypeEnum>;

export const petTypeFilterSchema = z.object({
  types: z.array(z.string()).optional(),
  breeds: z.array(z.string()).optional(),
  weightMin: z.number().optional(),
  weightMax: z.number().optional(),
  coatTypes: z.array(z.string()).optional(),
});
export type PetTypeFilter = z.infer<typeof petTypeFilterSchema>;

export const serviceAddOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string().optional(),
  category: z.string().optional(),
  colorCode: z.string().optional(),
  pricingType: addOnPricingTypeEnum,
  price: z.number(),
  unitLabel: z.string().optional(),
  maxQuantity: z.number().optional(),
  duration: z.number().optional(),
  taxRate: z.number().optional(),
  applicableServices: z.array(z.string()),
  requiresStaff: z.boolean().optional(),
  requiresScheduling: z.boolean(),
  generatesTask: z.boolean(),
  taskCategory: z.string().optional(),
  isDefault: z.boolean().optional(),
  petTypeFilter: petTypeFilterSchema.optional(),
  sizePricing: z
    .array(
      z.object({
        size: z.enum(["small", "medium", "large", "giant"]),
        priceModifier: z.number(),
        modifierType: z.enum(["flat", "percentage"]),
      }),
    )
    .optional(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ServiceAddOn = z.infer<typeof serviceAddOnSchema>;

// ============================================================================
// Report Card Config
// ============================================================================

export const reportCardTemplateSetSchema = z.object({
  todaysVibe: z.string(),
  friendsAndFun: z.string(),
  careMetrics: z.string(),
  holidaySparkle: z.string(),
  closingNote: z.string(),
});
export type ReportCardTemplateSet = z.infer<typeof reportCardTemplateSetSchema>;

export const reportCardAutoSendConfigSchema = z.object({
  mode: reportCardAutoSendModeEnum,
  sendTime: z.string().optional(),
  channels: z.object({
    email: z.boolean(),
    message: z.boolean(),
    sms: z.boolean(),
  }),
});
export type ReportCardAutoSendConfig = z.infer<
  typeof reportCardAutoSendConfigSchema
>;

export const reportCardBrandConfigSchema = z.object({
  reportTitle: z.string(),
  accentColor: z.string(),
  showFacilityLogo: z.boolean(),
  logoPosition: z.enum(["top_center", "top_left", "top_right"]).optional(),
  headerStyle: z.enum(["minimal", "banner", "centered"]).optional(),
  showFacilityName: z.boolean().optional(),
  showFacilityPhone: z.boolean().optional(),
  showFacilityEmail: z.boolean().optional(),
  showFacilityWebsite: z.boolean().optional(),
  showSocialLinks: z.boolean().optional(),
  socialLinksStyle: z.enum(["icons", "buttons", "text_links"]).optional(),
  showBookingCta: z.boolean().optional(),
  bookingCtaText: z.string().optional(),
  bookingCtaUrl: z.string().optional(),
  footerText: z.string().optional(),
  showPoweredBy: z.boolean().optional(),
  aiTone: z.enum(["warm", "professional", "playful"]).optional(),
});
export type ReportCardBrandConfig = z.infer<typeof reportCardBrandConfigSchema>;

export const reportCardOverallFeedbackConfigSchema = z.object({
  title: z.string(),
  responseOptions: z.array(z.string()),
});
export type ReportCardOverallFeedbackConfig = z.infer<
  typeof reportCardOverallFeedbackConfigSchema
>;

export const reportCardCustomQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: customFeedbackTypeEnum,
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});
export type ReportCardCustomQuestion = z.infer<
  typeof reportCardCustomQuestionSchema
>;

export const reportCardConditionCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  options: z.array(z.string()),
});
export type ReportCardConditionCategory = z.infer<
  typeof reportCardConditionCategorySchema
>;

export const reportCardPetConditionConfigSchema = z.object({
  categories: z.array(reportCardConditionCategorySchema),
});
export type ReportCardPetConditionConfig = z.infer<
  typeof reportCardPetConditionConfigSchema
>;

export const reportCardReviewBoosterConfigSchema = z.object({
  ratingThreshold: z.number(),
  reviewUrl: z.string(),
  reviewPromptText: z.string(),
});
export type ReportCardReviewBoosterConfig = z.infer<
  typeof reportCardReviewBoosterConfigSchema
>;

export const reportCardServiceConfigSchema = z.object({
  serviceId: z.string(),
  enabled: z.boolean(),
  enabledSections: z.array(reportCardSectionIdEnum),
});
export type ReportCardServiceConfig = z.infer<
  typeof reportCardServiceConfigSchema
>;

export const reportCardConfigSchema = z.object({
  enabledThemes: z.array(reportCardThemeEnum),
  templates: z.record(reportCardThemeEnum, reportCardTemplateSetSchema),
  autoSend: reportCardAutoSendConfigSchema,
  brand: reportCardBrandConfigSchema.optional(),
  serviceConfigs: z.array(reportCardServiceConfigSchema).optional(),
  overallFeedback: reportCardOverallFeedbackConfigSchema.optional(),
  customQuestions: z.array(reportCardCustomQuestionSchema).optional(),
  petCondition: reportCardPetConditionConfigSchema.optional(),
  reviewBooster: reportCardReviewBoosterConfigSchema.optional(),
});
export type ReportCardConfig = z.infer<typeof reportCardConfigSchema>;

// ============================================================================
// Module Config
// ============================================================================

export const moduleConfigSchema = z.object({
  clientFacingName: z.string(),
  staffFacingName: z.string(),
  slogan: z.string(),
  description: z.string(),
  bannerImage: z.string().optional(),
  basePrice: z.number(),
  settings: z.object({
    evaluation: z.object({
      enabled: z.boolean(),
      optional: z.boolean().optional(),
    }),
    careInstructions: z
      .object({
        feeding: z.enum(["required", "optional", "disabled"]),
        medication: z.enum(["required", "optional", "disabled"]),
        belongings: z.enum(["required", "optional", "disabled"]),
      })
      .optional(),
  }),
  status: z.object({
    disabled: z.boolean(),
    reason: z.string().optional(),
  }),
});
export type ModuleConfig = z.infer<typeof moduleConfigSchema>;

// ============================================================================
// Custom Service Check-Ins
// ============================================================================

export const customServiceCheckInStatusEnum = z.enum([
  "scheduled",
  "checked-in",
  "in-progress",
  "completed",
  "checked-out",
]);
export type CustomServiceCheckInStatus = z.infer<
  typeof customServiceCheckInStatusEnum
>;

export const customServiceCheckInSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  moduleName: z.string(),
  moduleSlug: z.string(),
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
  status: customServiceCheckInStatusEnum,
  durationMinutes: z.number(),
  resourceName: z.string().optional(),
  staffAssigned: z.string().optional(),
  notes: z.string(),
  price: z.number(),
});
export type CustomServiceCheckIn = z.infer<typeof customServiceCheckInSchema>;

// ============================================================================
// Eligibility Conditions (used by custom modules)
// ============================================================================

export type EligibilityConditionType =
  | "pet_type"
  | "evaluation"
  | "membership"
  | "waiver"
  | "service_booked"
  | "tag"
  | "vaccination"
  | "age"
  | "weight"
  | "custom";

export interface EligibilityCondition {
  id: string;
  type: EligibilityConditionType;
  operator:
    | "equals"
    | "not_equals"
    | "has"
    | "not_has"
    | "greater_than"
    | "less_than"
    | "in_list";
  value: string | string[] | number | boolean;
  label: string;
}

// ============================================================================
// Capacity Resource (used by custom modules)
// ============================================================================

export interface CapacityResource {
  id: string;
  name: string;
  type: string;
  maxConcurrent: number;
  shared: boolean;
  sharedWith?: string[];
}

// ============================================================================
// YipyyGo Custom Section (used by custom modules)
// ============================================================================

export interface YipyyGoCustomSectionItem {
  id: string;
  label: string;
  required: boolean;
  type?: "text" | "checkbox" | "radio" | "file" | "textarea";
  options?: string[];
  placeholder?: string;
}

export interface YipyyGoCustomSection {
  id: string;
  name: string;
  icon?: string;
  type:
    | "checklist"
    | "yes_no"
    | "text_fields"
    | "multiple_choice"
    | "file_upload"
    | "info_display";
  required: boolean;
  items: YipyyGoCustomSectionItem[];
}

// ============================================================================
// Custom Service Module (complex — kept as interface)
// ============================================================================

export interface CustomServiceModule {
  id: string;
  facilityId: number;
  name: string;
  slug: string;
  icon: string;
  iconColor: string;
  iconColorTo: string;
  category: CustomServiceCategory;
  description: string;
  internalNotes?: string;
  calendar: {
    enabled: boolean;
    durationMode: "fixed" | "variable";
    durationOptions: { minutes: number; label: string; price?: number }[];
    bufferTimeMinutes: number;
    maxSimultaneousBookings: number;
    assignedTo: "room" | "resource" | "staff" | "combination";
    assignedResourceIds: string[];
  };
  checkInOut: {
    enabled: boolean;
    checkInType: "manual" | "auto";
    checkOutTimeTracking: boolean;
    qrCodeSupport: boolean;
  };
  stayBased: {
    enabled: boolean;
    requiresRoomKennel: boolean;
    affectsKennelView: boolean;
    generatesDailyTasks: boolean;
  };
  onlineBooking: {
    enabled: boolean;
    eligibleClients: "all" | "approved_only" | "active_members_only";
    approvalRequired: boolean;
    maxDogsPerSession: number;
    cancellationPolicy: { hoursBeforeBooking: number; feePercentage: number };
    depositRequired: boolean;
    depositAmount?: number;
    depositType?: "fixed" | "percentage";
  };
  pricing: {
    model: PricingModelType;
    basePrice: number;
    durationTiers?: { durationMinutes: number; price: number }[];
    peakPricingRules?: {
      id: string;
      name: string;
      adjustment: number;
      adjustmentType: "percentage" | "flat";
    }[];
    parentServiceId?: string;
    taxable: boolean;
    tipAllowed: boolean;
    membershipDiscountEligible: boolean;
  };
  staffAssignment: {
    autoAssign: boolean;
    requiredRole: string;
    customRoleName?: string;
    taskGeneration: ("setup" | "execution" | "cleanup")[];
  };
  yipyyGoRequired: boolean;
  yipyyGo?: {
    enabled: boolean;
    sendBeforeHours: number;
    required: boolean;
    standardSections: {
      belongings: boolean;
      feeding: boolean;
      medications: boolean;
      behaviorNotes: boolean;
      addOns: boolean;
      tip: boolean;
    };
    customSections: YipyyGoCustomSection[];
  };
  careInstructions?: {
    feeding: "required" | "optional" | "disabled";
    medication: "required" | "optional" | "disabled";
    belongings: "required" | "optional" | "disabled";
  };
  requiresEvaluation: boolean;
  showInSidebar: boolean;
  sidebarPosition: number;
  dependencies: string[];

  // Eligibility rules — conditions a pet/client must meet to book
  eligibilityRules?: {
    enabled: boolean;
    operator: "all" | "any";
    conditions: EligibilityCondition[];
    deniedMessage?: string;
  };

  // Service dependencies — requires other bookings or is add-on only
  serviceDependencies?: {
    requiresServices?: {
      moduleId: string;
      moduleName: string;
      type: "concurrent" | "same_day" | "any_active";
    }[];
    addonOnly?: boolean;
    addonFor?: string[];
    excludesWith?: string[];
  };

  // Capacity & resource management
  capacity?: {
    enabled: boolean;
    maxPerSlot?: number;
    slotDurationMinutes?: number;
    resources?: CapacityResource[];
    waitlistEnabled: boolean;
    maxWaitlist?: number;
    autoPromote: boolean;
    notifyOnAvailability: boolean;
  };

  status: CustomServiceStatus;
  disableReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const facilityResourceSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  name: z.string(),
  type: facilityResourceTypeEnum,
  capacity: z.number(),
  isAvailable: z.boolean(),
  description: z.string().optional(),
});
export type FacilityResource = z.infer<typeof facilityResourceSchema>;

// ============================================================================
// Facility Notification (from facility-notifications.ts)
// ============================================================================

export const facilityNotificationCategoryEnum = z.enum([
  "customers",
  "boarding",
  "daycare",
  "grooming",
  "training",
  "forms",
]);
export type FacilityNotificationCategory = z.infer<
  typeof facilityNotificationCategoryEnum
>;

export const facilityNotificationSchema = z.object({
  id: z.string(),
  type: facilityNotificationTypeEnum,
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  timestamp: z.string(),
  /** Category for filtering in notification center */
  category: z.string().optional(),
  /** Navigation link when clicking the notification */
  link: z.string().optional(),
  /** Custom service module ID for custom service notifications */
  serviceModuleId: z.string().optional(),
  bookingId: z.number().optional(),
  facilityId: z.number().optional(),
  submissionId: z.string().optional(),
  meta: z
    .object({
      petName: z.string().optional(),
      arrivalTime: z.string().optional(),
      bookingRef: z.string().optional(),
      submissionId: z.string().optional(),
      formName: z.string().optional(),
      formId: z.string().optional(),
      hasRedFlag: z.boolean().optional(),
      hasFiles: z.boolean().optional(),
    })
    .optional(),
});
export type FacilityNotification = z.infer<typeof facilityNotificationSchema>;

// ============================================================================
// Facility Request (from facility-requests.ts)
// ============================================================================

export interface FacilityRequest extends Record<string, unknown> {
  id: number;
  facilityName: string;
  requestType:
    | "Trial"
    | "Plan Upgrade"
    | "Plan Downgrade"
    | "Add Service"
    | "Remove Service";
  description: string;
  time: string;
  status: "pending" | "approved" | "denied";
  severity?: "normal" | "high";
  details: string;
  businessType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  adminName: string;
  adminEmail: string;
  plan: string;
  requestedPlan?: string;
  requestedService?: string;
}

// ============================================================================
// Facility Subscription (from facility-subscriptions.ts)
// ============================================================================

export interface FacilitySubscription {
  id: string;
  facilityId: number;
  facilityName: string;
  tierId: string;
  tierName: string;
  status: SubscriptionStatus;
  billingCycle: "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  enabledModules: string[];
  customizations?: {
    maxUsers?: number;
    maxReservations?: number;
    storageGB?: number;
    maxLocations?: number;
  };
  usage: {
    currentUsers: number;
    monthlyReservations: number;
    storageUsedGB: number;
    activeLocations: number;
  };
  billing: {
    baseCost: number;
    moduleCosts: { moduleId: string; cost: number }[];
    totalCost: number;
    currency: string;
    nextBillingDate: string;
    lastPaymentDate?: string;
    paymentMethod?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Weather Warning Rules
// ============================================================================

export const weatherConditionEnum = z.enum([
  "temperature_below",
  "temperature_above",
  "feels_like_below",
  "feels_like_above",
  "wind_speed_above",
  "weather_is",
  "precipitation_probability_above",
]);
export type WeatherCondition = z.infer<typeof weatherConditionEnum>;

export const weatherTypeEnum = z.enum([
  "clear",
  "cloudy",
  "rain",
  "drizzle",
  "snow",
  "thunderstorm",
  "fog",
  "sleet",
]);
export type WeatherType = z.infer<typeof weatherTypeEnum>;

export const weatherWarningSeverityEnum = z.enum([
  "info",
  "warning",
  "critical",
]);
export type WeatherWarningSeverity = z.infer<typeof weatherWarningSeverityEnum>;

export const weatherWarningRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  condition: weatherConditionEnum,
  value: z.union([z.number(), z.string()]),
  severity: weatherWarningSeverityEnum,
  message: z.string(),
  autoAction: z.string().optional(),
  isActive: z.boolean(),
  appliesToAreas: z.array(
    z.enum(["outdoor_park", "indoor_area", "covered_patio", "pool", "all"]),
  ),
  createdAt: z.string(),
});
export type WeatherWarningRule = z.infer<typeof weatherWarningRuleSchema>;
