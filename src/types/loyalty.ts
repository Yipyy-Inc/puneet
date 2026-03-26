import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const pointsEarningMethodEnum = z.enum([
  "per_dollar",
  "per_booking",
  "per_service_type",
  "per_visit_count",
  "hybrid",
]);
export type PointsEarningMethod = z.infer<typeof pointsEarningMethodEnum>;

export const rewardTypeEnum = z.enum([
  "discount_code",
  "credit_balance",
  "auto_apply",
  "free_service",
  "product_discount",
  "custom",
]);
export type RewardType = z.infer<typeof rewardTypeEnum>;

export const referralRewardTypeEnum = z.enum([
  "points",
  "credit",
  "discount",
  "free_service",
  "gift_card",
  "free_add_on",
  "discount_code",
]);
export type ReferralRewardType = z.infer<typeof referralRewardTypeEnum>;

export const referralTriggerTypeEnum = z.enum([
  "after_first_booking",
  "after_first_payment",
  "after_total_reaches",
  "after_n_visits",
]);
export type ReferralTriggerType = z.infer<typeof referralTriggerTypeEnum>;

export const loyaltyTransactionTypeEnum = z.enum([
  "earned",
  "redeemed",
  "expired",
  "adjusted",
  "referral",
]);
export type LoyaltyTransactionType = z.infer<typeof loyaltyTransactionTypeEnum>;

export const loyaltyTransactionSourceEnum = z.enum([
  "booking",
  "pos",
  "online_payment",
  "membership",
  "package",
  "referral",
  "manual",
]);
export type LoyaltyTransactionSource = z.infer<
  typeof loyaltyTransactionSourceEnum
>;

export const redemptionStatusEnum = z.enum([
  "pending",
  "applied",
  "used",
  "expired",
  "cancelled",
]);
export type RedemptionStatus = z.infer<typeof redemptionStatusEnum>;

export const auditEntityTypeEnum = z.enum([
  "loyalty",
  "referral",
  "reward",
  "invoice",
  "booking",
  "payment",
]);
export type AuditEntityType = z.infer<typeof auditEntityTypeEnum>;

export const referralStatusEnum = z.enum([
  "pending",
  "active",
  "completed",
  "cancelled",
]);
export type ReferralStatus = z.infer<typeof referralStatusEnum>;

export const referralRewardStatusEnum = z.enum([
  "pending",
  "eligible",
  "issued",
  "cancelled",
]);
export type ReferralRewardStatus = z.infer<typeof referralRewardStatusEnum>;

export const referralEventTypeEnum = z.enum([
  "booking_created",
  "booking_completed",
  "booking_cancelled",
  "booking_refunded",
  "reward_issued",
  "reward_cancelled",
]);
export type ReferralEventType = z.infer<typeof referralEventTypeEnum>;

export const pointsHistoryTypeEnum = z.enum(["earned", "redeemed", "expired"]);
export type PointsHistoryType = z.infer<typeof pointsHistoryTypeEnum>;

export const badgeCriteriaTypeEnum = z.enum([
  "bookings_count",
  "total_spent",
  "consecutive_months",
  "referrals",
  "reviews",
]);
export type BadgeCriteriaType = z.infer<typeof badgeCriteriaTypeEnum>;

export const badgeRewardTypeEnum = z.enum(["discount", "points", "freebie"]);
export type BadgeRewardType = z.infer<typeof badgeRewardTypeEnum>;

export const loyaltyPermissionEnum = z.enum([
  "loyalty.view",
  "loyalty.manage",
  "loyalty.reports.view",
  "loyalty.reports.export",
  "loyalty.rewards.manage",
  "loyalty.rewards.issue",
  "loyalty.rewards.redeem",
  "loyalty.points.adjust",
  "loyalty.referrals.manage",
  "loyalty.referrals.view",
  "loyalty.settings.manage",
]);
export type LoyaltyPermission = z.infer<typeof loyaltyPermissionEnum>;

// ============================================================================
// Simple Schemas (from marketing.ts — display/customer-facing)
// ============================================================================

export const loyaltyTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  minPoints: z.number(),
  benefits: z.array(z.string()),
  discountPercentage: z.number(),
  color: z.string(),
});
export type LoyaltyTier = z.infer<typeof loyaltyTierSchema>;

export const loyaltySettingsSchema = z.object({
  enabled: z.boolean(),
  pointsPerDollar: z.number(),
  pointsValue: z.number(),
  expirationMonths: z.number().optional(),
  tiers: z.array(loyaltyTierSchema),
});
export type LoyaltySettings = z.infer<typeof loyaltySettingsSchema>;

export const pointsHistoryEntrySchema = z.object({
  date: z.string(),
  points: z.number(),
  type: pointsHistoryTypeEnum,
  description: z.string(),
});
export type PointsHistoryEntry = z.infer<typeof pointsHistoryEntrySchema>;

export const customerLoyaltySchema = z.object({
  clientId: z.number(),
  points: z.number(),
  tier: z.string(),
  lifetimePoints: z.number(),
  pointsHistory: z.array(pointsHistoryEntrySchema),
});
export type CustomerLoyalty = z.infer<typeof customerLoyaltySchema>;

export const loyaltyRewardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requiredPoints: z.number(),
  rewardType: z.enum([
    "discount_code",
    "credit_balance",
    "auto_apply",
    "free_service",
  ]),
  rewardValue: z.union([z.number(), z.string()]),
  applicableServices: z.array(z.string()).optional(),
  expiryDays: z.number().optional(),
  terms: z.string().optional(),
  isActive: z.boolean(),
  facilityId: z.number().optional(),
});
export type LoyaltyReward = z.infer<typeof loyaltyRewardSchema>;

/** Simple earning rule used for display in marketing module */
export const simplePointsEarningRuleSchema = z.object({
  type: z.enum(["per_dollar", "per_visit", "per_referral", "bonus", "holiday"]),
  description: z.string(),
  points: z.union([
    z.number(),
    z.object({ base: z.number(), multiplier: z.number().optional() }),
  ]),
  applicableServices: z.array(z.string()).optional(),
  conditions: z.string().optional(),
});
/** Simple points earning rule (marketing display). Not to be confused with the
 *  complex PointsEarningRule used in facility loyalty config. */
export type SimplePointsEarningRule = z.infer<
  typeof simplePointsEarningRuleSchema
>;

export const referralCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  referrerId: z.number(),
  referrerReward: z.number(),
  refereeReward: z.number(),
  timesUsed: z.number(),
  maxUses: z.number().optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  isActive: z.boolean(),
});
export type ReferralCode = z.infer<typeof referralCodeSchema>;

export const badgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  criteria: z.object({
    type: badgeCriteriaTypeEnum,
    threshold: z.number(),
  }),
  reward: z
    .object({
      type: badgeRewardTypeEnum,
      value: z.union([z.number(), z.string()]),
    })
    .optional(),
});
export type Badge = z.infer<typeof badgeSchema>;

// ============================================================================
// Integration Schemas (from loyalty-integrations.ts)
// ============================================================================

export const loyaltyTransactionSchema = z.object({
  id: z.string(),
  customerId: z.number(),
  facilityId: z.number(),
  transactionType: loyaltyTransactionTypeEnum,
  points: z.number(),
  value: z.number().optional(),
  description: z.string(),
  source: loyaltyTransactionSourceEnum,
  sourceId: z.string().optional(),
  invoiceId: z.string().optional(),
  bookingId: z.string().optional(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type LoyaltyTransaction = z.infer<typeof loyaltyTransactionSchema>;

export const rewardRedemptionSchema = z.object({
  id: z.string(),
  customerId: z.number(),
  facilityId: z.number(),
  rewardId: z.string(),
  rewardType: z.enum(["points", "credit", "discount", "free_service"]),
  rewardValue: z.union([z.number(), z.string()]),
  pointsDeducted: z.number().optional(),
  creditAmount: z.number().optional(),
  discountCode: z.string().optional(),
  appliedToInvoiceId: z.string().optional(),
  appliedToBookingId: z.string().optional(),
  status: redemptionStatusEnum,
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  usedAt: z.string().optional(),
});
export type RewardRedemption = z.infer<typeof rewardRedemptionSchema>;

export const auditLogEntrySchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  userId: z.number().optional(),
  customerId: z.number().optional(),
  action: z.string(),
  entityType: auditEntityTypeEnum,
  entityId: z.string().optional(),
  changes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

/** Credit transaction created during reward/referral redemptions */
export const creditTransactionSchema = z.object({
  type: z.string(),
  amount: z.number(),
  description: z.string(),
});
export type CreditTransaction = z.infer<typeof creditTransactionSchema>;

// ============================================================================
// Referral Tracking Schemas (from referral-tracking.ts)
// ============================================================================

export const referralRelationshipSchema = z.object({
  id: z.string(),
  referrerId: z.number(),
  referredCustomerId: z.number(),
  referralCode: z.string(),
  facilityId: z.number(),
  createdAt: z.string(),
  status: referralStatusEnum,
  firstBookingId: z.string().optional(),
  firstBookingDate: z.string().optional(),
  firstBookingValue: z.number().optional(),
  totalBookingValue: z.number().optional(),
  referrerRewardStatus: referralRewardStatusEnum,
  referrerRewardIssuedAt: z.string().optional(),
  referrerRewardValue: z.union([z.number(), z.string()]).optional(),
  referrerRewardType: referralRewardTypeEnum.optional(),
  refereeRewardStatus: referralRewardStatusEnum,
  refereeRewardIssuedAt: z.string().optional(),
  refereeRewardValue: z.union([z.number(), z.string()]).optional(),
  refereeRewardType: referralRewardTypeEnum.optional(),
  isSelfReferral: z.boolean(),
  isDuplicate: z.boolean(),
  validationNotes: z.string().optional(),
});
export type ReferralRelationship = z.infer<typeof referralRelationshipSchema>;

export const referralEventSchema = z.object({
  id: z.string(),
  referralRelationshipId: z.string(),
  eventType: referralEventTypeEnum,
  bookingId: z.string().optional(),
  bookingValue: z.number().optional(),
  rewardValue: z.union([z.number(), z.string()]).optional(),
  rewardType: referralRewardTypeEnum.optional(),
  timestamp: z.string(),
  notes: z.string().optional(),
});
export type ReferralEvent = z.infer<typeof referralEventSchema>;

export const referralValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  canTriggerReward: z.boolean(),
  reason: z.string().optional(),
});
export type ReferralValidationResult = z.infer<
  typeof referralValidationResultSchema
>;

// ============================================================================
// Complex Config Types (from facility-loyalty-config.ts)
// These are config schemas with deep nesting — kept as interfaces.
// ============================================================================

export interface PointsEarningRule {
  id: string;
  method: PointsEarningMethod;
  perDollar?: {
    enabled: boolean;
    basePoints: number;
    tierMultipliers?: { tierId: string; multiplier: number }[];
    minimumPurchase?: number;
    maximumPointsPerTransaction?: number;
  };
  perBooking?: {
    enabled: boolean;
    basePoints: number;
    serviceTypePoints?: { serviceType: string; points: number }[];
    tierMultipliers?: { tierId: string; multiplier: number }[];
  };
  perServiceType?: {
    enabled: boolean;
    servicePoints: {
      serviceType: string;
      points: number;
      pointsPerDollar?: number;
    }[];
  };
  perVisitCount?: {
    enabled: boolean;
    milestones: {
      visitCount: number;
      bonusPoints: number;
      description: string;
    }[];
    serviceType?: string[];
  };
  hybrid?: {
    enabled: boolean;
    rules: PointsEarningRule[];
    combinationMethod: "add" | "max" | "weighted";
  };
}

export interface PointsExpirationConfig {
  enabled: boolean;
  expirationType: "none" | "time_based" | "activity_based" | "tier_based";
  timeBased?: {
    expirationMonths: number;
    expirationDays?: number;
    expirationPolicy: "fifo" | "lifo" | "proportional";
  };
  activityBased?: {
    expireAfterInactiveMonths: number;
    resetOnActivity: boolean;
  };
  tierBased?: {
    tiers: { tierId: string; expirationMonths: number }[];
  };
  warnings?: {
    enabled: boolean;
    warnDaysBefore: number[];
    sendEmail: boolean;
    sendSms: boolean;
    showInPortal: boolean;
  };
}

export interface LoyaltyTierConfig {
  id: string;
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints?: number;
  color: string;
  icon?: string;
  benefits: {
    type: "discount" | "bonus_points" | "free_service" | "priority" | "custom";
    value: number | string;
    description: string;
    applicableTo?: string[];
  }[];
  earningMultiplier?: number;
  discountPercentage?: number;
  discountApplicableTo?: ("services" | "retail" | "both")[];
  upgradeRequirements?: {
    pointsRequired: number;
    minimumSpend?: number;
    minimumVisits?: number;
  };
}

export interface RewardTypeConfig {
  type: RewardType;
  enabled: boolean;
  defaultExpiryDays?: number;
  applicableTo?: ("services" | "retail" | "both")[];
  restrictions?: {
    minimumPurchase?: number;
    maximumDiscount?: number;
    cannotCombineWithOtherRewards?: boolean;
  };
}

export interface PointsScopeConfig {
  enabled: boolean;
  scope: "services_only" | "retail_only" | "both";
  services?: {
    enabled: boolean;
    serviceTypes: string[];
    excludeServiceTypes?: string[];
    minimumServiceAmount?: number;
  };
  retail?: {
    enabled: boolean;
    categories?: string[];
    excludeCategories?: string[];
    excludeSaleItems?: boolean;
    minimumPurchaseAmount?: number;
  };
  exclusions?: {
    discountedItems?: boolean;
    giftCards?: boolean;
    packages?: boolean;
    memberships?: boolean;
    customExclusions?: string[];
  };
}

export interface DiscountStackingConfig {
  enabled: boolean;
  stackingBehavior:
    | "no_stacking"
    | "stack_with_promos"
    | "stack_with_member"
    | "stack_all"
    | "best_discount_only"
    | "custom";
  customRules?: {
    canStackWith: string[];
    cannotStackWith: string[];
    stackingOrder: string[];
    maximumTotalDiscount?: number;
  };
  tierDiscountStacking?: {
    enabled: boolean;
    canStackWithOtherDiscounts: boolean;
    stackingPriority: "first" | "last" | "custom";
  };
  pointsRedemptionStacking?: {
    enabled: boolean;
    canUseWithDiscounts: boolean;
    canUseWithPromoCodes: boolean;
    redemptionPriority: "before_discounts" | "after_discounts";
  };
}

export interface ReferralProgramConfig {
  enabled: boolean;
  referrerReward: {
    type: ReferralRewardType;
    value: number | string;
    description: string;
  };
  refereeReward: {
    type: ReferralRewardType;
    value: number | string;
    description: string;
  };
  triggerCondition?: {
    type: ReferralTriggerType;
    threshold?: number;
    serviceTypes?: string[];
    description?: string;
  };
  requirements?: {
    minimumPurchase?: number;
    firstBookingOnly?: boolean;
    serviceTypes?: string[];
  };
  tracking?: {
    referralCodeLength: number;
    customCodePrefix?: string;
    expirationDays?: number;
  };
}

export interface SpecialEventRewardsConfig {
  enabled: boolean;
  birthdayReward?: {
    enabled: boolean;
    type: "points" | "credit" | "discount" | "free_service";
    value: number | string;
    description: string;
    validDays: number;
  };
  anniversaryReward?: {
    enabled: boolean;
    type: "points" | "credit" | "discount";
    value: number | string;
    description: string;
    anniversaryYears: number[];
  };
  holidayRewards?: {
    enabled: boolean;
    holidays: {
      holidayName: string;
      date: string;
      reward: {
        type: "points" | "credit" | "discount";
        value: number | string;
        description: string;
      };
    }[];
  };
}

export interface FacilityLoyaltyConfig {
  facilityId: number;
  enabled: boolean;
  pointsEarning: PointsEarningRule;
  pointsExpiration: PointsExpirationConfig;
  tiers: LoyaltyTierConfig[];
  rewardTypes: RewardTypeConfig[];
  pointsScope: PointsScopeConfig;
  discountStacking: DiscountStackingConfig;
  referralProgram?: ReferralProgramConfig;
  specialEventRewards?: SpecialEventRewardsConfig;
  settings: {
    pointsName: string;
    pointsValue: number;
    minimumRedemptionPoints?: number;
    maximumRedemptionPerTransaction?: number;
    allowPartialRedemption?: boolean;
    showPointsOnReceipt?: boolean;
    showPointsInPortal?: boolean;
    allowPointsTransfer?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// Location & Permission Config Types
// ============================================================================

export interface LocationLoyaltyConfig {
  locationId: number;
  facilityId: number;
  enabled: boolean;
  overridePointsEarning?: boolean;
  overrideTiers?: boolean;
  overrideRewards?: boolean;
  overrideReferrals?: boolean;
  pointsEarning?: PointsEarningRule;
  tiers?: LoyaltyTierConfig[];
  rewardTypes?: RewardTypeConfig[];
  referralProgram?: ReferralProgramConfig;
  restrictions?: {
    serviceTypes?: string[];
    productCategories?: string[];
    minimumPurchase?: number;
  };
}

export interface LoyaltyPermissionConfig {
  facilityId: number;
  locationId?: number;
  rolePermissions: Record<string, LoyaltyPermission[]>;
  customPermissions?: Record<string, LoyaltyPermission[]>;
}

// ============================================================================
// Constants
// ============================================================================

export const BOOKABLE_SERVICE_TYPES = [
  "grooming",
  "daycare",
  "boarding",
  "training",
  "spa",
  "walking",
] as const;
