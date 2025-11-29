// Facility Subscription Data Models

type SubscriptionStatus =
  | "active"
  | "trial"
  | "suspended"
  | "cancelled"
  | "expired";

export interface FacilitySubscription {
  id: string;
  facilityId: number; // Links to facility in facilities.ts
  facilityName: string;
  tierId: string; // Links to subscription-tiers.ts
  tierName: string;
  status: SubscriptionStatus;
  billingCycle: "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  enabledModules: string[]; // Array of module IDs from modules.ts
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

export const facilitySubscriptions: FacilitySubscription[] = [
  {
    id: "sub-001",
    facilityId: 1,
    facilityName: "Paws & Play Daycare",
    tierId: "tier-pro",
    tierName: "Pro",
    status: "active",
    billingCycle: "yearly",
    startDate: "2025-06-15",
    endDate: "2026-06-15",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-grooming-management",
    ],
    usage: {
      currentUsers: 8,
      monthlyReservations: 342,
      storageUsedGB: 12.5,
      activeLocations: 2,
    },
    billing: {
      baseCost: 849,
      moduleCosts: [
        { moduleId: "module-staff-scheduling", cost: 189 },
        { moduleId: "module-financial-reporting", cost: 299 },
        { moduleId: "module-communication", cost: 149 },
        { moduleId: "module-grooming-management", cost: 269 },
      ],
      totalCost: 1755,
      currency: "USD",
      nextBillingDate: "2026-06-15",
      lastPaymentDate: "2025-06-15",
      paymentMethod: "Credit Card",
    },
    notes: "High-performing facility, good upsell candidate for Enterprise",
    createdAt: "2025-06-15T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-002",
    facilityId: 2,
    facilityName: "Furry Friends Grooming",
    tierId: "tier-beginner",
    tierName: "Beginner",
    status: "active",
    billingCycle: "monthly",
    startDate: "2025-08-22",
    endDate: "2026-08-22",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    usage: {
      currentUsers: 3,
      monthlyReservations: 67,
      storageUsedGB: 2.3,
      activeLocations: 1,
    },
    billing: {
      baseCost: 29,
      moduleCosts: [{ moduleId: "module-communication", cost: 15 }],
      totalCost: 44,
      currency: "USD",
      nextBillingDate: "2025-12-22",
      lastPaymentDate: "2025-11-22",
      paymentMethod: "Credit Card",
    },
    notes: "Growing steadily, potential upgrade to Pro tier",
    createdAt: "2025-08-22T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-003",
    facilityId: 3,
    facilityName: "Happy Tails Boarding",
    tierId: "tier-enterprise",
    tierName: "Enterprise",
    status: "active",
    billingCycle: "yearly",
    startDate: "2025-03-10",
    endDate: "2026-03-10",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-training-education",
      "module-inventory-management",
    ],
    usage: {
      currentUsers: 28,
      monthlyReservations: 1247,
      storageUsedGB: 67.8,
      activeLocations: 3,
    },
    billing: {
      baseCost: 2149,
      moduleCosts: [
        { moduleId: "module-staff-scheduling", cost: 189 },
        { moduleId: "module-financial-reporting", cost: 299 },
        { moduleId: "module-communication", cost: 149 },
        { moduleId: "module-training-education", cost: 419 },
        { moduleId: "module-inventory-management", cost: 369 },
      ],
      totalCost: 3574,
      currency: "USD",
      nextBillingDate: "2026-03-10",
      lastPaymentDate: "2025-03-10",
      paymentMethod: "Bank Transfer",
    },
    notes: "Premium client with custom requirements, dedicated account manager",
    createdAt: "2025-03-10T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-004",
    facilityId: 4,
    facilityName: "Pet Paradise Vet",
    tierId: "tier-pro",
    tierName: "Pro",
    status: "active",
    billingCycle: "quarterly",
    startDate: "2025-11-05",
    endDate: "2026-11-05",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-inventory-management",
    ],
    usage: {
      currentUsers: 12,
      monthlyReservations: 423,
      storageUsedGB: 18.9,
      activeLocations: 1,
    },
    billing: {
      baseCost: 219,
      moduleCosts: [
        { moduleId: "module-staff-scheduling", cost: 49 },
        { moduleId: "module-financial-reporting", cost: 79 },
        { moduleId: "module-communication", cost: 39 },
        { moduleId: "module-inventory-management", cost: 95 },
      ],
      totalCost: 481,
      currency: "USD",
      nextBillingDate: "2026-02-05",
      lastPaymentDate: "2025-11-05",
      paymentMethod: "Credit Card",
    },
    createdAt: "2025-11-05T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-005",
    facilityId: 5,
    facilityName: "Whisker Wonderland",
    tierId: "tier-beginner",
    tierName: "Beginner",
    status: "trial",
    billingCycle: "monthly",
    startDate: "2025-11-01",
    endDate: "2026-11-01",
    trialEndDate: "2025-12-01",
    autoRenew: false,
    enabledModules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    usage: {
      currentUsers: 2,
      monthlyReservations: 34,
      storageUsedGB: 1.1,
      activeLocations: 2,
    },
    billing: {
      baseCost: 0,
      moduleCosts: [],
      totalCost: 0,
      currency: "USD",
      nextBillingDate: "2025-12-01",
    },
    notes: "New facility on trial, follow up before trial ends",
    createdAt: "2025-11-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-006",
    facilityId: 6,
    facilityName: "Pet Groomers Paradise",
    tierId: "tier-custom-1",
    tierName: "Custom - Pet Spa Plus",
    status: "active",
    billingCycle: "yearly",
    startDate: "2025-07-12",
    endDate: "2026-07-12",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-grooming-management",
      "module-inventory-management",
    ],
    customizations: {
      maxUsers: 15,
      maxReservations: 400,
      storageGB: 50,
      maxLocations: 5,
    },
    usage: {
      currentUsers: 14,
      monthlyReservations: 378,
      storageUsedGB: 34.2,
      activeLocations: 2,
    },
    billing: {
      baseCost: 1599,
      moduleCosts: [
        { moduleId: "module-staff-scheduling", cost: 189 },
        { moduleId: "module-financial-reporting", cost: 299 },
        { moduleId: "module-communication", cost: 149 },
        { moduleId: "module-grooming-management", cost: 269 },
        { moduleId: "module-inventory-management", cost: 369 },
      ],
      totalCost: 2874,
      currency: "USD",
      nextBillingDate: "2026-07-12",
      lastPaymentDate: "2025-07-12",
      paymentMethod: "Credit Card",
    },
    notes: "Custom package designed for grooming-focused operations",
    createdAt: "2025-07-12T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-007",
    facilityId: 7,
    facilityName: "Animal Care Center",
    tierId: "tier-beginner",
    tierName: "Beginner",
    status: "active",
    billingCycle: "monthly",
    startDate: "2025-10-05",
    endDate: "2026-10-05",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    usage: {
      currentUsers: 4,
      monthlyReservations: 89,
      storageUsedGB: 3.7,
      activeLocations: 1,
    },
    billing: {
      baseCost: 29,
      moduleCosts: [{ moduleId: "module-communication", cost: 15 }],
      totalCost: 44,
      currency: "USD",
      nextBillingDate: "2025-12-05",
      lastPaymentDate: "2025-11-05",
      paymentMethod: "Credit Card",
    },
    createdAt: "2025-10-05T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-008",
    facilityId: 8,
    facilityName: "Feline Friends",
    tierId: "tier-enterprise",
    tierName: "Enterprise",
    status: "suspended",
    billingCycle: "yearly",
    startDate: "2025-02-20",
    endDate: "2026-02-20",
    autoRenew: false,
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
    ],
    usage: {
      currentUsers: 15,
      monthlyReservations: 0,
      storageUsedGB: 45.3,
      activeLocations: 2,
    },
    billing: {
      baseCost: 2149,
      moduleCosts: [
        { moduleId: "module-staff-scheduling", cost: 189 },
        { moduleId: "module-financial-reporting", cost: 299 },
        { moduleId: "module-communication", cost: 149 },
      ],
      totalCost: 2786,
      currency: "USD",
      nextBillingDate: "2026-02-20",
      lastPaymentDate: "2025-02-20",
      paymentMethod: "Credit Card",
    },
    notes: "Payment failed, account suspended. Follow up required",
    createdAt: "2025-02-20T00:00:00Z",
    updatedAt: "2025-11-15T00:00:00Z",
  },
  {
    id: "sub-009",
    facilityId: 9,
    facilityName: "Doggy Day Spa",
    tierId: "tier-pro",
    tierName: "Pro",
    status: "active",
    billingCycle: "monthly",
    startDate: "2025-12-01",
    endDate: "2026-12-01",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-communication",
      "module-grooming-management",
    ],
    usage: {
      currentUsers: 9,
      monthlyReservations: 287,
      storageUsedGB: 14.6,
      activeLocations: 1,
    },
    billing: {
      baseCost: 79,
      moduleCosts: [
        { moduleId: "module-staff-scheduling", cost: 19 },
        { moduleId: "module-communication", cost: 15 },
        { moduleId: "module-grooming-management", cost: 25 },
      ],
      totalCost: 138,
      currency: "USD",
      nextBillingDate: "2025-12-27",
      lastPaymentDate: "2025-11-27",
      paymentMethod: "Credit Card",
    },
    createdAt: "2025-12-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "sub-010",
    facilityId: 10,
    facilityName: "Exotic Pets Hub",
    tierId: "tier-beginner",
    tierName: "Beginner",
    status: "active",
    billingCycle: "quarterly",
    startDate: "2025-05-15",
    endDate: "2026-05-15",
    autoRenew: true,
    enabledModules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    usage: {
      currentUsers: 3,
      monthlyReservations: 56,
      storageUsedGB: 2.8,
      activeLocations: 2,
    },
    billing: {
      baseCost: 79,
      moduleCosts: [{ moduleId: "module-communication", cost: 39 }],
      totalCost: 118,
      currency: "USD",
      nextBillingDate: "2026-02-15",
      lastPaymentDate: "2025-11-15",
      paymentMethod: "Credit Card",
    },
    createdAt: "2025-05-15T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
];

// Helper functions
export function getSubscriptionsByStatus(
  status: SubscriptionStatus,
): FacilitySubscription[] {
  return facilitySubscriptions.filter((sub) => sub.status === status);
}
