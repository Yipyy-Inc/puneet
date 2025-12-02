// ========================================
// EMAIL & SMS CAMPAIGN DATA
// ========================================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "promotional" | "transactional" | "reminder" | "newsletter";
  variables: string[]; // e.g., {{client_name}}, {{pet_name}}
  createdAt: string;
  updatedAt: string;
  timesUsed: number;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: "tpl-001",
    name: "Welcome New Client",
    subject: "Welcome to {{facility_name}}!",
    body: `Hi {{client_name}},\n\nWelcome to {{facility_name}}! We're thrilled to have you and {{pet_name}} join our family.\n\nAs a new client, you'll receive 10% off your first booking. Use code: WELCOME10\n\nBest regards,\nThe {{facility_name}} Team`,
    category: "promotional",
    variables: ["client_name", "pet_name", "facility_name"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    timesUsed: 45,
  },
  {
    id: "tpl-002",
    name: "Booking Reminder - 24 Hours",
    subject: "Reminder: {{pet_name}}'s appointment tomorrow",
    body: `Hi {{client_name}},\n\nThis is a friendly reminder that {{pet_name}} has a {{service_type}} appointment tomorrow at {{appointment_time}}.\n\nSee you soon!\n\nThe {{facility_name}} Team`,
    category: "reminder",
    variables: [
      "client_name",
      "pet_name",
      "service_type",
      "appointment_time",
      "facility_name",
    ],
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-02-05T14:00:00Z",
    timesUsed: 234,
  },
  {
    id: "tpl-003",
    name: "Vaccination Expiry Warning",
    subject: "{{pet_name}}'s vaccinations need updating",
    body: `Hi {{client_name}},\n\nOur records show that {{pet_name}}'s {{vaccine_name}} vaccination expires on {{expiry_date}}.\n\nPlease update their vaccination records to continue using our services.\n\nThank you,\n{{facility_name}}`,
    category: "reminder",
    variables: [
      "client_name",
      "pet_name",
      "vaccine_name",
      "expiry_date",
      "facility_name",
    ],
    createdAt: "2024-01-20T11:00:00Z",
    updatedAt: "2024-01-20T11:00:00Z",
    timesUsed: 67,
  },
  {
    id: "tpl-004",
    name: "Monthly Newsletter",
    subject: "{{facility_name}} Monthly Update - {{month}}",
    body: `Hi {{client_name}},\n\nHere's what's new at {{facility_name}} this month:\n\n- Special holiday hours\n- New grooming services\n- Pet care tips\n\nRead more on our website!\n\nBest,\nThe Team`,
    category: "newsletter",
    variables: ["client_name", "facility_name", "month"],
    createdAt: "2024-02-01T08:00:00Z",
    updatedAt: "2024-02-01T08:00:00Z",
    timesUsed: 12,
  },
  {
    id: "tpl-005",
    name: "Birthday Celebration",
    subject: "Happy Birthday {{pet_name}}! 🎉",
    body: `Hi {{client_name}},\n\n{{pet_name}} is celebrating a birthday! 🎂\n\nEnjoy 20% off your next booking with code: BIRTHDAY20\n\nValid for 30 days.\n\nCheers,\n{{facility_name}}`,
    category: "promotional",
    variables: ["client_name", "pet_name", "facility_name"],
    createdAt: "2024-01-25T10:00:00Z",
    updatedAt: "2024-01-25T10:00:00Z",
    timesUsed: 89,
  },
];

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  filters: {
    field: string;
    operator: "equals" | "contains" | "greater_than" | "less_than" | "in_range";
    value: string | number | boolean | string[];
  }[];
  customerCount: number;
  createdAt: string;
  updatedAt: string;
}

export const customerSegments: CustomerSegment[] = [
  {
    id: "seg-001",
    name: "VIP Customers",
    description: "Customers who spent over $1000 in the last year",
    filters: [
      { field: "totalSpent", operator: "greater_than", value: 1000 },
      { field: "status", operator: "equals", value: "active" },
    ],
    customerCount: 23,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-02-15T14:00:00Z",
  },
  {
    id: "seg-002",
    name: "Inactive Customers",
    description: "Customers who haven't booked in 90+ days",
    filters: [
      { field: "lastBookingDate", operator: "less_than", value: "90_days_ago" },
      { field: "status", operator: "equals", value: "active" },
    ],
    customerCount: 47,
    createdAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-02-20T09:00:00Z",
  },
  {
    id: "seg-003",
    name: "First-Time Customers",
    description: "Customers with only 1 booking",
    filters: [{ field: "totalBookings", operator: "equals", value: 1 }],
    customerCount: 34,
    createdAt: "2024-01-20T13:00:00Z",
    updatedAt: "2024-02-10T10:00:00Z",
  },
  {
    id: "seg-004",
    name: "Dog Owners",
    description: "Customers with at least one dog",
    filters: [{ field: "petType", operator: "contains", value: "dog" }],
    customerCount: 156,
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-02-01T09:00:00Z",
  },
];

export interface Campaign {
  id: string;
  name: string;
  type: "email" | "sms";
  templateId: string;
  segmentId: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused";
  scheduledAt?: string;
  sentAt?: string;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  abTest?: {
    enabled: boolean;
    variantA: string; // template ID
    variantB: string; // template ID
    splitPercentage: number; // 50 = 50/50 split
    winner?: "A" | "B";
  };
  createdAt: string;
  createdBy: string;
}

export const campaigns: Campaign[] = [
  {
    id: "cmp-001",
    name: "February Newsletter",
    type: "email",
    templateId: "tpl-004",
    segmentId: "seg-004",
    status: "sent",
    scheduledAt: "2024-02-01T09:00:00Z",
    sentAt: "2024-02-01T09:05:00Z",
    stats: {
      sent: 156,
      delivered: 154,
      opened: 89,
      clicked: 34,
      bounced: 2,
      unsubscribed: 1,
    },
    createdAt: "2024-01-28T14:00:00Z",
    createdBy: "Sarah Johnson",
  },
  {
    id: "cmp-002",
    name: "Win-Back Inactive Customers",
    type: "email",
    templateId: "tpl-001",
    segmentId: "seg-002",
    status: "scheduled",
    scheduledAt: "2024-03-01T10:00:00Z",
    stats: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
    },
    abTest: {
      enabled: true,
      variantA: "tpl-001",
      variantB: "tpl-005",
      splitPercentage: 50,
    },
    createdAt: "2024-02-20T11:00:00Z",
    createdBy: "Mike Davis",
  },
  {
    id: "cmp-003",
    name: "VIP Exclusive Offer",
    type: "email",
    templateId: "tpl-005",
    segmentId: "seg-001",
    status: "sent",
    scheduledAt: "2024-02-14T08:00:00Z",
    sentAt: "2024-02-14T08:02:00Z",
    stats: {
      sent: 23,
      delivered: 23,
      opened: 21,
      clicked: 18,
      bounced: 0,
      unsubscribed: 0,
    },
    createdAt: "2024-02-12T13:00:00Z",
    createdBy: "Sarah Johnson",
  },
];

// ========================================
// LOYALTY & REFERRALS DATA
// ========================================

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerDollar: number; // e.g., 1 point per $1 spent
  pointsValue: number; // e.g., 100 points = $5
  expirationMonths?: number; // points expire after X months
  tiers: LoyaltyTier[];
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  benefits: string[];
  discountPercentage: number;
  color: string;
}

export const loyaltySettings: LoyaltySettings = {
  enabled: true,
  pointsPerDollar: 1,
  pointsValue: 5, // 100 points = $5
  expirationMonths: 12,
  tiers: [
    {
      id: "tier-bronze",
      name: "Bronze",
      minPoints: 0,
      benefits: ["Earn 1 point per $1 spent", "Birthday bonus"],
      discountPercentage: 0,
      color: "#CD7F32",
    },
    {
      id: "tier-silver",
      name: "Silver",
      minPoints: 500,
      benefits: [
        "Earn 1.25 points per $1 spent",
        "Priority booking",
        "Birthday bonus",
      ],
      discountPercentage: 5,
      color: "#C0C0C0",
    },
    {
      id: "tier-gold",
      name: "Gold",
      minPoints: 1500,
      benefits: [
        "Earn 1.5 points per $1 spent",
        "Priority booking",
        "Free add-ons",
        "Birthday bonus",
      ],
      discountPercentage: 10,
      color: "#FFD700",
    },
    {
      id: "tier-platinum",
      name: "Platinum",
      minPoints: 3000,
      benefits: [
        "Earn 2 points per $1 spent",
        "VIP treatment",
        "Free grooming monthly",
        "Birthday bonus",
      ],
      discountPercentage: 15,
      color: "#E5E4E2",
    },
  ],
};

export interface CustomerLoyalty {
  clientId: number;
  points: number;
  tier: string;
  lifetimePoints: number;
  pointsHistory: {
    date: string;
    points: number;
    type: "earned" | "redeemed" | "expired";
    description: string;
  }[];
}

export const customerLoyaltyData: CustomerLoyalty[] = [
  {
    clientId: 1,
    points: 1250,
    tier: "tier-silver",
    lifetimePoints: 2100,
    pointsHistory: [
      {
        date: "2024-02-20T10:00:00Z",
        points: 125,
        type: "earned",
        description: "Booking payment - $125.00",
      },
      {
        date: "2024-02-10T14:00:00Z",
        points: -500,
        type: "redeemed",
        description: "Redeemed for $25 discount",
      },
      {
        date: "2024-01-28T09:00:00Z",
        points: 200,
        type: "earned",
        description: "Booking payment - $200.00",
      },
    ],
  },
];

export interface ReferralCode {
  id: string;
  code: string;
  referrerId: number; // client ID
  referrerReward: number; // $ amount
  refereeReward: number; // $ amount
  timesUsed: number;
  maxUses?: number;
  expiresAt?: string;
  createdAt: string;
  isActive: boolean;
}

export const referralCodes: ReferralCode[] = [
  {
    id: "ref-001",
    code: "SARAH-REFER",
    referrerId: 1,
    referrerReward: 25,
    refereeReward: 25,
    timesUsed: 3,
    maxUses: 10,
    createdAt: "2024-01-15T10:00:00Z",
    isActive: true,
  },
  {
    id: "ref-002",
    code: "MIKE-FRIEND",
    referrerId: 2,
    referrerReward: 25,
    refereeReward: 25,
    timesUsed: 1,
    maxUses: 10,
    createdAt: "2024-01-20T11:00:00Z",
    isActive: true,
  },
];

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon name
  criteria: {
    type:
      | "bookings_count"
      | "total_spent"
      | "consecutive_months"
      | "referrals"
      | "reviews";
    threshold: number;
  };
  reward?: {
    type: "discount" | "points" | "freebie";
    value: number | string;
  };
}

export const badges: Badge[] = [
  {
    id: "badge-001",
    name: "Frequent Visitor",
    description: "Completed 10 bookings",
    icon: "⭐",
    criteria: { type: "bookings_count", threshold: 10 },
    reward: { type: "discount", value: 10 },
  },
  {
    id: "badge-002",
    name: "Big Spender",
    description: "Spent $1000+ total",
    icon: "💎",
    criteria: { type: "total_spent", threshold: 1000 },
    reward: { type: "points", value: 500 },
  },
  {
    id: "badge-003",
    name: "Loyal Friend",
    description: "Booked for 6 consecutive months",
    icon: "🏆",
    criteria: { type: "consecutive_months", threshold: 6 },
    reward: { type: "freebie", value: "Free nail trim" },
  },
  {
    id: "badge-004",
    name: "Super Referrer",
    description: "Referred 5 friends",
    icon: "🎯",
    criteria: { type: "referrals", threshold: 5 },
    reward: { type: "discount", value: 20 },
  },
];

// ========================================
// PROMOTIONS DATA
// ========================================

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed" | "free_service";
  value: number | string; // percentage (10) or fixed amount (25) or service name
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  perCustomerLimit?: number;
  applicableServices?: string[]; // empty = all services
  autoApply?: boolean;
  conditions?: {
    firstTimeCustomer?: boolean;
    specificDays?: string[]; // ["monday", "tuesday"]
    specificServices?: string[];
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export const promoCodes: PromoCode[] = [
  {
    id: "promo-001",
    code: "WELCOME10",
    description: "10% off for new customers",
    type: "percentage",
    value: 10,
    maxDiscount: 50,
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2024-12-31T23:59:59Z",
    usedCount: 45,
    perCustomerLimit: 1,
    autoApply: true,
    conditions: {
      firstTimeCustomer: true,
    },
    isActive: true,
    createdBy: "Sarah Johnson",
    createdAt: "2024-01-01T09:00:00Z",
  },
  {
    id: "promo-002",
    code: "SUMMER25",
    description: "$25 off bookings over $100",
    type: "fixed",
    value: 25,
    minPurchase: 100,
    validFrom: "2024-06-01T00:00:00Z",
    validUntil: "2024-08-31T23:59:59Z",
    usageLimit: 100,
    usedCount: 23,
    perCustomerLimit: 3,
    isActive: true,
    createdBy: "Mike Davis",
    createdAt: "2024-05-15T10:00:00Z",
  },
  {
    id: "promo-003",
    code: "MONDAY20",
    description: "20% off Monday bookings",
    type: "percentage",
    value: 20,
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2024-12-31T23:59:59Z",
    usedCount: 67,
    autoApply: true,
    conditions: {
      specificDays: ["monday"],
    },
    isActive: true,
    createdBy: "Sarah Johnson",
    createdAt: "2024-01-10T11:00:00Z",
  },
  {
    id: "promo-004",
    code: "FREEGROOM",
    description: "Free nail trim with grooming",
    type: "free_service",
    value: "Nail Trim",
    validFrom: "2024-02-01T00:00:00Z",
    validUntil: "2024-02-29T23:59:59Z",
    usageLimit: 50,
    usedCount: 12,
    conditions: {
      specificServices: ["grooming"],
    },
    isActive: true,
    createdBy: "Emily Brown",
    createdAt: "2024-01-28T14:00:00Z",
  },
  {
    id: "promo-005",
    code: "BIRTHDAY20",
    description: "Birthday special - 20% off",
    type: "percentage",
    value: 20,
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2024-12-31T23:59:59Z",
    usedCount: 89,
    perCustomerLimit: 1,
    isActive: true,
    createdBy: "Sarah Johnson",
    createdAt: "2024-01-05T09:00:00Z",
  },
];
