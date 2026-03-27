import { z } from "zod";

// ============================================================================
// Segment Filter System
// ============================================================================

export const segmentFilterCategoryEnum = z.enum([
  "service",
  "pet",
  "frequency",
  "booking",
  "compliance",
  "spending",
  "friends",
]);
export type SegmentFilterCategory = z.infer<typeof segmentFilterCategoryEnum>;

export const segmentFilterOperatorEnum = z.enum([
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "in",
  "not_in",
  "between",
  "contains",
  "is_true",
  "is_false",
]);
export type SegmentFilterOperator = z.infer<typeof segmentFilterOperatorEnum>;

export const segmentFilterSchema = z.object({
  id: z.string(),
  category: segmentFilterCategoryEnum,
  field: z.string(),
  operator: segmentFilterOperatorEnum,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.tuple([z.number(), z.number()]),
  ]),
});
export type SegmentFilter = z.infer<typeof segmentFilterSchema>;

export const filterGroupSchema = z.object({
  id: z.string(),
  filters: z.array(segmentFilterSchema),
});
export type FilterGroup = z.infer<typeof filterGroupSchema>;

export const customerSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  filterGroups: z.array(filterGroupSchema),
  groupLogicOperator: z.enum(["AND", "OR"]),
  customerCount: z.number(),
  isFavorite: z.boolean(),
  isBuiltIn: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomerSegment = z.infer<typeof customerSegmentSchema>;

export interface SegmentFilterFieldDef {
  field: string;
  label: string;
  category: SegmentFilterCategory;
  operators: SegmentFilterOperator[];
  valueType:
    | "number"
    | "text"
    | "select"
    | "multi_select"
    | "date"
    | "date_range"
    | "boolean"
    | "pet_select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
}

// ============================================================================
// Email Templates
// ============================================================================

export const emailTemplateUseCaseEnum = z.enum([
  "welcome",
  "booking_reminder",
  "vaccination_expiry",
  "newsletter",
  "birthday",
  "grooming_rebook",
  "daycare_promo",
  "boarding_seasonal",
  "win_back",
  "referral_program",
  "new_service",
  "playdate_alert",
]);
export type EmailTemplateUseCase = z.infer<typeof emailTemplateUseCaseEnum>;

export const emailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  category: z.enum(["promotional", "transactional", "reminder", "newsletter"]),
  useCase: emailTemplateUseCaseEnum.optional(),
  variables: z.array(z.string()),
  offerSection: z
    .object({
      headline: z.string(),
      description: z.string(),
      code: z.string().optional(),
      expiryDays: z.number().optional(),
    })
    .optional(),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional(),
  previewImageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  timesUsed: z.number(),
});
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

// ============================================================================
// Campaigns
// ============================================================================

export const campaignGoalEnum = z.enum([
  "fill_slow_days",
  "rebook_grooming",
  "promote_packages",
  "holiday_promo",
  "new_service",
  "general",
]);
export type CampaignGoal = z.infer<typeof campaignGoalEnum>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["email", "sms"]),
  templateId: z.string(),
  segmentId: z.string(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "paused"]),
  goal: campaignGoalEnum.optional(),
  scheduledAt: z.string().optional(),
  sentAt: z.string().optional(),
  stats: z.object({
    sent: z.number(),
    delivered: z.number(),
    opened: z.number(),
    clicked: z.number(),
    bounced: z.number(),
    unsubscribed: z.number(),
  }),
  abTest: z
    .object({
      enabled: z.boolean(),
      variantA: z.string(),
      variantB: z.string(),
      splitPercentage: z.number(),
      winner: z.enum(["A", "B"]).optional(),
    })
    .optional(),
  recurring: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(["weekly", "biweekly", "monthly"]),
      dayOfWeek: z.number().optional(),
      dayOfMonth: z.number().optional(),
    })
    .optional(),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;

// ============================================================================
// Facility Branding
// ============================================================================

export const facilityBrandingSchema = z.object({
  logo: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  fromName: z.string(),
  replyToEmail: z.string(),
  footerText: z.string(),
  socialLinks: z.array(z.object({ platform: z.string(), url: z.string() })),
  unsubscribeLink: z.string(),
});
export type FacilityBranding = z.infer<typeof facilityBrandingSchema>;

// ============================================================================
// Playdate Alerts
// ============================================================================

export const playdateAlertConfigSchema = z.object({
  enabled: z.boolean(),
  triggerServices: z.array(z.string()),
  triggerMoment: z.enum(["on_request", "on_confirmation"]),
  channels: z.object({
    sms: z.boolean(),
    email: z.boolean(),
    inApp: z.boolean(),
  }),
  timing: z.enum(["immediate", "scheduled"]),
  beforeHours: z.number().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  rateLimitPerDay: z.number(),
});
export type PlaydateAlertConfig = z.infer<typeof playdateAlertConfigSchema>;

export const playdateAlertTemplateSchema = z.object({
  sms: z.string(),
  email: z.object({ subject: z.string(), body: z.string() }),
  variables: z.array(z.string()),
});
export type PlaydateAlertTemplate = z.infer<typeof playdateAlertTemplateSchema>;

export const playdateAlertLogSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  triggerBookingId: z.string(),
  triggerPetId: z.number(),
  triggerPetName: z.string(),
  recipientCustomerId: z.number(),
  recipientCustomerName: z.string(),
  recipientPetId: z.number(),
  recipientPetName: z.string(),
  channel: z.enum(["sms", "email", "in_app"]),
  status: z.enum(["sent", "suppressed", "failed"]),
  reasonSuppressed: z.string().optional(),
  sentAt: z.string(),
});
export type PlaydateAlertLog = z.infer<typeof playdateAlertLogSchema>;

// ============================================================================
// PromoCode Schemas
//
// Three source definitions with different field names per domain.
// Each gets its own standalone schema.
// ============================================================================

/** services-pricing.ts PromoCode — service-oriented with categories */
export const servicePromoSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number(),
  minPurchase: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().optional(),
  usedCount: z.number(),
  perCustomerLimit: z.number(),
  applicableServices: z.array(z.string()),
  applicableCategories: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string(),
  isFirstTimeOnly: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type ServicePromoCode = z.infer<typeof servicePromoSchema>;

/** retail.ts PromoCode — POS-oriented with product targeting */
export const retailPromoSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number(),
  minPurchase: z.number().optional(),
  maxDiscount: z.number().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  usageLimit: z.number().optional(),
  usageCount: z.number(),
  isActive: z.boolean(),
  applicableTo: z.array(z.string()).optional(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type RetailPromoCode = z.infer<typeof retailPromoSchema>;

/** marketing.ts PromoCode — campaign-oriented with auto-apply & conditions */
export const marketingPromoSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  type: z.enum(["percentage", "fixed", "free_service"]),
  value: z.union([z.number(), z.string()]),
  minPurchase: z.number().optional(),
  maxDiscount: z.number().optional(),
  validFrom: z.string(),
  validUntil: z.string(),
  usageLimit: z.number().optional(),
  usedCount: z.number(),
  perCustomerLimit: z.number().optional(),
  applicableServices: z.array(z.string()).optional(),
  autoApply: z.boolean().optional(),
  conditions: z
    .object({
      firstTimeCustomer: z.boolean().optional(),
      specificDays: z.array(z.string()).optional(),
      specificServices: z.array(z.string()).optional(),
    })
    .optional(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type MarketingPromoCode = z.infer<typeof marketingPromoSchema>;

// ============================================================================
// Referral Notification Templates
// ============================================================================

export const referralNotificationTemplateSchema = z.object({
  id: z.string(),
  type: z.enum([
    "referrer_reward_earned",
    "referee_welcome",
    "referral_milestone",
  ]),
  channel: z.enum(["in_app", "email", "sms"]),
  subject: z.string().optional(),
  titleTemplate: z.string(),
  bodyTemplate: z.string(),
  variables: z.array(z.string()),
});
export type ReferralNotificationTemplate = z.infer<
  typeof referralNotificationTemplateSchema
>;
