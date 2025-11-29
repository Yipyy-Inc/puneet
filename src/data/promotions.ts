// Promotions & Discounts Management Data Models

export type PromotionScope = "facility" | "system-wide";
export type PromotionStatus = "active" | "scheduled" | "expired" | "paused";
export type DiscountType = "percentage" | "fixed-amount" | "bundle" | "first-time";
export type PromotionTarget = "all-services" | "boarding" | "daycare" | "grooming" | "veterinary" | "training";

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  scope: PromotionScope;
  facilityId?: string;
  facilityName?: string;
  discountType: DiscountType;
  discountValue: number; // percentage or fixed amount
  status: PromotionStatus;
  target: PromotionTarget;
  startDate: string;
  endDate: string;
  usageLimit: number | null; // null = unlimited
  usedCount: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  isFirstTimeOnly: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface PromoCodeUsage {
  id: string;
  promoCode: string;
  promoId: string;
  promoName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  facilityId: string;
  facilityName: string;
  bookingId: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  usedAt: string;
  service: string;
}

export interface BundleDiscount {
  id: string;
  name: string;
  description: string;
  scope: PromotionScope;
  facilityId?: string;
  facilityName?: string;
  services: string[];
  discountPercentage: number;
  minServices: number;
  status: PromotionStatus;
  startDate: string;
  endDate: string;
  redemptionCount: number;
  totalRevenue: number;
  isActive: boolean;
}

export interface FirstTimeOffer {
  id: string;
  name: string;
  description: string;
  discountType: "percentage" | "fixed-amount";
  discountValue: number;
  applicableServices: string[];
  scope: PromotionScope;
  facilityId?: string;
  facilityName?: string;
  status: PromotionStatus;
  validUntil: string;
  redemptionCount: number;
  conversionRate: number;
  isActive: boolean;
}

export interface PromotionPerformance {
  promoId: string;
  promoCode: string;
  promoName: string;
  scope: PromotionScope;
  impressions: number;
  clicks: number;
  redemptions: number;
  clickThroughRate: number; // percentage
  conversionRate: number; // percentage
  totalRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  roi: number; // percentage
  averageOrderValue: number;
  newCustomers: number;
  returningCustomers: number;
  topFacility?: string;
  topService?: string;
}

export interface DiscountImpactMetric {
  period: string; // "week-1", "week-2", etc.
  totalBookings: number;
  discountedBookings: number;
  discountRate: number; // percentage
  totalRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  averageDiscount: number;
  revenueImpact: number; // percentage change
}

export interface RedemptionTrend {
  date: string;
  redemptions: number;
  revenue: number;
  discount: number;
  newCustomers: number;
}

export interface PromotionStats {
  totalPromotions: number;
  activePromotions: number;
  scheduledPromotions: number;
  expiredPromotions: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  totalRevenueGenerated: number;
  averageRedemptionRate: number;
  topPerformingPromo: {
    code: string;
    name: string;
    redemptions: number;
    revenue: number;
  };
}

// Mock Data
export const promotions: Promotion[] = [
  {
    id: "promo-001",
    code: "WELCOME25",
    name: "Welcome Discount",
    description: "25% off for new customers on their first booking",
    scope: "system-wide",
    discountType: "percentage",
    discountValue: 25,
    status: "active",
    target: "all-services",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    usageLimit: null,
    usedCount: 1247,
    isFirstTimeOnly: true,
    isActive: true,
    createdAt: "2025-01-01T08:00:00Z",
    createdBy: "Admin User",
  },
  {
    id: "promo-002",
    code: "SUMMER2025",
    name: "Summer Special",
    description: "$50 off on boarding services for 7+ days",
    scope: "system-wide",
    discountType: "fixed-amount",
    discountValue: 50,
    status: "active",
    target: "boarding",
    startDate: "2025-06-01",
    endDate: "2025-08-31",
    usageLimit: 500,
    usedCount: 342,
    minPurchaseAmount: 300,
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2025-05-15T10:00:00Z",
    createdBy: "Marketing Team",
  },
  {
    id: "promo-003",
    code: "GROOM20",
    name: "Grooming Monday",
    description: "20% off all grooming services every Monday",
    scope: "facility",
    facilityId: "fac-001",
    facilityName: "Paws & Claws Downtown",
    discountType: "percentage",
    discountValue: 20,
    status: "active",
    target: "grooming",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    usageLimit: null,
    usedCount: 856,
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2024-12-20T09:00:00Z",
    createdBy: "Facility Admin",
  },
  {
    id: "promo-004",
    code: "DAYCARE15",
    name: "Daycare Package",
    description: "15% off daycare packages for 10+ days",
    scope: "system-wide",
    discountType: "percentage",
    discountValue: 15,
    status: "active",
    target: "daycare",
    startDate: "2025-01-15",
    endDate: "2025-12-31",
    usageLimit: 1000,
    usedCount: 678,
    minPurchaseAmount: 200,
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2025-01-10T11:00:00Z",
    createdBy: "Admin User",
  },
  {
    id: "promo-005",
    code: "HOLIDAY50",
    name: "Holiday Boarding Special",
    description: "$50 off holiday boarding bookings",
    scope: "system-wide",
    discountType: "fixed-amount",
    discountValue: 50,
    status: "scheduled",
    target: "boarding",
    startDate: "2025-12-15",
    endDate: "2026-01-05",
    usageLimit: 300,
    usedCount: 0,
    minPurchaseAmount: 250,
    isFirstTimeOnly: false,
    isActive: false,
    createdAt: "2025-11-01T08:00:00Z",
    createdBy: "Marketing Team",
  },
  {
    id: "promo-006",
    code: "VET30",
    name: "Wellness Check Discount",
    description: "30% off veterinary wellness checks",
    scope: "facility",
    facilityId: "fac-002",
    facilityName: "Happy Tails Northside",
    discountType: "percentage",
    discountValue: 30,
    status: "active",
    target: "veterinary",
    startDate: "2025-03-01",
    endDate: "2025-11-30",
    usageLimit: 200,
    usedCount: 134,
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2025-02-25T10:00:00Z",
    createdBy: "Facility Admin",
  },
  {
    id: "promo-007",
    code: "TRAIN25",
    name: "Training Course Discount",
    description: "25% off all training courses",
    scope: "system-wide",
    discountType: "percentage",
    discountValue: 25,
    status: "expired",
    target: "training",
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    usageLimit: 150,
    usedCount: 147,
    isFirstTimeOnly: false,
    isActive: false,
    createdAt: "2024-12-15T09:00:00Z",
    createdBy: "Admin User",
  },
  {
    id: "promo-008",
    code: "REFER40",
    name: "Referral Bonus",
    description: "$40 off for both referrer and referee",
    scope: "system-wide",
    discountType: "fixed-amount",
    discountValue: 40,
    status: "active",
    target: "all-services",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    usageLimit: null,
    usedCount: 423,
    minPurchaseAmount: 100,
    isFirstTimeOnly: false,
    isActive: true,
    createdAt: "2025-01-01T08:00:00Z",
    createdBy: "Marketing Team",
  },
];

export const promoCodeUsages: PromoCodeUsage[] = [
  {
    id: "usage-001",
    promoCode: "WELCOME25",
    promoId: "promo-001",
    promoName: "Welcome Discount",
    customerId: "cust-123",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.j@email.com",
    facilityId: "fac-001",
    facilityName: "Paws & Claws Downtown",
    bookingId: "book-1001",
    originalAmount: 200,
    discountAmount: 50,
    finalAmount: 150,
    usedAt: "2025-11-28T10:30:00Z",
    service: "Boarding",
  },
  {
    id: "usage-002",
    promoCode: "SUMMER2025",
    promoId: "promo-002",
    promoName: "Summer Special",
    customerId: "cust-456",
    customerName: "Michael Chen",
    customerEmail: "m.chen@email.com",
    facilityId: "fac-002",
    facilityName: "Happy Tails Northside",
    bookingId: "book-1002",
    originalAmount: 450,
    discountAmount: 50,
    finalAmount: 400,
    usedAt: "2025-11-27T14:20:00Z",
    service: "Boarding",
  },
  {
    id: "usage-003",
    promoCode: "GROOM20",
    promoId: "promo-003",
    promoName: "Grooming Monday",
    customerId: "cust-789",
    customerName: "Emily Rodriguez",
    customerEmail: "emily.r@email.com",
    facilityId: "fac-001",
    facilityName: "Paws & Claws Downtown",
    bookingId: "book-1003",
    originalAmount: 75,
    discountAmount: 15,
    finalAmount: 60,
    usedAt: "2025-11-25T09:15:00Z",
    service: "Grooming",
  },
  {
    id: "usage-004",
    promoCode: "DAYCARE15",
    promoId: "promo-004",
    promoName: "Daycare Package",
    customerId: "cust-234",
    customerName: "David Kim",
    customerEmail: "d.kim@email.com",
    facilityId: "fac-003",
    facilityName: "Pet Paradise Westside",
    bookingId: "book-1004",
    originalAmount: 300,
    discountAmount: 45,
    finalAmount: 255,
    usedAt: "2025-11-26T11:45:00Z",
    service: "Daycare",
  },
  {
    id: "usage-005",
    promoCode: "REFER40",
    promoId: "promo-008",
    promoName: "Referral Bonus",
    customerId: "cust-567",
    customerName: "Lisa Anderson",
    customerEmail: "lisa.a@email.com",
    facilityId: "fac-002",
    facilityName: "Happy Tails Northside",
    bookingId: "book-1005",
    originalAmount: 180,
    discountAmount: 40,
    finalAmount: 140,
    usedAt: "2025-11-24T16:30:00Z",
    service: "Daycare",
  },
];

export const bundleDiscounts: BundleDiscount[] = [
  {
    id: "bundle-001",
    name: "Complete Care Bundle",
    description: "Book boarding + grooming together and save 20%",
    scope: "system-wide",
    services: ["Boarding", "Grooming"],
    discountPercentage: 20,
    minServices: 2,
    status: "active",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    redemptionCount: 234,
    totalRevenue: 45680,
    isActive: true,
  },
  {
    id: "bundle-002",
    name: "Premium Pet Package",
    description: "Boarding + Grooming + Veterinary Check - Save 25%",
    scope: "system-wide",
    services: ["Boarding", "Grooming", "Veterinary"],
    discountPercentage: 25,
    minServices: 3,
    status: "active",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    redemptionCount: 156,
    totalRevenue: 38920,
    isActive: true,
  },
  {
    id: "bundle-003",
    name: "Training & Daycare Combo",
    description: "Combine training and daycare for 15% savings",
    scope: "facility",
    facilityId: "fac-001",
    facilityName: "Paws & Claws Downtown",
    services: ["Training", "Daycare"],
    discountPercentage: 15,
    minServices: 2,
    status: "active",
    startDate: "2025-02-01",
    endDate: "2025-12-31",
    redemptionCount: 89,
    totalRevenue: 18970,
    isActive: true,
  },
  {
    id: "bundle-004",
    name: "Wellness Bundle",
    description: "Veterinary + Grooming package with 18% discount",
    scope: "facility",
    facilityId: "fac-002",
    facilityName: "Happy Tails Northside",
    services: ["Veterinary", "Grooming"],
    discountPercentage: 18,
    minServices: 2,
    status: "active",
    startDate: "2025-03-01",
    endDate: "2025-11-30",
    redemptionCount: 112,
    totalRevenue: 23450,
    isActive: true,
  },
  {
    id: "bundle-005",
    name: "Holiday Care Package",
    description: "All services bundled for holiday season - 30% off",
    scope: "system-wide",
    services: ["Boarding", "Grooming", "Veterinary", "Daycare"],
    discountPercentage: 30,
    minServices: 3,
    status: "scheduled",
    startDate: "2025-12-15",
    endDate: "2026-01-05",
    redemptionCount: 0,
    totalRevenue: 0,
    isActive: false,
  },
];

export const firstTimeOffers: FirstTimeOffer[] = [
  {
    id: "fto-001",
    name: "New Customer Welcome",
    description: "50% off your first booking - any service",
    discountType: "percentage",
    discountValue: 50,
    applicableServices: ["All Services"],
    scope: "system-wide",
    status: "active",
    validUntil: "2025-12-31",
    redemptionCount: 567,
    conversionRate: 68.5,
    isActive: true,
  },
  {
    id: "fto-002",
    name: "First Grooming Free",
    description: "Free grooming service on your first visit",
    discountType: "percentage",
    discountValue: 100,
    applicableServices: ["Grooming"],
    scope: "facility",
    facilityId: "fac-001",
    facilityName: "Paws & Claws Downtown",
    status: "active",
    validUntil: "2025-12-31",
    redemptionCount: 234,
    conversionRate: 72.3,
    isActive: true,
  },
  {
    id: "fto-003",
    name: "Daycare Trial Offer",
    description: "$30 off your first daycare booking",
    discountType: "fixed-amount",
    discountValue: 30,
    applicableServices: ["Daycare"],
    scope: "system-wide",
    status: "active",
    validUntil: "2025-12-31",
    redemptionCount: 445,
    conversionRate: 61.8,
    isActive: true,
  },
  {
    id: "fto-004",
    name: "First Night Free",
    description: "Get one free night when you book 3+ nights of boarding",
    discountType: "percentage",
    discountValue: 25,
    applicableServices: ["Boarding"],
    scope: "facility",
    facilityId: "fac-002",
    facilityName: "Happy Tails Northside",
    status: "active",
    validUntil: "2025-11-30",
    redemptionCount: 189,
    conversionRate: 58.2,
    isActive: true,
  },
  {
    id: "fto-005",
    name: "Training Intro Offer",
    description: "40% off your first training session",
    discountType: "percentage",
    discountValue: 40,
    applicableServices: ["Training"],
    scope: "system-wide",
    status: "active",
    validUntil: "2025-12-31",
    redemptionCount: 312,
    conversionRate: 65.4,
    isActive: true,
  },
];

export const promotionPerformance: PromotionPerformance[] = [
  {
    promoId: "promo-001",
    promoCode: "WELCOME25",
    promoName: "Welcome Discount",
    scope: "system-wide",
    impressions: 45230,
    clicks: 8945,
    redemptions: 1247,
    clickThroughRate: 19.8,
    conversionRate: 13.9,
    totalRevenue: 187450,
    totalDiscount: 62340,
    netRevenue: 125110,
    roi: 200.6,
    averageOrderValue: 150.28,
    newCustomers: 1247,
    returningCustomers: 0,
    topFacility: "Paws & Claws Downtown",
    topService: "Boarding",
  },
  {
    promoId: "promo-002",
    promoCode: "SUMMER2025",
    promoName: "Summer Special",
    scope: "system-wide",
    impressions: 32100,
    clicks: 5460,
    redemptions: 342,
    clickThroughRate: 17.0,
    conversionRate: 6.3,
    totalRevenue: 153900,
    totalDiscount: 17100,
    netRevenue: 136800,
    roi: 800.0,
    averageOrderValue: 450.0,
    newCustomers: 89,
    returningCustomers: 253,
    topFacility: "Happy Tails Northside",
    topService: "Boarding",
  },
  {
    promoId: "promo-003",
    promoCode: "GROOM20",
    promoName: "Grooming Monday",
    scope: "facility",
    impressions: 18500,
    clicks: 3885,
    redemptions: 856,
    clickThroughRate: 21.0,
    conversionRate: 22.0,
    totalRevenue: 64200,
    totalDiscount: 12840,
    netRevenue: 51360,
    roi: 400.0,
    averageOrderValue: 75.0,
    newCustomers: 234,
    returningCustomers: 622,
    topFacility: "Paws & Claws Downtown",
    topService: "Grooming",
  },
  {
    promoId: "promo-004",
    promoCode: "DAYCARE15",
    promoName: "Daycare Package",
    scope: "system-wide",
    impressions: 28900,
    clicks: 4913,
    redemptions: 678,
    clickThroughRate: 17.0,
    conversionRate: 13.8,
    totalRevenue: 203400,
    totalDiscount: 30510,
    netRevenue: 172890,
    roi: 566.7,
    averageOrderValue: 300.0,
    newCustomers: 156,
    returningCustomers: 522,
    topFacility: "Pet Paradise Westside",
    topService: "Daycare",
  },
  {
    promoId: "promo-008",
    promoCode: "REFER40",
    promoName: "Referral Bonus",
    scope: "system-wide",
    impressions: 15600,
    clicks: 2496,
    redemptions: 423,
    clickThroughRate: 16.0,
    conversionRate: 16.9,
    totalRevenue: 76140,
    totalDiscount: 16920,
    netRevenue: 59220,
    roi: 350.0,
    averageOrderValue: 180.0,
    newCustomers: 423,
    returningCustomers: 0,
    topFacility: "Happy Tails Northside",
    topService: "All Services",
  },
];

export const discountImpactMetrics: DiscountImpactMetric[] = [
  {
    period: "Week 1",
    totalBookings: 1250,
    discountedBookings: 342,
    discountRate: 27.4,
    totalRevenue: 187500,
    totalDiscounts: 18750,
    netRevenue: 168750,
    averageDiscount: 54.82,
    revenueImpact: -10.0,
  },
  {
    period: "Week 2",
    totalBookings: 1340,
    discountedBookings: 389,
    discountRate: 29.0,
    totalRevenue: 201000,
    totalDiscounts: 21340,
    netRevenue: 179660,
    averageDiscount: 54.86,
    revenueImpact: -10.6,
  },
  {
    period: "Week 3",
    totalBookings: 1420,
    discountedBookings: 412,
    discountRate: 29.0,
    totalRevenue: 213000,
    totalDiscounts: 23150,
    netRevenue: 189850,
    averageDiscount: 56.19,
    revenueImpact: -10.9,
  },
  {
    period: "Week 4",
    totalBookings: 1380,
    discountedBookings: 398,
    discountRate: 28.8,
    totalRevenue: 207000,
    totalDiscounts: 22100,
    netRevenue: 184900,
    averageDiscount: 55.53,
    revenueImpact: -10.7,
  },
  {
    period: "Week 5",
    totalBookings: 1490,
    discountedBookings: 445,
    discountRate: 29.9,
    totalRevenue: 223500,
    totalDiscounts: 25120,
    netRevenue: 198380,
    averageDiscount: 56.45,
    revenueImpact: -11.2,
  },
  {
    period: "Week 6",
    totalBookings: 1520,
    discountedBookings: 456,
    discountRate: 30.0,
    totalRevenue: 228000,
    totalDiscounts: 26340,
    netRevenue: 201660,
    averageDiscount: 57.76,
    revenueImpact: -11.6,
  },
];

export const redemptionTrends: RedemptionTrend[] = [
  {
    date: "2025-11-23",
    redemptions: 156,
    revenue: 23400,
    discount: 2890,
    newCustomers: 45,
  },
  {
    date: "2025-11-24",
    redemptions: 189,
    revenue: 28350,
    discount: 3420,
    newCustomers: 52,
  },
  {
    date: "2025-11-25",
    redemptions: 223,
    revenue: 33450,
    discount: 4120,
    newCustomers: 67,
  },
  {
    date: "2025-11-26",
    redemptions: 198,
    revenue: 29700,
    discount: 3650,
    newCustomers: 58,
  },
  {
    date: "2025-11-27",
    redemptions: 234,
    revenue: 35100,
    discount: 4380,
    newCustomers: 71,
  },
  {
    date: "2025-11-28",
    redemptions: 267,
    revenue: 40050,
    discount: 5240,
    newCustomers: 89,
  },
  {
    date: "2025-11-29",
    redemptions: 245,
    revenue: 36750,
    discount: 4690,
    newCustomers: 78,
  },
];

export const promotionStats: PromotionStats = {
  totalPromotions: 8,
  activePromotions: 6,
  scheduledPromotions: 1,
  expiredPromotions: 1,
  totalRedemptions: 3684,
  totalDiscountGiven: 139810,
  totalRevenueGenerated: 684690,
  averageRedemptionRate: 18.6,
  topPerformingPromo: {
    code: "WELCOME25",
    name: "Welcome Discount",
    redemptions: 1247,
    revenue: 187450,
  },
};
