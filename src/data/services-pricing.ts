// Services & Pricing Data

export type ServiceCategory =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training"
  | "retail";
export type PetSize = "small" | "medium" | "large" | "giant";
export type ServiceStatus = "active" | "inactive" | "seasonal";
export type PricingType = "flat" | "per_hour" | "per_day" | "per_session";
export type MembershipStatus = "active" | "paused" | "cancelled" | "expired";
export type MembershipBillingCycle = "monthly" | "quarterly" | "annually";

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  basePrice: number;
  pricingType: PricingType;
  duration?: number; // in minutes
  status: ServiceStatus;
  sizePricing: {
    size: PetSize;
    priceModifier: number; // percentage or flat amount
    modifierType: "percentage" | "flat";
  }[];
  addOns: string[]; // references to add-on IDs
  isAddOn: boolean;
  requiresBooking: boolean;
  maxPetsPerSlot?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  services: {
    serviceId: string;
    quantity: number;
  }[];
  totalValue: number;
  packagePrice: number;
  savings: number;
  savingsPercentage: number;
  validDays: number;
  status: ServiceStatus;
  popularityRank?: number;
  purchaseCount: number;
  createdAt: string;
}

export interface SeasonalPricing {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  priceModifier: number;
  modifierType: "percentage" | "flat";
  applicableServices: string[]; // service IDs, empty = all
  applicableCategories: ServiceCategory[];
  isActive: boolean;
  createdAt: string;
}

export interface PeakSurcharge {
  id: string;
  name: string;
  description: string;
  triggerType: "occupancy" | "day_of_week" | "holiday" | "time_of_day";
  triggerValue: number | string; // occupancy %, day name, holiday name, or time range
  surchargeAmount: number;
  surchargeType: "percentage" | "flat";
  applicableServices: string[];
  applicableCategories: ServiceCategory[];
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface DynamicPricingRule {
  id: string;
  name: string;
  description: string;
  ruleType: "demand" | "occupancy" | "last_minute" | "advance_booking";
  conditions: {
    minOccupancy?: number;
    maxOccupancy?: number;
    daysBeforeBooking?: number;
    demandLevel?: "low" | "medium" | "high";
  };
  priceAdjustment: number;
  adjustmentType: "percentage" | "flat";
  applicableServices: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Membership {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  planName: string;
  status: MembershipStatus;
  billingCycle: MembershipBillingCycle;
  monthlyPrice: number;
  startDate: string;
  nextBillingDate: string;
  creditsRemaining: number;
  creditsTotal: number;
  discountPercentage: number;
  autoRenew: boolean;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  credits: number;
  discountPercentage: number;
  perks: string[];
  applicableServices: ServiceCategory[];
  isPopular: boolean;
  isActive: boolean;
  subscriberCount: number;
  createdAt: string;
}

export interface PrepaidCredits {
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  expiresAt?: string;
  lastUsedAt?: string;
  transactions: {
    id: string;
    type: "purchase" | "usage" | "refund" | "expired";
    amount: number;
    description: string;
    date: string;
  }[];
}

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  perCustomerLimit: number;
  applicableServices: string[];
  applicableCategories: ServiceCategory[];
  startDate: string;
  endDate: string;
  isFirstTimeOnly: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

// Mock Data

export const services: Service[] = [
  {
    id: "srv-001",
    name: "Standard Boarding",
    category: "boarding",
    description: "Comfortable overnight stay with feeding, walks, and playtime",
    basePrice: 45,
    pricingType: "per_day",
    status: "active",
    sizePricing: [
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 5, modifierType: "flat" },
      { size: "large", priceModifier: 10, modifierType: "flat" },
      { size: "giant", priceModifier: 15, modifierType: "flat" },
    ],
    addOns: ["addon-001", "addon-002", "addon-003"],
    isAddOn: false,
    requiresBooking: true,
    maxPetsPerSlot: 20,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-06-01T14:30:00Z",
  },
  {
    id: "srv-002",
    name: "Luxury Suite Boarding",
    category: "boarding",
    description:
      "Premium private suite with webcam, premium bedding, and extra playtime",
    basePrice: 75,
    pricingType: "per_day",
    status: "active",
    sizePricing: [
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 10, modifierType: "flat" },
      { size: "large", priceModifier: 15, modifierType: "flat" },
      { size: "giant", priceModifier: 25, modifierType: "flat" },
    ],
    addOns: ["addon-001", "addon-002", "addon-003", "addon-004"],
    isAddOn: false,
    requiresBooking: true,
    maxPetsPerSlot: 8,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-06-01T14:30:00Z",
  },
  {
    id: "srv-003",
    name: "Full Day Daycare",
    category: "daycare",
    description: "Full day of supervised play, socialization, and enrichment",
    basePrice: 35,
    pricingType: "per_day",
    status: "active",
    sizePricing: [
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 0, modifierType: "flat" },
      { size: "large", priceModifier: 5, modifierType: "flat" },
      { size: "giant", priceModifier: 10, modifierType: "flat" },
    ],
    addOns: ["addon-001", "addon-005"],
    isAddOn: false,
    requiresBooking: true,
    maxPetsPerSlot: 30,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-05-20T09:15:00Z",
  },
  {
    id: "srv-004",
    name: "Half Day Daycare",
    category: "daycare",
    description:
      "Half day of supervised play and socialization (up to 5 hours)",
    basePrice: 22,
    pricingType: "per_session",
    duration: 300,
    status: "active",
    sizePricing: [
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 0, modifierType: "flat" },
      { size: "large", priceModifier: 3, modifierType: "flat" },
      { size: "giant", priceModifier: 5, modifierType: "flat" },
    ],
    addOns: ["addon-001"],
    isAddOn: false,
    requiresBooking: true,
    maxPetsPerSlot: 30,
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-05-20T09:15:00Z",
  },
  {
    id: "srv-005",
    name: "Bath & Brush",
    category: "grooming",
    description: "Basic bath, blow dry, brush out, ear cleaning, and nail trim",
    basePrice: 40,
    pricingType: "per_session",
    duration: 60,
    status: "active",
    sizePricing: [
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 10, modifierType: "flat" },
      { size: "large", priceModifier: 20, modifierType: "flat" },
      { size: "giant", priceModifier: 35, modifierType: "flat" },
    ],
    addOns: ["addon-006", "addon-007"],
    isAddOn: false,
    requiresBooking: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-04-10T11:00:00Z",
  },
  {
    id: "srv-006",
    name: "Full Groom",
    category: "grooming",
    description:
      "Complete grooming including haircut, bath, styling, and all basics",
    basePrice: 65,
    pricingType: "per_session",
    duration: 120,
    status: "active",
    sizePricing: [
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 15, modifierType: "flat" },
      { size: "large", priceModifier: 30, modifierType: "flat" },
      { size: "giant", priceModifier: 50, modifierType: "flat" },
    ],
    addOns: ["addon-006", "addon-007", "addon-008"],
    isAddOn: false,
    requiresBooking: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-04-10T11:00:00Z",
  },
  {
    id: "srv-007",
    name: "Basic Obedience Training",
    category: "training",
    description:
      "6-week basic obedience course covering sit, stay, come, leash walking",
    basePrice: 250,
    pricingType: "per_session",
    duration: 60,
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: false,
    requiresBooking: true,
    maxPetsPerSlot: 6,
    createdAt: "2024-03-01T10:00:00Z",
    updatedAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "srv-008",
    name: "Private Training Session",
    category: "training",
    description:
      "One-on-one training session tailored to your dog's specific needs",
    basePrice: 85,
    pricingType: "per_hour",
    duration: 60,
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: false,
    requiresBooking: true,
    maxPetsPerSlot: 1,
    createdAt: "2024-03-01T10:00:00Z",
    updatedAt: "2024-03-01T10:00:00Z",
  },
  // Add-on services
  {
    id: "addon-001",
    name: "Extra Playtime",
    category: "daycare",
    description: "Additional 30 minutes of one-on-one playtime",
    basePrice: 15,
    pricingType: "per_session",
    duration: 30,
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "addon-002",
    name: "Medication Administration",
    category: "boarding",
    description: "Oral or topical medication given as prescribed",
    basePrice: 5,
    pricingType: "per_day",
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "addon-003",
    name: "Webcam Access",
    category: "boarding",
    description: "24/7 webcam access to watch your pet",
    basePrice: 10,
    pricingType: "per_day",
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "addon-004",
    name: "Bedtime Story",
    category: "boarding",
    description: "Staff reads or plays calming audio for your pet at bedtime",
    basePrice: 8,
    pricingType: "per_day",
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "addon-005",
    name: "Training Reinforcement",
    category: "daycare",
    description: "Basic command practice during daycare",
    basePrice: 12,
    pricingType: "per_day",
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-02-15T10:00:00Z",
    updatedAt: "2024-02-15T10:00:00Z",
  },
  {
    id: "addon-006",
    name: "Teeth Brushing",
    category: "grooming",
    description: "Gentle teeth brushing with pet-safe toothpaste",
    basePrice: 8,
    pricingType: "per_session",
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "addon-007",
    name: "Flea Treatment",
    category: "grooming",
    description: "Flea bath treatment with medicated shampoo",
    basePrice: 15,
    pricingType: "per_session",
    status: "active",
    sizePricing: [],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "addon-008",
    name: "De-shedding Treatment",
    category: "grooming",
    description: "Deep conditioning and de-shedding treatment",
    basePrice: 20,
    pricingType: "per_session",
    status: "active",
    sizePricing: [
      { size: "small", priceModifier: 0, modifierType: "flat" },
      { size: "medium", priceModifier: 5, modifierType: "flat" },
      { size: "large", priceModifier: 10, modifierType: "flat" },
      { size: "giant", priceModifier: 15, modifierType: "flat" },
    ],
    addOns: [],
    isAddOn: true,
    requiresBooking: false,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
];

export const servicePackages: ServicePackage[] = [
  {
    id: "pkg-001",
    name: "Daycare 10-Pack",
    description: "10 full days of daycare at a discounted rate",
    services: [{ serviceId: "srv-003", quantity: 10 }],
    totalValue: 350,
    packagePrice: 299,
    savings: 51,
    savingsPercentage: 14.6,
    validDays: 180,
    status: "active",
    popularityRank: 1,
    purchaseCount: 156,
    createdAt: "2024-01-20T10:00:00Z",
  },
  {
    id: "pkg-002",
    name: "Daycare 20-Pack",
    description: "20 full days of daycare - best value!",
    services: [{ serviceId: "srv-003", quantity: 20 }],
    totalValue: 700,
    packagePrice: 549,
    savings: 151,
    savingsPercentage: 21.6,
    validDays: 365,
    status: "active",
    popularityRank: 2,
    purchaseCount: 89,
    createdAt: "2024-01-20T10:00:00Z",
  },
  {
    id: "pkg-003",
    name: "Weekend Getaway",
    description: "2 nights boarding + 1 bath & brush",
    services: [
      { serviceId: "srv-001", quantity: 2 },
      { serviceId: "srv-005", quantity: 1 },
    ],
    totalValue: 130,
    packagePrice: 115,
    savings: 15,
    savingsPercentage: 11.5,
    validDays: 90,
    status: "active",
    popularityRank: 3,
    purchaseCount: 67,
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "pkg-004",
    name: "Vacation Package",
    description: "7 nights luxury boarding + full groom on pickup day",
    services: [
      { serviceId: "srv-002", quantity: 7 },
      { serviceId: "srv-006", quantity: 1 },
    ],
    totalValue: 590,
    packagePrice: 499,
    savings: 91,
    savingsPercentage: 15.4,
    validDays: 90,
    status: "active",
    popularityRank: 4,
    purchaseCount: 34,
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "pkg-005",
    name: "Grooming Maintenance",
    description: "4 bath & brush sessions",
    services: [{ serviceId: "srv-005", quantity: 4 }],
    totalValue: 160,
    packagePrice: 140,
    savings: 20,
    savingsPercentage: 12.5,
    validDays: 120,
    status: "active",
    purchaseCount: 45,
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "pkg-006",
    name: "Training Bootcamp",
    description: "Basic obedience course + 2 private follow-up sessions",
    services: [
      { serviceId: "srv-007", quantity: 1 },
      { serviceId: "srv-008", quantity: 2 },
    ],
    totalValue: 420,
    packagePrice: 375,
    savings: 45,
    savingsPercentage: 10.7,
    validDays: 180,
    status: "active",
    purchaseCount: 22,
    createdAt: "2024-03-15T10:00:00Z",
  },
];

export const seasonalPricing: SeasonalPricing[] = [
  {
    id: "season-001",
    name: "Summer Peak Season",
    description: "Peak summer vacation pricing",
    startDate: "2025-06-15",
    endDate: "2025-08-31",
    priceModifier: 15,
    modifierType: "percentage",
    applicableServices: [],
    applicableCategories: ["boarding"],
    isActive: true,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "season-002",
    name: "Holiday Season",
    description: "Thanksgiving through New Year pricing",
    startDate: "2025-11-20",
    endDate: "2026-01-05",
    priceModifier: 20,
    modifierType: "percentage",
    applicableServices: [],
    applicableCategories: ["boarding"],
    isActive: true,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "season-003",
    name: "Spring Break",
    description: "Spring break peak pricing",
    startDate: "2025-03-15",
    endDate: "2025-04-15",
    priceModifier: 10,
    modifierType: "percentage",
    applicableServices: [],
    applicableCategories: ["boarding", "daycare"],
    isActive: true,
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "season-004",
    name: "Winter Slow Season",
    description: "Reduced pricing during slow winter months",
    startDate: "2026-01-15",
    endDate: "2026-02-28",
    priceModifier: -10,
    modifierType: "percentage",
    applicableServices: [],
    applicableCategories: ["boarding", "daycare"],
    isActive: true,
    createdAt: "2024-02-01T10:00:00Z",
  },
];

export const peakSurcharges: PeakSurcharge[] = [
  {
    id: "peak-001",
    name: "High Occupancy Surcharge",
    description: "Applied when boarding occupancy exceeds 85%",
    triggerType: "occupancy",
    triggerValue: 85,
    surchargeAmount: 10,
    surchargeType: "percentage",
    applicableServices: ["srv-001", "srv-002"],
    applicableCategories: ["boarding"],
    isActive: true,
    priority: 1,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "peak-002",
    name: "Weekend Surcharge",
    description: "Friday and Saturday night surcharge",
    triggerType: "day_of_week",
    triggerValue: "friday,saturday",
    surchargeAmount: 5,
    surchargeType: "flat",
    applicableServices: ["srv-001", "srv-002"],
    applicableCategories: ["boarding"],
    isActive: true,
    priority: 2,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "peak-003",
    name: "Holiday Surcharge",
    description: "Major holiday surcharge",
    triggerType: "holiday",
    triggerValue:
      "christmas,thanksgiving,new_years,independence_day,memorial_day,labor_day",
    surchargeAmount: 15,
    surchargeType: "flat",
    applicableServices: [],
    applicableCategories: ["boarding"],
    isActive: true,
    priority: 3,
    createdAt: "2024-01-15T10:00:00Z",
  },
];

export const dynamicPricingRules: DynamicPricingRule[] = [
  {
    id: "dynamic-001",
    name: "Last Minute Discount",
    description: "Discount for bookings made within 24 hours of start",
    ruleType: "last_minute",
    conditions: {
      daysBeforeBooking: 1,
      minOccupancy: 0,
      maxOccupancy: 70,
    },
    priceAdjustment: -15,
    adjustmentType: "percentage",
    applicableServices: ["srv-003", "srv-004"],
    isActive: true,
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "dynamic-002",
    name: "Early Bird Discount",
    description: "Discount for bookings made 30+ days in advance",
    ruleType: "advance_booking",
    conditions: {
      daysBeforeBooking: 30,
    },
    priceAdjustment: -10,
    adjustmentType: "percentage",
    applicableServices: ["srv-001", "srv-002"],
    isActive: true,
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "dynamic-003",
    name: "Low Demand Pricing",
    description: "Lower prices when occupancy is below 40%",
    ruleType: "occupancy",
    conditions: {
      minOccupancy: 0,
      maxOccupancy: 40,
    },
    priceAdjustment: -20,
    adjustmentType: "percentage",
    applicableServices: ["srv-001", "srv-002", "srv-003"],
    isActive: false,
    createdAt: "2024-03-15T10:00:00Z",
  },
];

export const membershipPlans: MembershipPlan[] = [
  {
    id: "plan-001",
    name: "Daycare Basic",
    description: "Perfect for occasional daycare needs",
    monthlyPrice: 99,
    quarterlyPrice: 279,
    annualPrice: 999,
    credits: 4,
    discountPercentage: 10,
    perks: [
      "10% off all services",
      "4 daycare credits/month",
      "Priority booking",
    ],
    applicableServices: ["daycare"],
    isPopular: false,
    isActive: true,
    subscriberCount: 45,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "plan-002",
    name: "Daycare Plus",
    description: "Our most popular plan for regular daycare users",
    monthlyPrice: 179,
    quarterlyPrice: 499,
    annualPrice: 1799,
    credits: 8,
    discountPercentage: 15,
    perks: [
      "15% off all services",
      "8 daycare credits/month",
      "Priority booking",
      "Free bath & brush monthly",
      "Rollover credits (up to 4)",
    ],
    applicableServices: ["daycare", "grooming"],
    isPopular: true,
    isActive: true,
    subscriberCount: 112,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "plan-003",
    name: "Daycare Unlimited",
    description: "Unlimited daycare access for power users",
    monthlyPrice: 349,
    quarterlyPrice: 949,
    annualPrice: 3499,
    credits: -1, // unlimited
    discountPercentage: 20,
    perks: [
      "20% off all services",
      "Unlimited daycare",
      "Priority booking",
      "Free bath & brush monthly",
      "Free grooming upgrade (quarterly)",
      "VIP lounge access",
    ],
    applicableServices: ["daycare", "grooming", "boarding"],
    isPopular: false,
    isActive: true,
    subscriberCount: 28,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "plan-004",
    name: "Boarding Saver",
    description: "Great savings for frequent boarders",
    monthlyPrice: 149,
    quarterlyPrice: 419,
    annualPrice: 1499,
    credits: 3,
    discountPercentage: 15,
    perks: [
      "15% off boarding",
      "3 boarding night credits/month",
      "Priority holiday booking",
      "Free webcam access",
    ],
    applicableServices: ["boarding"],
    isPopular: false,
    isActive: true,
    subscriberCount: 34,
    createdAt: "2024-02-01T10:00:00Z",
  },
];

export const memberships: Membership[] = [
  {
    id: "mem-001",
    customerId: "cust-001",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.johnson@email.com",
    planId: "plan-002",
    planName: "Daycare Plus",
    status: "active",
    billingCycle: "monthly",
    monthlyPrice: 179,
    startDate: "2024-01-15",
    nextBillingDate: "2025-02-15",
    creditsRemaining: 5,
    creditsTotal: 8,
    discountPercentage: 15,
    autoRenew: true,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "mem-002",
    customerId: "cust-002",
    customerName: "Michael Chen",
    customerEmail: "m.chen@email.com",
    planId: "plan-003",
    planName: "Daycare Unlimited",
    status: "active",
    billingCycle: "annually",
    monthlyPrice: 291.58,
    startDate: "2024-03-01",
    nextBillingDate: "2025-03-01",
    creditsRemaining: -1,
    creditsTotal: -1,
    discountPercentage: 20,
    autoRenew: true,
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "mem-003",
    customerId: "cust-003",
    customerName: "Emily Rodriguez",
    customerEmail: "emily.r@email.com",
    planId: "plan-001",
    planName: "Daycare Basic",
    status: "active",
    billingCycle: "monthly",
    monthlyPrice: 99,
    startDate: "2024-06-01",
    nextBillingDate: "2025-02-01",
    creditsRemaining: 2,
    creditsTotal: 4,
    discountPercentage: 10,
    autoRenew: true,
    createdAt: "2024-06-01T10:00:00Z",
  },
  {
    id: "mem-004",
    customerId: "cust-004",
    customerName: "David Thompson",
    customerEmail: "d.thompson@email.com",
    planId: "plan-004",
    planName: "Boarding Saver",
    status: "paused",
    billingCycle: "quarterly",
    monthlyPrice: 139.67,
    startDate: "2024-04-15",
    nextBillingDate: "2025-04-15",
    creditsRemaining: 3,
    creditsTotal: 3,
    discountPercentage: 15,
    autoRenew: false,
    createdAt: "2024-04-15T10:00:00Z",
  },
  {
    id: "mem-005",
    customerId: "cust-005",
    customerName: "Jennifer Park",
    customerEmail: "j.park@email.com",
    planId: "plan-002",
    planName: "Daycare Plus",
    status: "cancelled",
    billingCycle: "monthly",
    monthlyPrice: 179,
    startDate: "2024-02-01",
    nextBillingDate: "2024-12-01",
    creditsRemaining: 0,
    creditsTotal: 8,
    discountPercentage: 15,
    autoRenew: false,
    createdAt: "2024-02-01T10:00:00Z",
  },
];

export const prepaidCredits: PrepaidCredits[] = [
  {
    id: "credit-001",
    customerId: "cust-006",
    customerName: "Amanda Wilson",
    balance: 250,
    totalPurchased: 500,
    totalUsed: 250,
    expiresAt: "2025-12-31",
    lastUsedAt: "2025-01-10",
    transactions: [
      {
        id: "txn-001",
        type: "purchase",
        amount: 500,
        description: "Prepaid credit purchase",
        date: "2024-06-15T10:00:00Z",
      },
      {
        id: "txn-002",
        type: "usage",
        amount: -150,
        description: "Full groom - Max",
        date: "2024-08-20T14:30:00Z",
      },
      {
        id: "txn-003",
        type: "usage",
        amount: -100,
        description: "3 days daycare",
        date: "2025-01-10T09:00:00Z",
      },
    ],
  },
  {
    id: "credit-002",
    customerId: "cust-007",
    customerName: "Robert Martinez",
    balance: 175,
    totalPurchased: 200,
    totalUsed: 25,
    expiresAt: "2025-08-31",
    lastUsedAt: "2025-01-05",
    transactions: [
      {
        id: "txn-004",
        type: "purchase",
        amount: 200,
        description: "Prepaid credit purchase",
        date: "2024-11-01T10:00:00Z",
      },
      {
        id: "txn-005",
        type: "usage",
        amount: -25,
        description: "Half day daycare",
        date: "2025-01-05T11:00:00Z",
      },
    ],
  },
  {
    id: "credit-003",
    customerId: "cust-008",
    customerName: "Lisa Brown",
    balance: 0,
    totalPurchased: 300,
    totalUsed: 280,
    expiresAt: "2024-06-30",
    lastUsedAt: "2024-05-15",
    transactions: [
      {
        id: "txn-006",
        type: "purchase",
        amount: 300,
        description: "Prepaid credit purchase",
        date: "2024-01-10T10:00:00Z",
      },
      {
        id: "txn-007",
        type: "usage",
        amount: -280,
        description: "Various services",
        date: "2024-05-15T16:00:00Z",
      },
      {
        id: "txn-008",
        type: "expired",
        amount: -20,
        description: "Credits expired",
        date: "2024-06-30T23:59:59Z",
      },
    ],
  },
];

export const promoCodes: PromoCode[] = [
  {
    id: "promo-001",
    code: "WELCOME20",
    name: "Welcome Discount",
    description: "20% off first booking for new customers",
    discountType: "percentage",
    discountValue: 20,
    maxDiscount: 50,
    usageLimit: 500,
    usedCount: 234,
    perCustomerLimit: 1,
    applicableServices: [],
    applicableCategories: [],
    startDate: "2024-01-01",
    endDate: "2025-12-31",
    isFirstTimeOnly: true,
    isActive: true,
    createdAt: "2024-01-01T10:00:00Z",
    createdBy: "Admin",
  },
  {
    id: "promo-002",
    code: "SUMMER10",
    name: "Summer Special",
    description: "$10 off any daycare booking",
    discountType: "flat",
    discountValue: 10,
    usageLimit: 200,
    usedCount: 89,
    perCustomerLimit: 3,
    applicableServices: ["srv-003", "srv-004"],
    applicableCategories: ["daycare"],
    startDate: "2025-06-01",
    endDate: "2025-08-31",
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2025-05-15T10:00:00Z",
    createdBy: "Marketing Team",
  },
  {
    id: "promo-003",
    code: "GROOM15",
    name: "Grooming Discount",
    description: "15% off any grooming service",
    discountType: "percentage",
    discountValue: 15,
    usedCount: 45,
    perCustomerLimit: 2,
    applicableServices: [],
    applicableCategories: ["grooming"],
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2024-12-20T10:00:00Z",
    createdBy: "Admin",
  },
  {
    id: "promo-004",
    code: "REFER25",
    name: "Referral Reward",
    description: "$25 off for referred customers",
    discountType: "flat",
    discountValue: 25,
    minPurchase: 50,
    usedCount: 67,
    perCustomerLimit: 1,
    applicableServices: [],
    applicableCategories: [],
    startDate: "2024-01-01",
    endDate: "2025-12-31",
    isFirstTimeOnly: true,
    isActive: true,
    createdAt: "2024-01-01T10:00:00Z",
    createdBy: "Admin",
  },
  {
    id: "promo-005",
    code: "HOLIDAY25",
    name: "Holiday Special",
    description: "25% off holiday boarding",
    discountType: "percentage",
    discountValue: 25,
    maxDiscount: 100,
    usageLimit: 50,
    usedCount: 50,
    perCustomerLimit: 1,
    applicableServices: ["srv-001", "srv-002"],
    applicableCategories: ["boarding"],
    startDate: "2024-12-15",
    endDate: "2025-01-05",
    isFirstTimeOnly: false,
    isActive: false,
    createdAt: "2024-12-01T10:00:00Z",
    createdBy: "Marketing Team",
  },
  {
    id: "promo-006",
    code: "PACK10",
    name: "Package Discount",
    description: "10% off any package purchase",
    discountType: "percentage",
    discountValue: 10,
    usedCount: 23,
    perCustomerLimit: 1,
    applicableServices: [],
    applicableCategories: [],
    startDate: "2025-01-01",
    endDate: "2025-06-30",
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2024-12-28T10:00:00Z",
    createdBy: "Admin",
  },
];

// Summary statistics
export const servicesPricingStats = {
  totalServices: services.filter((s) => !s.isAddOn).length,
  totalAddOns: services.filter((s) => s.isAddOn).length,
  activeServices: services.filter((s) => s.status === "active" && !s.isAddOn)
    .length,
  totalPackages: servicePackages.length,
  activePackages: servicePackages.filter((p) => p.status === "active").length,
  packagesSold: servicePackages.reduce((sum, p) => sum + p.purchaseCount, 0),
  activeMemberships: memberships.filter((m) => m.status === "active").length,
  membershipRevenue: memberships
    .filter((m) => m.status === "active")
    .reduce((sum, m) => sum + m.monthlyPrice, 0),
  activePromoCodes: promoCodes.filter((p) => p.isActive).length,
  totalPromoRedemptions: promoCodes.reduce((sum, p) => sum + p.usedCount, 0),
  prepaidCreditsOutstanding: prepaidCredits.reduce(
    (sum, c) => sum + c.balance,
    0,
  ),
};
