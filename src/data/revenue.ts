// Revenue Tracking Data Models

export interface RevenueData {
  id: string;
  facilityId: number;
  facilityName: string;
  period: string; // YYYY-MM format
  subscriptionRevenue: number;
  transactionRevenue: number;
  moduleRevenue: number;
  totalRevenue: number;
  currency: string;
  commissionRate: number; // percentage
  commissionAmount: number;
  netRevenue: number; // after commission
  transactionCount: number;
  averageTransactionValue: number;
  growthRate: number; // month-over-month growth percentage
  createdAt: string;
}

interface RevenueTrend {
  month: string; // YYYY-MM format
  totalRevenue: number;
  subscriptionRevenue: number;
  transactionRevenue: number;
  moduleRevenue: number;
  activeFacilities: number;
}

export interface CommissionTracking {
  id: string;
  facilityId: number;
  facilityName: string;
  period: string;
  totalRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "paid" | "overdue";
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

// Mock revenue data for the last 12 months
export const revenueData: RevenueData[] = [
  // November 2025
  {
    id: "rev-001-2025-11",
    facilityId: 1,
    facilityName: "Paws & Play Daycare",
    period: "2025-11",
    subscriptionRevenue: 1755,
    transactionRevenue: 8450,
    moduleRevenue: 906,
    totalRevenue: 11111,
    currency: "USD",
    commissionRate: 5,
    commissionAmount: 555.55,
    netRevenue: 10555.45,
    transactionCount: 127,
    averageTransactionValue: 66.54,
    growthRate: 8.5,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-002-2025-11",
    facilityId: 2,
    facilityName: "Furry Friends Grooming",
    period: "2025-11",
    subscriptionRevenue: 44,
    transactionRevenue: 3200,
    moduleRevenue: 15,
    totalRevenue: 3259,
    currency: "USD",
    commissionRate: 5,
    commissionAmount: 162.95,
    netRevenue: 3096.05,
    transactionCount: 67,
    averageTransactionValue: 47.76,
    growthRate: 3.2,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-003-2025-11",
    facilityId: 3,
    facilityName: "Happy Tails Boarding",
    period: "2025-11",
    subscriptionRevenue: 3574,
    transactionRevenue: 15680,
    moduleRevenue: 1425,
    totalRevenue: 20679,
    currency: "USD",
    commissionRate: 3,
    commissionAmount: 620.37,
    netRevenue: 20058.63,
    transactionCount: 234,
    averageTransactionValue: 67.01,
    growthRate: 12.4,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-004-2025-11",
    facilityId: 4,
    facilityName: "Pet Paradise Vet",
    period: "2025-11",
    subscriptionRevenue: 481,
    transactionRevenue: 9800,
    moduleRevenue: 262,
    totalRevenue: 10543,
    currency: "USD",
    commissionRate: 4,
    commissionAmount: 421.72,
    netRevenue: 10121.28,
    transactionCount: 156,
    averageTransactionValue: 62.82,
    growthRate: 6.7,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-005-2025-11",
    facilityId: 5,
    facilityName: "Whisker Wonderland",
    period: "2025-11",
    subscriptionRevenue: 0, // Trial period
    transactionRevenue: 1800,
    moduleRevenue: 0,
    totalRevenue: 1800,
    currency: "USD",
    commissionRate: 5,
    commissionAmount: 90,
    netRevenue: 1710,
    transactionCount: 34,
    averageTransactionValue: 52.94,
    growthRate: -2.1,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-006-2025-11",
    facilityId: 6,
    facilityName: "Pet Groomers Paradise",
    period: "2025-11",
    subscriptionRevenue: 2874,
    transactionRevenue: 12400,
    moduleRevenue: 1275,
    totalRevenue: 16549,
    currency: "USD",
    commissionRate: 3.5,
    commissionAmount: 579.22,
    netRevenue: 15969.78,
    transactionCount: 189,
    averageTransactionValue: 65.61,
    growthRate: 9.3,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-007-2025-11",
    facilityId: 7,
    facilityName: "Animal Care Center",
    period: "2025-11",
    subscriptionRevenue: 44,
    transactionRevenue: 4300,
    moduleRevenue: 15,
    totalRevenue: 4359,
    currency: "USD",
    commissionRate: 5,
    commissionAmount: 217.95,
    netRevenue: 4141.05,
    transactionCount: 89,
    averageTransactionValue: 48.31,
    growthRate: 1.8,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-008-2025-11",
    facilityId: 9,
    facilityName: "Doggy Day Spa",
    period: "2025-11",
    subscriptionRevenue: 138,
    transactionRevenue: 7600,
    moduleRevenue: 59,
    totalRevenue: 7797,
    currency: "USD",
    commissionRate: 4,
    commissionAmount: 311.88,
    netRevenue: 7485.12,
    transactionCount: 143,
    averageTransactionValue: 53.15,
    growthRate: 5.4,
    createdAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "rev-009-2025-11",
    facilityId: 10,
    facilityName: "Exotic Pets Hub",
    period: "2025-11",
    subscriptionRevenue: 118,
    transactionRevenue: 2900,
    moduleRevenue: 39,
    totalRevenue: 3057,
    currency: "USD",
    commissionRate: 5,
    commissionAmount: 152.85,
    netRevenue: 2904.15,
    transactionCount: 56,
    averageTransactionValue: 51.79,
    growthRate: -1.5,
    createdAt: "2025-11-01T00:00:00Z",
  },
];

// Revenue trends over time
export const revenueTrends: RevenueTrend[] = [
  {
    month: "2025-01",
    totalRevenue: 62340,
    subscriptionRevenue: 7200,
    transactionRevenue: 48900,
    moduleRevenue: 6240,
    activeFacilities: 8,
  },
  {
    month: "2025-02",
    totalRevenue: 64120,
    subscriptionRevenue: 7450,
    transactionRevenue: 50100,
    moduleRevenue: 6570,
    activeFacilities: 8,
  },
  {
    month: "2025-03",
    totalRevenue: 66890,
    subscriptionRevenue: 7890,
    transactionRevenue: 52340,
    moduleRevenue: 6660,
    activeFacilities: 9,
  },
  {
    month: "2025-04",
    totalRevenue: 68450,
    subscriptionRevenue: 8100,
    transactionRevenue: 53670,
    moduleRevenue: 6680,
    activeFacilities: 9,
  },
  {
    month: "2025-05",
    totalRevenue: 71230,
    subscriptionRevenue: 8450,
    transactionRevenue: 55890,
    moduleRevenue: 6890,
    activeFacilities: 10,
  },
  {
    month: "2025-06",
    totalRevenue: 73560,
    subscriptionRevenue: 8890,
    transactionRevenue: 57120,
    moduleRevenue: 7550,
    activeFacilities: 10,
  },
  {
    month: "2025-07",
    totalRevenue: 75340,
    subscriptionRevenue: 9120,
    transactionRevenue: 58670,
    moduleRevenue: 7550,
    activeFacilities: 10,
  },
  {
    month: "2025-08",
    totalRevenue: 76890,
    subscriptionRevenue: 9340,
    transactionRevenue: 59800,
    moduleRevenue: 7750,
    activeFacilities: 10,
  },
  {
    month: "2025-09",
    totalRevenue: 78450,
    subscriptionRevenue: 9560,
    transactionRevenue: 61000,
    moduleRevenue: 7890,
    activeFacilities: 10,
  },
  {
    month: "2025-10",
    totalRevenue: 77120,
    subscriptionRevenue: 9450,
    transactionRevenue: 59780,
    moduleRevenue: 7890,
    activeFacilities: 9,
  },
  {
    month: "2025-11",
    totalRevenue: 79154,
    subscriptionRevenue: 9900,
    transactionRevenue: 66130,
    moduleRevenue: 4124,
    activeFacilities: 9,
  },
  {
    month: "2025-12",
    totalRevenue: 82000,
    subscriptionRevenue: 10200,
    transactionRevenue: 68500,
    moduleRevenue: 3300,
    activeFacilities: 10,
  },
];
