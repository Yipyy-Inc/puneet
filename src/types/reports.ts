/**
 * Reports & Analytics domain types.
 * Single source of truth — data files re-export from here.
 */

import { z } from "zod";

// ========================================
// REPORT DATA TYPES
// ========================================

export const occupancyReportDataSchema = z.object({
  date: z.string(),
  occupancyRate: z.number(),
  occupiedKennels: z.number(),
  totalKennels: z.number(),
  revenue: z.number(),
});
export type OccupancyReportData = z.infer<typeof occupancyReportDataSchema>;

export const noShowReportDataSchema = z.object({
  date: z.string(),
  service: z.string(),
  clientName: z.string(),
  petName: z.string(),
  scheduledTime: z.string(),
  status: z.enum(["no-show", "late-cancellation"]),
  revenue: z.number(),
});
export type NoShowReportData = z.infer<typeof noShowReportDataSchema>;

export const cancellationReportDataSchema = z.object({
  date: z.string(),
  service: z.string(),
  clientName: z.string(),
  petName: z.string(),
  reason: z.string().optional(),
  refundAmount: z.number(),
  cancellationTime: z.string(),
  advanceNotice: z.string(),
});
export type CancellationReportData = z.infer<
  typeof cancellationReportDataSchema
>;

// ========================================
// CUSTOM REPORT CONFIG
// ========================================

export const customReportConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  dataSource: z.enum(["bookings", "clients", "pets", "payments"]),
  selectedFields: z.array(z.string()),
  filters: z.array(
    z.object({
      field: z.string(),
      operator: z.enum([
        "equals",
        "contains",
        "greater_than",
        "less_than",
        "between",
      ]),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
      ]),
    }),
  ),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  schedule: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(["daily", "weekly", "monthly"]),
      recipients: z.array(z.string()),
    })
    .optional(),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type CustomReportConfig = z.infer<typeof customReportConfigSchema>;

// ========================================
// SERVICE BREAKDOWN
// ========================================

export interface ServiceBreakdownItem {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
  aov: number;
  isCustom: boolean;
}

// ========================================
// ANALYTICS TYPES
// ========================================

export interface FacilityPerformance {
  facilityId: number;
  facilityName: string;
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  averageRating: number;
  activeClients: number;
  newClientsThisMonth: number;
  cancelRate: number;
  topServices: { service: string; count: number }[];
}

export interface CustomReport {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  lastRun?: string;
}

// ========================================
// REVENUE TYPES
// ========================================

export interface RevenueData {
  month: string;
  boarding: number;
  daycare: number;
  grooming: number;
  training: number;
  retail: number;
  other: number;
  total: number;
}

export interface CommissionTracking {
  staffId: number;
  staffName: string;
  role: string;
  totalSales: number;
  commissionRate: number;
  commissionEarned: number;
  period: string;
  services: { service: string; sales: number; commission: number }[];
}
