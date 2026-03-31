/**
 * Analytics utilities for computing revenue, utilization, and staff time
 * across all service modules (built-in and custom).
 */

import { bookings } from "@/data/bookings";
import { defaultCustomServiceModules } from "@/data/custom-services";

// ============================================================================
// Types
// ============================================================================

export interface ServiceStats {
  moduleId: string;
  moduleName: string;
  bookingCount: number;
  completedCount: number;
  revenue: number;
  avgRevenue: number;
  staffHours: number;
  topStaff: { name: string; count: number }[];
  busiestDay: string;
  avgDurationMin: number;
}

export interface RevenueByService {
  service: string;
  revenue: number;
  bookings: number;
  avgPerBooking: number;
  color: string;
}

// ============================================================================
// Built-in + custom module registry
// ============================================================================

const BUILTIN_SERVICES = [
  { id: "daycare", name: "Daycare", color: "#3b82f6" },
  { id: "boarding", name: "Boarding", color: "#8b5cf6" },
  { id: "grooming", name: "Grooming", color: "#ec4899" },
  { id: "training", name: "Training", color: "#f59e0b" },
];

export function getAllServiceModules() {
  const custom = defaultCustomServiceModules
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.slug,
      name: m.name,
      color: m.iconColor || "#6b7280",
      category: m.category,
    }));
  return [...BUILTIN_SERVICES, ...custom];
}

// ============================================================================
// Revenue by service
// ============================================================================

export function getRevenueByService(facilityId?: number): RevenueByService[] {
  const modules = getAllServiceModules();
  const filtered = facilityId
    ? bookings.filter((b) => b.facilityId === facilityId)
    : bookings;

  return modules
    .map((mod) => {
      const modBookings = filtered.filter(
        (b) => b.service?.toLowerCase() === mod.id.toLowerCase(),
      );
      const paidBookings = modBookings.filter(
        (b) => b.paymentStatus === "paid",
      );
      const revenue = paidBookings.reduce((s, b) => s + b.totalCost, 0);
      return {
        service: mod.name,
        revenue,
        bookings: modBookings.length,
        avgPerBooking:
          paidBookings.length > 0 ? revenue / paidBookings.length : 0,
        color: mod.color,
      };
    })
    .filter((r) => r.bookings > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

// ============================================================================
// Staff time by service
// ============================================================================

export interface StaffTimeEntry {
  service: string;
  hours: number;
  percentage: number;
  staffCount: number;
  color: string;
}

export function getStaffTimeByService(facilityId?: number): StaffTimeEntry[] {
  const modules = getAllServiceModules();
  const filtered = facilityId
    ? bookings.filter((b) => b.facilityId === facilityId)
    : bookings;

  const entries = modules
    .map((mod) => {
      const modBookings = filtered.filter(
        (b) => b.service?.toLowerCase() === mod.id.toLowerCase(),
      );
      // Estimate hours from booking duration
      const hours = modBookings.reduce((s, b) => {
        const start = new Date(b.startDate + "T" + (b.checkInTime ?? "09:00"));
        const end = new Date(b.endDate + "T" + (b.checkOutTime ?? "17:00"));
        const diffH = Math.max(0, (end.getTime() - start.getTime()) / 3600000);
        return s + Math.min(diffH, 24); // cap at 24h per booking
      }, 0);
      const staffNames = new Set<string>();
      modBookings.forEach((b) => {
        if (b.stylistPreference) staffNames.add(b.stylistPreference);
        if (b.trainerId) staffNames.add(b.trainerId);
      });
      return {
        service: mod.name,
        hours: Math.round(hours * 10) / 10,
        percentage: 0,
        staffCount: Math.max(1, staffNames.size),
        color: mod.color,
      };
    })
    .filter((e) => e.hours > 0);

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  entries.forEach((e) => {
    e.percentage =
      totalHours > 0 ? Math.round((e.hours / totalHours) * 1000) / 10 : 0;
  });

  return entries.sort((a, b) => b.hours - a.hours);
}

// ============================================================================
// Module-specific stats
// ============================================================================

export function getModuleStats(
  moduleId: string,
  facilityId?: number,
): ServiceStats {
  const modules = getAllServiceModules();
  const mod = modules.find(
    (m) => m.id.toLowerCase() === moduleId.toLowerCase(),
  );
  const filtered = facilityId
    ? bookings.filter((b) => b.facilityId === facilityId)
    : bookings;
  const modBookings = filtered.filter(
    (b) => b.service?.toLowerCase() === moduleId.toLowerCase(),
  );
  const completed = modBookings.filter((b) => b.status === "completed");
  const paid = modBookings.filter((b) => b.paymentStatus === "paid");
  const revenue = paid.reduce((s, b) => s + b.totalCost, 0);

  // Top staff
  const staffMap = new Map<string, number>();
  modBookings.forEach((b) => {
    const name = b.stylistPreference ?? b.trainerId ?? "Staff";
    staffMap.set(name, (staffMap.get(name) ?? 0) + 1);
  });
  const topStaff = [...staffMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Busiest day
  const dayMap = new Map<string, number>();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  modBookings.forEach((b) => {
    const d = new Date(b.startDate + "T00:00:00").getDay();
    const name = dayNames[d];
    dayMap.set(name, (dayMap.get(name) ?? 0) + 1);
  });
  const busiestDay =
    [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Avg duration
  const totalMins = modBookings.reduce((s, b) => {
    const start = new Date(b.startDate + "T" + (b.checkInTime ?? "09:00"));
    const end = new Date(b.endDate + "T" + (b.checkOutTime ?? "17:00"));
    return s + Math.max(0, (end.getTime() - start.getTime()) / 60000);
  }, 0);
  const avgDuration =
    modBookings.length > 0 ? Math.round(totalMins / modBookings.length) : 0;

  // Staff hours
  const staffHours = modBookings.reduce((s, b) => {
    const start = new Date(b.startDate + "T" + (b.checkInTime ?? "09:00"));
    const end = new Date(b.endDate + "T" + (b.checkOutTime ?? "17:00"));
    return (
      s + Math.min(24, Math.max(0, (end.getTime() - start.getTime()) / 3600000))
    );
  }, 0);

  return {
    moduleId,
    moduleName: mod?.name ?? moduleId,
    bookingCount: modBookings.length,
    completedCount: completed.length,
    revenue,
    avgRevenue: paid.length > 0 ? revenue / paid.length : 0,
    staffHours: Math.round(staffHours * 10) / 10,
    topStaff,
    busiestDay,
    avgDurationMin: avgDuration,
  };
}
