interface Plan {
  id: string;
  name: string;
  description: string;
  pricing: Array<{
    interval: "month" | "quarter" | "year";
    basePrice: number;
    perUserPrice: number;
    isPerUserPricing: boolean;
  }>;
  currency: string;
  features: string[];
  limits: {
    pets: number;
    locations: number;
    staff: number;
    clients: number;
    storage: number; // in GB
    bookings: number;
  };
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Basic features for small facilities",
    pricing: [
      {
        interval: "month",
        basePrice: 0,
        perUserPrice: 0,
        isPerUserPricing: false,
      },
    ],
    currency: "USD",
    features: [
      "Up to 10 pets",
      "Basic booking management",
      "Client profiles",
      "Email notifications",
    ],
    limits: {
      locations: 1,
      staff: 2,
      clients: 25,
      pets: 50,
      storage: 1,
      bookings: 50,
    },
    status: "active",
    createdAt: "2025-11-01",
    updatedAt: "2025-11-01",
  },
  {
    id: "basic",
    name: "Basic",
    description: "Essential tools for growing facilities",
    pricing: [
      {
        interval: "month",
        basePrice: 19,
        perUserPrice: 10,
        isPerUserPricing: true,
      },
      {
        interval: "year",
        basePrice: 190,
        perUserPrice: 100,
        isPerUserPricing: true,
      },
    ],
    currency: "USD",
    features: [
      "Up to 100 pets",
      "Advanced booking management",
      "Staff scheduling",
      "Client communication",
      "Basic reporting",
      "Mobile app access",
    ],
    limits: {
      locations: 3,
      staff: 10,
      clients: 100,
      pets: 250,
      storage: 5,
      bookings: 500,
    },
    status: "active",
    createdAt: "2025-11-01",
    updatedAt: "2025-11-01",
  },
  {
    id: "premium",
    name: "Premium",
    description: "Comprehensive solution for established facilities",
    pricing: [
      {
        interval: "month",
        basePrice: 49,
        perUserPrice: 25,
        isPerUserPricing: true,
      },
      {
        interval: "quarter",
        basePrice: 135,
        perUserPrice: 67.5,
        isPerUserPricing: true,
      },
      {
        interval: "year",
        basePrice: 490,
        perUserPrice: 250,
        isPerUserPricing: true,
      },
    ],
    currency: "USD",
    features: [
      "Unlimited pets",
      "Full booking automation",
      "Advanced staff management",
      "Client portal",
      "Detailed analytics",
      "API access",
      "Priority support",
      "Custom integrations",
    ],
    limits: {
      locations: 10,
      staff: 50,
      clients: 500,
      pets: -1, // unlimited
      storage: 50,
      bookings: -1, // unlimited
    },
    status: "active",
    createdAt: "2025-11-01",
    updatedAt: "2025-11-01",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Tailored solution for large organizations",
    pricing: [
      {
        interval: "month",
        basePrice: 199,
        perUserPrice: 50,
        isPerUserPricing: true,
      },
      {
        interval: "quarter",
        basePrice: 540,
        perUserPrice: 135,
        isPerUserPricing: true,
      },
      {
        interval: "year",
        basePrice: 1990,
        perUserPrice: 500,
        isPerUserPricing: true,
      },
    ],
    currency: "USD",
    features: [
      "Everything in Premium",
      "White-labeling",
      "Dedicated account manager",
      "Custom development",
      "SLA guarantees",
      "Advanced security",
      "Multi-location support",
    ],
    limits: {
      locations: -1, // unlimited
      staff: -1,
      clients: -1,
      pets: -1,
      storage: -1,
      bookings: -1,
    },
    status: "active",
    createdAt: "2025-11-01",
    updatedAt: "2025-11-01",
  },
];
