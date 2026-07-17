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
  "vaccination_uploaded",
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
    /** Days of the week on which evaluations can be booked (e.g. "monday", "friday"). */
    allowedDays: z.array(z.string()).optional(),
    /** Minimum gap in minutes between back-to-back evaluation slots. */
    bufferMinutes: z.number().optional(),
    /** Maximum number of pets that can be evaluated in the same start-time slot. */
    capacityPerSlot: z.number().optional(),
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
  preferences: z.object({
    clockFormat: z.enum(["12h", "24h"]),
    weightUnit: z.enum(["lbs", "kg"]),
    temperatureUnit: z.enum(["celsius", "fahrenheit"]),
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
  /** Core sections ship with the template and can be edited but not deleted. */
  core: z.boolean().optional(),
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
  bookingRequestConfirmationMessage: z.string().optional(),
  /**
   * When true, the booking catalog pre-filters services/packages by the
   * client's pets on file. Services without `eligibleSizes` are always
   * shown (default).
   */
  onlyShowApplicableServices: z.boolean().optional(),
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
  species: z.string(),
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
  label: z.string().optional(),
});
export type TipOption = z.infer<typeof tipOptionSchema>;

export const tipTierConfigSchema = z.object({
  options: z.tuple([tipOptionSchema, tipOptionSchema, tipOptionSchema]),
  preferredIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});
export type TipTierConfig = z.infer<typeof tipTierConfigSchema>;

export const tipReminderConfigSchema = z.object({
  enabled: z.boolean(),
  /** Delay (hours) after check-out before the reminder is sent */
  delayHours: z.number(),
  channels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
  subject: z.string(),
  messageHeadline: z.string(),
  messageBody: z.string(),
  /** Attach report card to the reminder when available */
  includeReportCard: z.boolean(),
});
export type TipReminderConfig = z.infer<typeof tipReminderConfigSchema>;

export const tipReportCardPromptSchema = z.object({
  enabled: z.boolean(),
  headline: z.string(),
  subcopy: z.string(),
  /** Show the prompt only when the pet received a happy rating */
  onlyOnPositiveFeedback: z.boolean(),
});
export type TipReportCardPrompt = z.infer<typeof tipReportCardPromptSchema>;

export const tipConfigSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["general", "smart"]),
  general: tipTierConfigSchema,
  smart: z.object({
    thresholdAmount: z.number(),
    belowThreshold: tipTierConfigSchema,
    aboveThreshold: tipTierConfigSchema,
  }),
  /** Post-stay tip reminder (sent after check-out) */
  reminder: tipReminderConfigSchema.optional(),
  /** Controls the tip ask attached to automated report cards */
  reportCardPrompt: tipReportCardPromptSchema.optional(),
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
  "per_item",
  "percentage_of_booking",
]);
export type AddOnPricingType = z.infer<typeof addOnPricingTypeEnum>;

/**
 * How this add-on is scheduled/applied during a stay or appointment.
 * - quantity      → client chooses how many (no time slot needed)
 * - time_slot     → staff/client books a specific time slot
 * - per_stay_night→ auto-applied once per night (e.g. nightly video call)
 * - grooming_linked → occurs alongside a grooming session in the same booking
 */
export const addOnSchedulingTypeEnum = z.enum([
  "quantity",
  "time_slot",
  "per_stay_night",
  "grooming_linked",
]);
export type AddOnSchedulingType = z.infer<typeof addOnSchedulingTypeEnum>;

export const addOnCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  colorCode: z.string().optional(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AddOnCategory = z.infer<typeof addOnCategorySchema>;

export const petTypeFilterSchema = z.object({
  types: z.array(z.string()).optional(),
  breeds: z.array(z.string()).optional(),
  weightMin: z.number().optional(),
  weightMax: z.number().optional(),
  coatTypes: z.array(z.string()).optional(),
});
export type PetTypeFilter = z.infer<typeof petTypeFilterSchema>;

/** Whether the add-on price is charged once per booking or once per pet */
export const addOnPetScopeEnum = z.enum(["per_booking", "per_pet"]);
export type AddOnPetScope = z.infer<typeof addOnPetScopeEnum>;

/** Extended scheduling configuration when requiresScheduling = true */
export const addOnScheduleConfigSchema = z.object({
  /** Who can schedule this add-on */
  schedulableBy: z.enum(["staff_only", "customer_and_staff"]),
  /** Show the assigned staff slot on the customer's booking summary */
  showStaffOnSummary: z.boolean().optional(),
  /** Max bookings of this add-on per day across the facility (0 = unlimited) */
  maxPerDay: z.number().optional(),
  /** Buffer time in minutes between consecutive bookings of this add-on */
  bufferMinutes: z.number().optional(),
  /** Show a scheduling icon on the boarding/daycare dashboard card */
  showOnDashboard: z.boolean().optional(),
  /** Number of schedulable slots this add-on consumes per quantity unit */
  slotsPerUnit: z.number().optional(),
  /** Schedule category label shown to staff (e.g. "Grooming", "Activity") */
  scheduleCategory: z.string().optional(),
});
export type AddOnScheduleConfig = z.infer<typeof addOnScheduleConfigSchema>;

export const serviceAddOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string().optional(),
  category: z.string().optional(),
  colorCode: z.string().optional(),
  pricingType: addOnPricingTypeEnum,
  /** For percentage_of_booking: the % value (e.g. 20 = 20%). For others: dollar amount. */
  price: z.number(),
  unitLabel: z.string().optional(),
  maxQuantity: z.number().optional(),
  duration: z.number().optional(),
  taxRate: z.number().optional(),
  taxable: z.boolean().optional(),
  /** Whether this add-on is taxable at all */
  taxEnabled: z.boolean().optional(),
  /** Charged once per booking or once per pet */
  petScope: addOnPetScopeEnum.optional(),
  applicableServices: z.array(z.string()),
  /** Which facility location IDs this add-on is available at. Empty = all. */
  locationIds: z.array(z.string()).optional(),
  requiresStaff: z.boolean().optional(),
  schedulingType: addOnSchedulingTypeEnum.optional(),
  requiresScheduling: z.boolean(),
  /** Extended scheduling options, populated when requiresScheduling = true */
  scheduleConfig: addOnScheduleConfigSchema.optional(),
  generatesTask: z.boolean(),
  taskCategory: z.string().optional(),
  isDefault: z.boolean().optional(),
  /**
   * When true, the add-on is auto-included with every booking of an
   * applicable service and cannot be removed by the customer. Renders with
   * a "Required" badge and a locked control. Mutually meaningful with
   * `isDefault` (which is auto-selected but removable).
   */
  isRequired: z.boolean().optional(),
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
  // Optional per-platform external review links (Table 74).
  googleUrl: z.string().optional(),
  yelpUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
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
  /** Grooming only: prompt the groomer to upload before + after photos so the
   *  customer sees the before/after slider (Table 67). */
  groomingBeforeAfter: z.boolean().optional(),
});
export type ReportCardConfig = z.infer<typeof reportCardConfigSchema>;

// ============================================================================
// Early Checkout Policy
// ============================================================================

export const earlyCheckoutPolicyEnum = z.enum([
  "none",
  "full_refund",
  "partial_refund",
  "credit",
  "fee",
]);
export type EarlyCheckoutPolicy = z.infer<typeof earlyCheckoutPolicyEnum>;

export const earlyCheckoutPolicySchema = z.object({
  enabled: z.boolean(),
  policy: earlyCheckoutPolicyEnum,
  /** For "partial_refund": percent (0-100) of unused value refunded */
  refundPercent: z.number().optional(),
  /** For "fee": flat dollar amount or percentage of unused value */
  feeType: z.enum(["flat", "percentage"]).optional(),
  feeAmount: z.number().optional(),
  /** For "credit": days until store credit expires (0 = never) */
  creditExpiresDays: z.number().optional(),
  /** Plain-language note shown at checkout and on the invoice */
  customerNote: z.string().optional(),
});
export type EarlyCheckoutPolicyConfig = z.infer<
  typeof earlyCheckoutPolicySchema
>;

// ============================================================================
// Module Config
// ============================================================================

export const moduleConfigSchema = z.object({
  clientFacingName: z.string(),
  staffFacingName: z.string(),
  slogan: z.string(),
  description: z.string(),
  bannerImage: z.string().optional(),
  /** Hex color used across the system to identify this service (calendar, badges, etc.) */
  color: z.string().optional(),
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
    earlyCheckout: earlyCheckoutPolicySchema.optional(),
    /** When enabled, the module tracks product stock and surfaces supply
     *  alerts (e.g. the grooming calendar's Supply Alerts panel). */
    inventory: z
      .object({
        trackingEnabled: z.boolean(),
      })
      .optional(),
    /** When enabled, the grooming session panel shows the in-progress step
     *  checklist (Bath, Blow Dry, …). Default off. */
    progressChecklist: z
      .object({
        enabled: z.boolean(),
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
  | "account_standing"
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
    | "in_list"
    | "between";
  value: string | string[] | number | boolean;
  label: string;
  /** Inclusive lower bound for range conditions (e.g. pet age/weight). */
  minValue?: number;
  /** Inclusive upper bound for range conditions. */
  maxValue?: number;
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
// Custom Service Workflow Questionnaire (Task 10)
// ============================================================================

export type CustomServiceCalendarCardDisplayMode =
  | "full-block"
  | "compact-block"
  | "icon-only";

export type CustomServiceWorkflowResourceType =
  | "room"
  | "pool"
  | "van"
  | "equipment"
  | "yard"
  | "other"
  | "custom";

export type CustomServiceTaskTemplateTimingRule =
  | "before_start"
  | "at_check_in"
  | "after_check_out";

/**
 * Q9 — when payment is collected for a booking. Drives the payment integration:
 * `at_booking` charges immediately, `deposit_only` holds/charges a partial
 * deposit, `none` invoices later (no charge at booking time).
 */
export type CustomServicePaymentTiming = "at_booking" | "none" | "deposit_only";

export type CustomServiceWeekday =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

/** One day's open/close window in a per-service operating-hours override. */
export interface CustomServiceOperatingDay {
  day: CustomServiceWeekday;
  /** When false the service is closed that day regardless of times. */
  isOpen: boolean;
  /** 24h "HH:mm". */
  openTime: string;
  closeTime: string;
}

export type CustomServiceRecurrenceMode = "one_time" | "recurring";
export type CustomServiceRecurrenceFrequency = "weekly" | "biweekly";

/** Where check-in physically happens. Drives the staff check-in notification. */
export type CustomServiceCheckInLocation =
  | "front_desk"
  | "service_location"
  | "curbside"
  | "mobile";

/** What happens when a client passes the late-arrival grace period. */
export type CustomServiceLateArrivalAction =
  | "flag"
  | "auto_cancel"
  | "notify_staff";

/** Evaluation a pet must pass before booking when evaluation is required. */
export type CustomServiceEvaluationType =
  | "temperament"
  | "swim_test"
  | "health_check"
  | "custom";

/** How an auto-generated task is assigned to staff. */
export type CustomServiceTaskAssignmentMode =
  | "same_as_booking"
  | "any_available"
  | "unassigned";

/** How a service's geographic area is defined. */
export type CustomServiceGeoRestrictionMode = "radius" | "postal_codes";

/** How prominently a care-instruction section shows in the staff service view. */
export type CareInstructionDisplay = "highlight" | "standard" | "reference";

/** Kind of physical space a stay-based service occupies. Drives space views. */
export type CustomServiceRoomSpaceType =
  | "kennel"
  | "suite"
  | "pool_lane"
  | "treatment_room"
  | "custom";

/**
 * When the charge fires for a booking. The payment method is always
 * platform-managed (Stripe via Yipyy); this only controls timing.
 */
export type CustomServiceBillingTrigger =
  | "at_booking"
  | "at_check_in"
  | "at_check_out"
  | "invoice_after"
  | "deposit_balance";

/** Payment methods offered at checkout. All flow through the platform (Stripe). */
export type CustomServicePaymentMethod =
  | "card"
  | "cash"
  | "gift_card"
  | "wallet"
  | "package_credits";

/** A purchasable multi-session package (e.g. a 10-session pool pass). */
export interface CustomServicePackage {
  id: string;
  name: string;
  sessions: number;
  price: number;
}

/** Documents that may be required on file before an online booking completes. */
export type CustomServiceBookingDocument =
  | "vaccination_records"
  | "vet_reference"
  | "signed_waiver"
  | "temperament_assessment";

/** Facility-level species configuration used to label pet-related fields. */
export interface FacilitySpeciesConfig {
  /** Species this facility serves (e.g. "Dog", "Cat"). */
  species: string[];
  /**
   * Plural noun for the facility's animals, shown in client-facing labels
   * (e.g. "pets", or "dogs" for a dog-only facility). Sourced here rather than
   * hardcoded so multi-species facilities read correctly.
   */
  petNounPlural: string;
}

export interface CustomServiceTaskTemplateQuestionnaireItem {
  id: string;
  taskName: string;
  taskType: "feeding" | "medication" | "activity" | "care" | "cleanup";
  timingRule: CustomServiceTaskTemplateTimingRule;
  offsetMinutes: number;
  assignedStaffRole: string;
  requiresCompletionNote: boolean;
  requiresPhotoProof: boolean;
}

export interface CustomServiceWorkflowQuestionnaire {
  appearsOnCalendar: boolean;
  calendarColor: string;
  calendarCardDisplayMode: CustomServiceCalendarCardDisplayMode;
  requiresTimeSlots: boolean;
  requiresResource: boolean;
  resourceType?: CustomServiceWorkflowResourceType;
  resourceIds: string[];
  requiresCheckInOut: boolean;
  generatesTasks: boolean;
  taskTemplates: CustomServiceTaskTemplateQuestionnaireItem[];
  allowsAddOns: boolean;
  allowedAddOnIds: string[];
  bookableOnline: boolean;
  onlineLeadTimeHours?: number;
  onlineCapacityLimit?: number;
  affectsCapacityHeatmap: boolean;
  capacityCeilingPerHour?: number;
  /** Q9 — payment collected at booking time. Drives payment integration. */
  paymentTiming: CustomServicePaymentTiming;
  /**
   * Q10 — whether a waiver/consent form must be signed before the customer's
   * first booking. When true the booking flow prompts for waiver completion.
   */
  requiresWaiver: boolean;
  questionnaireCompleted: boolean;
  questionnaireCompletedAt?: string;
}

// ============================================================================
// Custom Service Module (complex — kept as interface)
// ============================================================================

export interface CustomServiceVariant {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  isPopular?: boolean;
  /** Per-variant capacity; falls back to the service default when unset. */
  capacityOverride?: number;
  /** Whether this specific variant can be booked online. Defaults to true. */
  onlineBookingEnabled?: boolean;
}

export interface CustomServiceAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface CustomServiceModule {
  id: string;
  /**
   * Primary facility this module belongs to. Kept as the first entry of
   * {@link facilityIds} for backward compatibility with single-facility views.
   */
  facilityId: number;
  /**
   * All facilities of the tenant this module is assigned to. A module (e.g. a
   * Pet Taxi) can apply to several facilities at once. Always includes
   * {@link facilityId} as its first element.
   */
  facilityIds: number[];
  name: string;
  /**
   * Short label shown in the facility sidebar navigation. May differ from the
   * full {@link name} (e.g. "Dog Swimming Pool Sessions" → "Pool Sessions").
   * Falls back to {@link name} when empty.
   */
  sidebarLabel?: string;
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
    /**
     * Per-service operating hours that override the facility's global hours
     * (e.g. a pool open only Wed–Sat). When `enabled` is false the facility
     * hours apply.
     */
    operatingHoursOverride?: {
      enabled: boolean;
      days: CustomServiceOperatingDay[];
    };
    /** How far ahead and how close to start time clients may book. */
    bookingWindow?: {
      /** Maximum days in advance a client may book. */
      maxAdvanceDays: number;
      /** Minimum hours of notice required before a session. */
      minAdvanceHours: number;
    };
    /** Whether sessions are one-off or repeat on a cadence. */
    recurrence?: {
      mode: CustomServiceRecurrenceMode;
      frequency: CustomServiceRecurrenceFrequency;
      /** Cap on auto-generated sessions when recurring. */
      maxSessions: number;
    };
  };
  checkInOut: {
    enabled: boolean;
    checkInType: "manual" | "auto";
    checkOutTimeTracking: boolean;
    /**
     * When true, a UNIQUE QR code is generated per booking (not a static
     * per-service code), which the client scans on arrival to check in/out.
     */
    qrCodeSupport: boolean;
    /** Where check-in happens; drives the staff check-in notification. */
    checkInLocation?: CustomServiceCheckInLocation;
    /** Grace period + action when a client arrives late. */
    lateArrivalPolicy?: {
      graceMinutes: number;
      action: CustomServiceLateArrivalAction;
    };
    /** Auto-notify the owner when their pet is checked out. */
    departureNotification?: {
      enabled: boolean;
      messageTemplate: string;
    };
  };
  stayBased: {
    enabled: boolean;
    requiresRoomKennel: boolean;
    affectsKennelView: boolean;
    generatesDailyTasks: boolean;
    /** Kind of space used; determines how it appears on space-management views. */
    roomSpaceType?: CustomServiceRoomSpaceType;
    /** Free-text label when {@link roomSpaceType} is "custom". */
    customRoomSpaceLabel?: string;
    /** Allow clients to request early drop-off / late pickup, with optional fees. */
    earlyLateAccess?: {
      earlyCheckIn: boolean;
      lateCheckOut: boolean;
      /** Optional add-on fees; pricing can also be set in the Pricing step. */
      earlyCheckInFee?: number;
      lateCheckOutFee?: number;
    };
    /** How many pets can occupy one space at once (e.g. a 3-dog pool lane). */
    capacityPerSpace?: number;
  };
  onlineBooking: {
    enabled: boolean;
    eligibleClients: "all" | "approved_only" | "active_members_only";
    approvalRequired: boolean;
    /** Max pets a single booking can include. Labelled via facility species config. */
    maxDogsPerSession: number;
    cancellationPolicy: {
      hoursBeforeBooking: number;
      feePercentage: number;
      /** Customer-facing policy text the facility writes within superadmin bounds. */
      text?: string;
    };
    depositRequired: boolean;
    depositAmount?: number;
    depositType?: "fixed" | "percentage";
    /** Refund policy for the deposit. */
    depositRefundPolicy?: {
      refundable: boolean;
      /** Hours before the booking up to which the deposit is refundable. */
      refundableUpToHours?: number;
    };
    /** When a session is full, clients may join a waitlist. */
    waitlist?: {
      enabled: boolean;
      maxSize?: number;
      /** Auto-confirm the next waitlisted client when a spot opens. */
      autoConfirm: boolean;
    };
    /** Shown to the client immediately after they complete a booking. */
    confirmationMessage?: string;
    /** Documents that must be on file before an online booking can complete. */
    requiredDocuments?: CustomServiceBookingDocument[];
  };
  pricing: {
    model: PricingModelType;
    basePrice: number;
    durationTiers?: { durationMinutes: number; price: number }[];
    variants?: CustomServiceVariant[];
    addOns?: CustomServiceAddOn[];
    peakPricingRules?: {
      id: string;
      name: string;
      adjustment: number;
      adjustmentType: "percentage" | "flat";
    }[];
    parentServiceId?: string;
    taxable: boolean;
    /** Which facility tax rate applies when {@link taxable}. Defaults to the facility default. */
    taxRateId?: string;
    tipAllowed: boolean;
    membershipDiscountEligible: boolean;
    /** When payment is collected. The payment integration hook. */
    billingTrigger?: CustomServiceBillingTrigger;
    /** Multi-session packages purchasable on the client portal. */
    packagePricing?: {
      enabled: boolean;
      packages: CustomServicePackage[];
    };
    /** When true, {@link peakPricingRules} apply (different price for some slots/days). */
    peakPricingEnabled?: boolean;
    /** Payment methods offered at checkout. Unchecked methods are not offered. */
    paymentMethods?: CustomServicePaymentMethod[];
  };
  staffAssignment: {
    autoAssign: boolean;
    requiredRole: string;
    customRoleName?: string;
    taskGeneration: ("setup" | "execution" | "cleanup")[];
    /**
     * Certification/training badge required beyond role before a staff member
     * can be assigned. "" or undefined = none; "custom" uses {@link customQualification}.
     */
    requiredQualification?: string;
    customQualification?: string;
    /**
     * Max pets one staff member can supervise simultaneously (safety-sensitive
     * services). Used in capacity calculations. Undefined = no limit.
     */
    staffToPetRatio?: number;
    /** Per-task assignment mode; falls back to "same_as_booking". */
    taskAssignmentModes?: {
      setup?: CustomServiceTaskAssignmentMode;
      execution?: CustomServiceTaskAssignmentMode;
      cleanup?: CustomServiceTaskAssignmentMode;
    };
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
    /** 4th section — physical limits, behavioral flags, emergency protocols. */
    safetyNotes?: "required" | "optional" | "disabled";
    /** How prominently each section appears in the staff service view. */
    staffDisplay?: {
      feeding?: CareInstructionDisplay;
      medication?: CareInstructionDisplay;
      belongings?: CareInstructionDisplay;
      safetyNotes?: CareInstructionDisplay;
    };
  };
  requiresEvaluation: boolean;
  /** Which evaluation type is required when {@link requiresEvaluation}. */
  evaluationType?: CustomServiceEvaluationType;
  /** Free-text label when {@link evaluationType} is "custom". */
  customEvaluationLabel?: string;
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
    /** Client must have been a client for at least this many days. 0 = no requirement. */
    minClientTenureDays?: number;
  };

  // Capacity & resource management
  capacity?: {
    enabled: boolean;
    /** Maximum pets per session/slot. */
    maxPerSlot?: number;
    slotDurationMinutes?: number;
    /** Maximum sessions that can run at the same time. */
    maxConcurrentSessions?: number;
    /** Allow this % over capacity for walk-ins. */
    overbookingBufferPercent?: number;
    resources?: CapacityResource[];
    waitlistEnabled: boolean;
    maxWaitlist?: number;
    autoPromote: boolean;
    notifyOnAvailability: boolean;
  };

  // Geographic service area (relevant for transport / taxi services)
  geographicRestriction?: {
    enabled: boolean;
    mode: CustomServiceGeoRestrictionMode;
    /** Radius from the facility when mode is "radius". */
    radius?: number;
    radiusUnit?: "mi" | "km";
    /** Allowed postal codes / neighbourhoods when mode is "postal_codes". */
    postalCodes?: string[];
  };

  // Structured setup questionnaire answers that drive behavior across calendar,
  // booking, tasks, resources, portal, and reporting.
  workflow?: CustomServiceWorkflowQuestionnaire;

  status: CustomServiceStatus;
  disableReason?: string;
  /** ISO datetime when a scheduled publish goes live (status stays draft until then). */
  scheduledPublishAt?: string;
  /** Email the facility admin when this module is published. Defaults to true. */
  notifyFacilityAdminOnPublish?: boolean;
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
// Yipyy Forecast Rules
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
  appliesToAreas: z.array(z.string()),
  createdAt: z.string(),
});
export type WeatherWarningRule = z.infer<typeof weatherWarningRuleSchema>;
