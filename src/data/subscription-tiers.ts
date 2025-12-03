// Subscription Tiers Data Models

export type TierType = "beginner" | "pro" | "enterprise" | "custom";

export interface SubscriptionTier {
  id: string;
  name: string;
  type: TierType;
  description: string;
  pricing: {
    monthly: number;
    quarterly: number;
    yearly: number;
    currency: string;
  };
  features: string[];
  limitations: {
    maxUsers: number; // -1 for unlimited
    maxReservations: number; // per month, -1 for unlimited
    storageGB: number; // -1 for unlimited
    maxLocations: number; // -1 for unlimited
    maxClients: number; // -1 for unlimited
  };
  availableModules: string[]; // module IDs that can be enabled for this tier
  isActive: boolean;
  isCustomizable: boolean;
  createdAt: string;
  updatedAt: string;
}

export const subscriptionTiers: SubscriptionTier[] = [
  {
    id: "tier-beginner",
    name: "Puppy",
    type: "beginner",
    description: "Perfect for small facilities just getting started",
    pricing: {
      monthly: 29,
      quarterly: 79,
      yearly: 299,
      currency: "USD",
    },
    features: [
      "Basic booking management",
      "Up to 5 staff users",
      "Client database",
      "Email notifications",
      "Basic reporting",
      "Mobile app access",
      "1 location support",
    ],
    limitations: {
      maxUsers: 5,
      maxReservations: 100,
      storageGB: 5,
      maxLocations: 1,
      maxClients: 50,
    },
    availableModules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    isActive: true,
    isCustomizable: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "tier-pro",
    name: "Pack Leader",
    type: "pro",
    description: "Advanced features for growing pet care businesses",
    pricing: {
      monthly: 79,
      quarterly: 219,
      yearly: 849,
      currency: "USD",
    },
    features: [
      "Advanced booking & scheduling",
      "Up to 20 staff users",
      "Staff scheduling & time tracking",
      "Client portal access",
      "Advanced analytics & reports",
      "Financial management tools",
      "API access",
      "Priority email support",
      "Up to 3 locations",
    ],
    limitations: {
      maxUsers: 20,
      maxReservations: 500,
      storageGB: 25,
      maxLocations: 3,
      maxClients: 300,
    },
    availableModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-grooming-management",
      "module-inventory-management",
    ],
    isActive: true,
    isCustomizable: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "tier-enterprise",
    name: "Alpha Enterprise",
    type: "enterprise",
    description: "Complete solution for large-scale operations",
    pricing: {
      monthly: 199,
      quarterly: 549,
      yearly: 2149,
      currency: "USD",
    },
    features: [
      "Unlimited bookings & reservations",
      "Unlimited staff users",
      "Multi-location management",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone & chat support",
      "Advanced security & compliance",
      "Custom training programs",
      "White-label options",
      "API & webhook access",
    ],
    limitations: {
      maxUsers: -1,
      maxReservations: -1,
      storageGB: 100,
      maxLocations: -1,
      maxClients: -1,
    },
    availableModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-training-education",
      "module-grooming-management",
      "module-inventory-management",
    ],
    isActive: true,
    isCustomizable: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "tier-custom-1",
    name: "Custom Enterprise",
    type: "custom",
    description: "Custom package for premium grooming facilities",
    pricing: {
      monthly: 149,
      quarterly: 409,
      yearly: 1599,
      currency: "USD",
    },
    features: [
      "Grooming-focused features",
      "Up to 15 staff users",
      "Grooming appointment management",
      "Inventory tracking for grooming supplies",
      "Client photo galleries",
      "Before/after photo management",
      "Custom pricing & packages",
      "SMS & email notifications",
      "Up to 5 locations",
    ],
    limitations: {
      maxUsers: 15,
      maxReservations: 400,
      storageGB: 50,
      maxLocations: 5,
      maxClients: 500,
    },
    availableModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-grooming-management",
      "module-inventory-management",
    ],
    isActive: true,
    isCustomizable: true,
    createdAt: "2025-06-15T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
];
