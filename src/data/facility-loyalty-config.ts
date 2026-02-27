/**
 * Facility Loyalty Program Configuration
 * 
 * This module provides a comprehensive, rule-based configuration system
 * for facility loyalty programs. All settings are facility-specific and
 * configurable through the admin interface.
 * 
 * IMPORTANT: This is a rule-based system - nothing is hardcoded.
 * All loyalty behavior is driven by facility configuration.
 */

// ============================================================================
// Core Configuration Interfaces
// ============================================================================

/**
 * Points Earning Method Configuration
 * Facilities can choose how customers earn points
 */
export type PointsEarningMethod = 
  | "per_dollar"           // X points per $1 spent
  | "per_booking"           // Fixed points per booking
  | "per_service_type"     // Different points per service type
  | "per_visit_count"      // Points based on visit count milestones
  | "hybrid";              // Combination of methods

/**
 * Points Earning Rule - Defines how points are calculated
 */
export interface PointsEarningRule {
  id: string;
  method: PointsEarningMethod;
  
  // Per Dollar Configuration
  perDollar?: {
    enabled: boolean;
    basePoints: number;              // Base points per $1 (e.g., 1 point per $1)
    tierMultipliers?: {              // Tier-based multipliers
      tierId: string;
      multiplier: number;            // e.g., 1.25 for Silver tier
    }[];
    minimumPurchase?: number;        // Minimum purchase to earn points
    maximumPointsPerTransaction?: number; // Cap on points per transaction
  };
  
  // Per Booking Configuration
  perBooking?: {
    enabled: boolean;
    basePoints: number;              // Fixed points per booking
    serviceTypePoints?: {            // Override per service type
      serviceType: string;           // "grooming", "daycare", "boarding", etc.
      points: number;
    }[];
    tierMultipliers?: {
      tierId: string;
      multiplier: number;
    }[];
  };
  
  // Per Service Type Configuration
  perServiceType?: {
    enabled: boolean;
    servicePoints: {                  // Points per service type
      serviceType: string;
      points: number;
      pointsPerDollar?: number;      // Optional: also earn per dollar for this service
    }[];
  };
  
  // Per Visit Count Configuration
  perVisitCount?: {
    enabled: boolean;
    milestones: {                    // Visit count milestones
      visitCount: number;            // e.g., 10 visits
      bonusPoints: number;           // Bonus points awarded
      description: string;           // e.g., "10th Visit Bonus"
    }[];
    serviceType?: string[];          // Which service types count (empty = all)
  };
  
  // Hybrid Configuration
  hybrid?: {
    enabled: boolean;
    rules: PointsEarningRule[];     // Multiple rules combined
    combinationMethod: "add" | "max" | "weighted"; // How to combine rules
  };
}

/**
 * Points Expiration Configuration
 */
export interface PointsExpirationConfig {
  enabled: boolean;
  expirationType: "none" | "time_based" | "activity_based" | "tier_based";
  
  // Time-based expiration
  timeBased?: {
    expirationMonths: number;        // Points expire after X months
    expirationDays?: number;         // Optional: more granular
    expirationPolicy: "fifo" | "lifo" | "proportional"; // Which points expire first
  };
  
  // Activity-based expiration
  activityBased?: {
    expireAfterInactiveMonths: number; // Expire if no activity for X months
    resetOnActivity: boolean;         // Reset expiration timer on any activity
  };
  
  // Tier-based expiration
  tierBased?: {
    tiers: {
      tierId: string;
      expirationMonths: number;      // Different expiration per tier
    }[];
  };
  
  // Expiration warnings
  warnings?: {
    enabled: boolean;
    warnDaysBefore: number[];        // e.g., [30, 14, 7] - warn at these intervals
    sendEmail: boolean;
    sendSms: boolean;
    showInPortal: boolean;
  };
}

/**
 * Tier Configuration
 */
export interface LoyaltyTierConfig {
  id: string;
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints?: number;                // Optional: max points for this tier
  color: string;
  icon?: string;
  
  // Tier Benefits
  benefits: {
    type: "discount" | "bonus_points" | "free_service" | "priority" | "custom";
    value: number | string;          // Discount %, bonus multiplier, service name, etc.
    description: string;
    applicableTo?: string[];         // Which services/products this applies to
  }[];
  
  // Tier-specific earning multipliers
  earningMultiplier?: number;        // e.g., 1.25x points for Silver tier
  
  // Tier-specific discounts
  discountPercentage?: number;       // e.g., 5% discount for Silver tier
  discountApplicableTo?: ("services" | "retail" | "both")[];
  
  // Tier upgrade requirements
  upgradeRequirements?: {
    pointsRequired: number;
    minimumSpend?: number;
    minimumVisits?: number;
  };
}

/**
 * Reward Type Configuration
 */
export type RewardType = 
  | "discount_code"      // Generate a discount code
  | "credit_balance"     // Add credit to customer account
  | "auto_apply"         // Automatically apply discount to next booking
  | "free_service"       // Free service voucher
  | "product_discount"   // Discount on specific products
  | "custom";            // Custom reward (defined by facility)

export interface RewardTypeConfig {
  type: RewardType;
  enabled: boolean;
  defaultExpiryDays?: number;        // Default expiration for this reward type
  applicableTo?: ("services" | "retail" | "both")[];
  restrictions?: {
    minimumPurchase?: number;
    maximumDiscount?: number;
    cannotCombineWithOtherRewards?: boolean;
  };
}

/**
 * Points Scope Configuration
 * Defines what transactions earn points
 */
export interface PointsScopeConfig {
  enabled: boolean;
  scope: "services_only" | "retail_only" | "both";
  
  // Service-specific rules
  services?: {
    enabled: boolean;
    serviceTypes: string[];          // Which service types earn points
    excludeServiceTypes?: string[];  // Which service types are excluded
    minimumServiceAmount?: number;   // Minimum service amount to earn points
  };
  
  // Retail-specific rules
  retail?: {
    enabled: boolean;
    categories?: string[];            // Which product categories earn points
    excludeCategories?: string[];    // Which categories are excluded
    excludeSaleItems?: boolean;      // Don't earn points on sale items
    minimumPurchaseAmount?: number;  // Minimum purchase to earn points
  };
  
  // Exclusions
  exclusions?: {
    discountedItems?: boolean;       // Don't earn points on discounted items
    giftCards?: boolean;              // Don't earn points on gift card purchases
    packages?: boolean;               // Don't earn points on package purchases
    memberships?: boolean;            // Don't earn points on membership purchases
    customExclusions?: string[];     // Custom exclusion rules
  };
}

/**
 * Discount Stacking Rules
 * Defines how loyalty discounts interact with other discounts
 */
export interface DiscountStackingConfig {
  enabled: boolean;
  
  // Stacking behavior
  stackingBehavior: 
    | "no_stacking"              // Loyalty discounts cannot stack with other discounts
    | "stack_with_promos"       // Can stack with promo codes
    | "stack_with_member"       // Can stack with member discounts
    | "stack_all"               // Can stack with all discounts
    | "best_discount_only"      // Apply only the best discount
    | "custom";                 // Custom stacking rules
  
  // Custom stacking rules
  customRules?: {
    canStackWith: string[];          // List of discount types that can stack
    cannotStackWith: string[];       // List of discount types that cannot stack
    stackingOrder: string[];         // Order in which discounts are applied
    maximumTotalDiscount?: number;   // Maximum total discount percentage
  };
  
  // Tier discount stacking
  tierDiscountStacking?: {
    enabled: boolean;
    canStackWithOtherDiscounts: boolean;
    stackingPriority: "first" | "last" | "custom"; // When tier discount is applied
  };
  
  // Points redemption stacking
  pointsRedemptionStacking?: {
    enabled: boolean;
    canUseWithDiscounts: boolean;
    canUseWithPromoCodes: boolean;
    redemptionPriority: "before_discounts" | "after_discounts";
  };
}

/**
 * Referral Program Configuration
 */
export interface ReferralProgramConfig {
  enabled: boolean;
  
  // Referrer rewards
  referrerReward: {
    type: "points" | "credit" | "discount";
    value: number;
    description: string;
  };
  
  // Referee rewards
  refereeReward: {
    type: "points" | "credit" | "discount";
    value: number;
    description: string;
  };
  
  // Referral requirements
  requirements?: {
    minimumPurchase?: number;        // Referee must make minimum purchase
    firstBookingOnly?: boolean;       // Reward only on first booking
    serviceTypes?: string[];         // Only certain service types count
  };
  
  // Referral tracking
  tracking?: {
    referralCodeLength: number;
    customCodePrefix?: string;
    expirationDays?: number;
  };
}

/**
 * Birthday & Special Event Rewards
 */
export interface SpecialEventRewardsConfig {
  enabled: boolean;
  
  birthdayReward?: {
    enabled: boolean;
    type: "points" | "credit" | "discount" | "free_service";
    value: number | string;
    description: string;
    validDays: number;               // Days before/after birthday
  };
  
  anniversaryReward?: {
    enabled: boolean;
    type: "points" | "credit" | "discount";
    value: number | string;
    description: string;
    anniversaryYears: number[];       // e.g., [1, 2, 5] - reward at these anniversaries
  };
  
  holidayRewards?: {
    enabled: boolean;
    holidays: {
      holidayName: string;
      date: string;                   // ISO date or "MM-DD" format
      reward: {
        type: "points" | "credit" | "discount";
        value: number | string;
        description: string;
      };
    }[];
  };
}

/**
 * Complete Facility Loyalty Configuration
 */
export interface FacilityLoyaltyConfig {
  facilityId: number;
  enabled: boolean;
  
  // Core Configuration
  pointsEarning: PointsEarningRule;
  pointsExpiration: PointsExpirationConfig;
  tiers: LoyaltyTierConfig[];
  rewardTypes: RewardTypeConfig[];
  pointsScope: PointsScopeConfig;
  discountStacking: DiscountStackingConfig;
  
  // Additional Features
  referralProgram?: ReferralProgramConfig;
  specialEventRewards?: SpecialEventRewardsConfig;
  
  // General Settings
  settings: {
    pointsName: string;               // e.g., "Points", "Rewards", "Stars"
    pointsValue: number;              // e.g., 100 points = $5 (for display)
    minimumRedemptionPoints?: number; // Minimum points to redeem
    maximumRedemptionPerTransaction?: number; // Max points per transaction
    allowPartialRedemption?: boolean; // Can redeem partial points
    showPointsOnReceipt?: boolean;   // Display points earned on receipt
    showPointsInPortal?: boolean;    // Show points balance in customer portal
    allowPointsTransfer?: boolean;   // Allow transferring points between accounts
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// Default Configurations (Examples)
// ============================================================================

/**
 * Default Points Earning Rule - Per Dollar
 */
export const defaultPerDollarEarningRule: PointsEarningRule = {
  id: "default-per-dollar",
  method: "per_dollar",
  perDollar: {
    enabled: true,
    basePoints: 1,                   // 1 point per $1
    minimumPurchase: 0,
  },
};

/**
 * Default Points Earning Rule - Per Booking
 */
export const defaultPerBookingEarningRule: PointsEarningRule = {
  id: "default-per-booking",
  method: "per_booking",
  perBooking: {
    enabled: true,
    basePoints: 50,                  // 50 points per booking
    serviceTypePoints: [
      { serviceType: "grooming", points: 50 },
      { serviceType: "daycare", points: 50 },
      { serviceType: "boarding", points: 100 },
    ],
  },
};

/**
 * Default Points Earning Rule - Per Service Type
 */
export const defaultPerServiceTypeEarningRule: PointsEarningRule = {
  id: "default-per-service-type",
  method: "per_service_type",
  perServiceType: {
    enabled: true,
    servicePoints: [
      { serviceType: "grooming", points: 50 },
      { serviceType: "daycare", points: 50 },
      { serviceType: "boarding", points: 100 },
      { serviceType: "training", points: 75 },
    ],
  },
};

/**
 * Default Points Earning Rule - Hybrid
 */
export const defaultHybridEarningRule: PointsEarningRule = {
  id: "default-hybrid",
  method: "hybrid",
  hybrid: {
    enabled: true,
    combinationMethod: "add",
    rules: [
      defaultPerDollarEarningRule,
      defaultPerBookingEarningRule,
    ],
  },
};

/**
 * Default Tier Configuration
 */
export const defaultTiers: LoyaltyTierConfig[] = [
  {
    id: "tier-bronze",
    name: "Bronze",
    displayName: "Bronze Member",
    minPoints: 0,
    color: "#CD7F32",
    benefits: [
      {
        type: "bonus_points",
        value: 1,
        description: "Earn 1 point per $1 spent",
      },
    ],
  },
  {
    id: "tier-silver",
    name: "Silver",
    displayName: "Silver Member",
    minPoints: 500,
    color: "#C0C0C0",
    earningMultiplier: 1.25,
    discountPercentage: 5,
    discountApplicableTo: ["services", "retail"],
    benefits: [
      {
        type: "bonus_points",
        value: 1.25,
        description: "Earn 1.25 points per $1 spent",
      },
      {
        type: "discount",
        value: 5,
        description: "5% discount on all services",
      },
      {
        type: "priority",
        value: 1,
        description: "Priority booking",
      },
    ],
  },
  {
    id: "tier-gold",
    name: "Gold",
    displayName: "Gold Member",
    minPoints: 1500,
    color: "#FFD700",
    earningMultiplier: 1.5,
    discountPercentage: 10,
    discountApplicableTo: ["services", "retail"],
    benefits: [
      {
        type: "bonus_points",
        value: 1.5,
        description: "Earn 1.5 points per $1 spent",
      },
      {
        type: "discount",
        value: 10,
        description: "10% discount on all services",
      },
      {
        type: "priority",
        value: 1,
        description: "Priority booking",
      },
      {
        type: "free_service",
        value: "add-ons",
        description: "Free add-ons",
      },
    ],
  },
  {
    id: "tier-platinum",
    name: "Platinum",
    displayName: "Platinum Member",
    minPoints: 3000,
    color: "#E5E4E2",
    earningMultiplier: 2,
    discountPercentage: 15,
    discountApplicableTo: ["services", "retail"],
    benefits: [
      {
        type: "bonus_points",
        value: 2,
        description: "Earn 2 points per $1 spent",
      },
      {
        type: "discount",
        value: 15,
        description: "15% discount on all services",
      },
      {
        type: "priority",
        value: 1,
        description: "VIP treatment",
      },
      {
        type: "free_service",
        value: "grooming",
        description: "Free grooming monthly",
      },
    ],
  },
];

/**
 * Default Points Scope - Both Services and Retail
 */
export const defaultPointsScope: PointsScopeConfig = {
  enabled: true,
  scope: "both",
  services: {
    enabled: true,
    serviceTypes: ["grooming", "daycare", "boarding", "training"],
  },
  retail: {
    enabled: true,
    excludeSaleItems: false,
  },
  exclusions: {
    discountedItems: false,
    giftCards: true,
    packages: false,
    memberships: false,
  },
};

/**
 * Default Discount Stacking Configuration
 */
export const defaultDiscountStacking: DiscountStackingConfig = {
  enabled: true,
  stackingBehavior: "best_discount_only",
  tierDiscountStacking: {
    enabled: true,
    canStackWithOtherDiscounts: false,
    stackingPriority: "first",
  },
  pointsRedemptionStacking: {
    enabled: true,
    canUseWithDiscounts: true,
    canUseWithPromoCodes: false,
    redemptionPriority: "after_discounts",
  },
};

/**
 * Default Points Expiration Configuration
 */
export const defaultPointsExpiration: PointsExpirationConfig = {
  enabled: true,
  expirationType: "time_based",
  timeBased: {
    expirationMonths: 12,
    expirationPolicy: "fifo", // First in, first out
  },
  warnings: {
    enabled: true,
    warnDaysBefore: [30, 14, 7],
    sendEmail: true,
    sendSms: false,
    showInPortal: true,
  },
};

/**
 * Default Reward Types Configuration
 */
export const defaultRewardTypes: RewardTypeConfig[] = [
  {
    type: "credit_balance",
    enabled: true,
    defaultExpiryDays: 90,
    applicableTo: ["services", "retail"],
  },
  {
    type: "discount_code",
    enabled: true,
    defaultExpiryDays: 60,
    applicableTo: ["services", "retail"],
    restrictions: {
      minimumPurchase: 0,
      cannotCombineWithOtherRewards: false,
    },
  },
  {
    type: "free_service",
    enabled: true,
    defaultExpiryDays: 60,
    applicableTo: ["services"],
  },
  {
    type: "auto_apply",
    enabled: true,
    applicableTo: ["services", "retail"],
  },
];

// ============================================================================
// Example Facility Configurations
// ============================================================================

/**
 * Example: Simple Per-Dollar Configuration
 */
export const exampleSimplePerDollarConfig: FacilityLoyaltyConfig = {
  facilityId: 1,
  enabled: true,
  pointsEarning: defaultPerDollarEarningRule,
  pointsExpiration: defaultPointsExpiration,
  tiers: defaultTiers,
  rewardTypes: defaultRewardTypes,
  pointsScope: defaultPointsScope,
  discountStacking: defaultDiscountStacking,
  settings: {
    pointsName: "Points",
    pointsValue: 5, // 100 points = $5
    minimumRedemptionPoints: 100,
    showPointsOnReceipt: true,
    showPointsInPortal: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Example: Per-Booking Configuration
 */
export const examplePerBookingConfig: FacilityLoyaltyConfig = {
  facilityId: 2,
  enabled: true,
  pointsEarning: defaultPerBookingEarningRule,
  pointsExpiration: {
    enabled: false,
    expirationType: "none",
  },
  tiers: defaultTiers,
  rewardTypes: defaultRewardTypes,
  pointsScope: {
    enabled: true,
    scope: "services_only",
    services: {
      enabled: true,
      serviceTypes: ["grooming", "daycare", "boarding"],
    },
  },
  discountStacking: defaultDiscountStacking,
  settings: {
    pointsName: "Stars",
    pointsValue: 10, // 100 stars = $10
    minimumRedemptionPoints: 50,
    showPointsOnReceipt: true,
    showPointsInPortal: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Example: Hybrid Configuration with Visit Milestones
 */
export const exampleHybridWithMilestonesConfig: FacilityLoyaltyConfig = {
  facilityId: 3,
  enabled: true,
  pointsEarning: {
    id: "hybrid-milestones",
    method: "hybrid",
    hybrid: {
      enabled: true,
      combinationMethod: "add",
      rules: [
        defaultPerDollarEarningRule,
        {
          id: "visit-milestones",
          method: "per_visit_count",
          perVisitCount: {
            enabled: true,
            milestones: [
              { visitCount: 10, bonusPoints: 100, description: "10th Visit Bonus" },
              { visitCount: 25, bonusPoints: 250, description: "25th Visit Bonus" },
              { visitCount: 50, bonusPoints: 500, description: "50th Visit Bonus" },
            ],
          },
        },
      ],
    },
  },
  pointsExpiration: defaultPointsExpiration,
  tiers: defaultTiers,
  rewardTypes: defaultRewardTypes,
  pointsScope: defaultPointsScope,
  discountStacking: defaultDiscountStacking,
  referralProgram: {
    enabled: true,
    referrerReward: {
      type: "points",
      value: 200,
      description: "200 points for referring a friend",
    },
    refereeReward: {
      type: "points",
      value: 100,
      description: "100 points for new customers",
    },
  },
  settings: {
    pointsName: "Rewards",
    pointsValue: 5,
    minimumRedemptionPoints: 100,
    showPointsOnReceipt: true,
    showPointsInPortal: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get facility loyalty configuration
 */
export function getFacilityLoyaltyConfig(facilityId: number): FacilityLoyaltyConfig | null {
  // In production, this would fetch from database
  // For now, return example configs based on facility ID
  const configs: Record<number, FacilityLoyaltyConfig> = {
    1: exampleSimplePerDollarConfig,
    2: examplePerBookingConfig,
    3: exampleHybridWithMilestonesConfig,
  };
  
  return configs[facilityId] || null;
}

/**
 * Calculate points earned for a transaction
 */
export function calculatePointsEarned(
  config: FacilityLoyaltyConfig,
  transaction: {
    amount: number;
    serviceType?: string;
    isBooking: boolean;
    visitCount?: number;
    customerTier?: string;
  }
): number {
  if (!config.enabled) return 0;
  
  const rule = config.pointsEarning;
  let totalPoints = 0;
  
  // Per Dollar Calculation
  if (rule.perDollar?.enabled) {
    const basePoints = Math.floor(transaction.amount * rule.perDollar.basePoints);
    let multiplier = 1;
    
    // Apply tier multiplier if applicable
    if (transaction.customerTier && rule.perDollar.tierMultipliers) {
      const tierMultiplier = rule.perDollar.tierMultipliers.find(
        (tm) => tm.tierId === transaction.customerTier
      );
      if (tierMultiplier) {
        multiplier = tierMultiplier.multiplier;
      }
    }
    
    let points = Math.floor(basePoints * multiplier);
    
    // Apply maximum per transaction if set
    if (rule.perDollar.maximumPointsPerTransaction) {
      points = Math.min(points, rule.perDollar.maximumPointsPerTransaction);
    }
    
    totalPoints += points;
  }
  
  // Per Booking Calculation
  if (rule.perBooking?.enabled && transaction.isBooking) {
    let points = rule.perBooking.basePoints;
    
    // Service type override
    if (transaction.serviceType && rule.perBooking.serviceTypePoints) {
      const servicePoints = rule.perBooking.serviceTypePoints.find(
        (stp) => stp.serviceType === transaction.serviceType
      );
      if (servicePoints) {
        points = servicePoints.points;
      }
    }
    
    // Apply tier multiplier
    if (transaction.customerTier && rule.perBooking.tierMultipliers) {
      const tierMultiplier = rule.perBooking.tierMultipliers.find(
        (tm) => tm.tierId === transaction.customerTier
      );
      if (tierMultiplier) {
        points = Math.floor(points * tierMultiplier.multiplier);
      }
    }
    
    totalPoints += points;
  }
  
  // Per Service Type Calculation
  if (rule.perServiceType?.enabled && transaction.serviceType) {
    const servicePoints = rule.perServiceType.servicePoints.find(
      (sp) => sp.serviceType === transaction.serviceType
    );
    if (servicePoints) {
      totalPoints += servicePoints.points;
      
      // Also earn per dollar if configured
      if (servicePoints.pointsPerDollar) {
        totalPoints += Math.floor(transaction.amount * servicePoints.pointsPerDollar);
      }
    }
  }
  
  // Visit Count Milestones
  if (rule.perVisitCount?.enabled && transaction.visitCount) {
    const milestone = rule.perVisitCount.milestones.find(
      (m) => m.visitCount === transaction.visitCount
    );
    if (milestone) {
      totalPoints += milestone.bonusPoints;
    }
  }
  
  // Hybrid Calculation
  if (rule.hybrid?.enabled && rule.hybrid.rules) {
    const hybridPoints = rule.hybrid.rules.reduce((sum, subRule) => {
      const subConfig: FacilityLoyaltyConfig = {
        ...config,
        pointsEarning: subRule,
      };
      return sum + calculatePointsEarned(subConfig, transaction);
    }, 0);
    
    if (rule.hybrid.combinationMethod === "max") {
      // This would need more complex logic to track individual rule results
      totalPoints = Math.max(totalPoints, hybridPoints);
    } else {
      totalPoints += hybridPoints;
    }
  }
  
  return totalPoints;
}

/**
 * Check if transaction is eligible for points
 */
export function isTransactionEligibleForPoints(
  config: FacilityLoyaltyConfig,
  transaction: {
    type: "service" | "retail";
    serviceType?: string;
    amount: number;
    isDiscounted?: boolean;
    isGiftCard?: boolean;
    isPackage?: boolean;
    isMembership?: boolean;
  }
): boolean {
  if (!config.enabled || !config.pointsScope.enabled) return false;
  
  const scope = config.pointsScope;
  
  // Check scope
  if (scope.scope === "services_only" && transaction.type !== "service") return false;
  if (scope.scope === "retail_only" && transaction.type !== "retail") return false;
  
  // Check service eligibility
  if (transaction.type === "service" && scope.services) {
    if (!scope.services.enabled) return false;
    if (scope.services.serviceTypes && transaction.serviceType) {
      if (!scope.services.serviceTypes.includes(transaction.serviceType)) return false;
    }
    if (scope.services.excludeServiceTypes && transaction.serviceType) {
      if (scope.services.excludeServiceTypes.includes(transaction.serviceType)) return false;
    }
    if (scope.services.minimumServiceAmount) {
      if (transaction.amount < scope.services.minimumServiceAmount) return false;
    }
  }
  
  // Check retail eligibility
  if (transaction.type === "retail" && scope.retail) {
    if (!scope.retail.enabled) return false;
    if (scope.retail.minimumPurchaseAmount) {
      if (transaction.amount < scope.retail.minimumPurchaseAmount) return false;
    }
  }
  
  // Check exclusions
  if (scope.exclusions) {
    if (scope.exclusions.discountedItems && transaction.isDiscounted) return false;
    if (scope.exclusions.giftCards && transaction.isGiftCard) return false;
    if (scope.exclusions.packages && transaction.isPackage) return false;
    if (scope.exclusions.memberships && transaction.isMembership) return false;
  }
  
  return true;
}

/**
 * Get customer's current tier based on points
 */
export function getCustomerTier(
  config: FacilityLoyaltyConfig,
  points: number
): LoyaltyTierConfig | null {
  if (!config.enabled || !config.tiers.length) return null;
  
  // Sort tiers by minPoints descending to find highest applicable tier
  const sortedTiers = [...config.tiers].sort((a, b) => b.minPoints - a.minPoints);
  
  for (const tier of sortedTiers) {
    if (points >= tier.minPoints) {
      if (!tier.maxPoints || points < tier.maxPoints) {
        return tier;
      }
    }
  }
  
  // Return lowest tier if no match
  return sortedTiers[sortedTiers.length - 1] || null;
}

/**
 * Check if discount stacking is allowed
 */
export function canStackDiscounts(
  config: FacilityLoyaltyConfig,
  discountTypes: string[]
): boolean {
  if (!config.discountStacking.enabled) return false;
  
  const stacking = config.discountStacking;
  
  if (stacking.stackingBehavior === "no_stacking") return false;
  if (stacking.stackingBehavior === "stack_all") return true;
  if (stacking.stackingBehavior === "best_discount_only") return false;
  
  if (stacking.customRules) {
    // Check custom stacking rules
    for (const discountType of discountTypes) {
      if (stacking.customRules.cannotStackWith.includes(discountType)) {
        return false;
      }
    }
  }
  
  return true;
}
