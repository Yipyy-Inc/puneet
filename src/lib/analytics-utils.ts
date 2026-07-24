/**
 * Analytics utilities for computing revenue, utilization, and staff time
 * across all service modules (built-in and custom).
 */

import { bookings } from "@/data/bookings";
import { defaultCustomServiceModules } from "@/data/custom-services";
import type { Granularity } from "@/types/facility-analytics";

// ============================================================================
// Date / rollup helpers (shared by the derived report selectors)
// ============================================================================

/** Coerce an ISO string or Date into a Date. */
export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * End of the given calendar day (23:59:59.999, local time). A range's `to` is a
 * date-only string like "2026-07-24"; `new Date("2026-07-24")` is UTC midnight,
 * so an inclusive `<= to` check silently drops that day's later transactions
 * (which parse as local time from `createdAt` strings without a `Z`). Anchoring
 * `to` to the local end-of-day makes a trailing range that ends "today" include
 * all of today's data. Constructed from the Y-M-D parts so it never shifts by a
 * day across time zones.
 */
export function endOfDay(value: string | Date): Date {
  if (typeof value === "string") {
    const [y, m, d] = value.split("T")[0].split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  const dt = new Date(value);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

/** Inclusive range check on both endpoints. */
export function inDateRange(d: Date, from: Date, to: Date): boolean {
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

/** The Sunday that starts the week containing `d` (UTC-safe date part). */
function weekStart(d: Date): Date {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  return s;
}

/** Local `YYYY-MM-DD` — NOT `toISOString()`, which would shift the calendar day
 * across time zones and desync bucket keys from `enumeratePeriods`' local cursor
 * (and from `createdAt` strings, which parse as local time). */
function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Bucket key for a date at the given granularity (local calendar). */
export function periodKey(d: Date, g: Granularity): string {
  if (g === "day") return localYmd(d);
  if (g === "week") return localYmd(weekStart(d));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Ordered list of every bucket key spanning [from, to] at the given
 * granularity — used to zero-fill period series so charts render a
 * continuous axis instead of collapsing to only the buckets with data.
 */
export function enumeratePeriods(
  from: Date,
  to: Date,
  g: Granularity,
): string[] {
  const keys: string[] = [];
  const cursor =
    g === "week"
      ? weekStart(from)
      : new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (g === "month") cursor.setDate(1);
  const end = to.getTime();
  let guard = 0;
  while (cursor.getTime() <= end && guard < 4000) {
    keys.push(periodKey(cursor, g));
    if (g === "day") cursor.setDate(cursor.getDate() + 1);
    else if (g === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }
  return keys;
}

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

export function getStaffTimeByService(
  facilityId?: number,
  from?: string,
  to?: string,
): StaffTimeEntry[] {
  const modules = getAllServiceModules();
  const fromD = from ? toDate(from) : null;
  const toD = to ? endOfDay(to) : null;
  const filtered = bookings.filter(
    (b) =>
      (!facilityId || b.facilityId === facilityId) &&
      (!fromD || !toD || inDateRange(new Date(b.startDate), fromD, toD)),
  );

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
