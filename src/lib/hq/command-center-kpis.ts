import type { Location } from "@/types/location";
import {
  hqOverviewMetrics,
  outstandingPaymentsByLocation,
} from "@/data/hq-analytics";

export type CommandCenterRange = "today" | "week" | "month" | "custom";

export interface CommandCenterKpis {
  /** Human label for the selected range, e.g. "Today", "Custom · 12 days". */
  rangeLabel: string;
  /** Noun used in "vs. prior {noun}" copy. */
  priorNoun: string;
  revenue: { value: number; deltaPct: number };
  bookings: {
    total: number;
    byService: {
      boarding: number;
      daycare: number;
      grooming: number;
      training: number;
    };
  };
  /** Weighted (by capacity) average occupancy — a rate, so range-independent. */
  occupancy: {
    weighted: number;
    perLocation: { shortCode: string; rate: number }[];
  };
  /** Current network A/R snapshot — range-independent balance. */
  outstanding: { total: number; invoiceCount: number };
}

const MONTH_DAYS = 30;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Monthly figures are the real data; shorter ranges scale by their share of a
// ~30-day month. Occupancy (a rate) and outstanding A/R (a balance) are
// snapshots and are intentionally NOT scaled.
function rangeFactor(range: CommandCenterRange, customDays: number): number {
  switch (range) {
    case "today":
      return 1 / MONTH_DAYS;
    case "week":
      return 7 / MONTH_DAYS;
    case "month":
      return 1;
    case "custom":
      return Math.max(1, customDays) / MONTH_DAYS;
  }
}

function rangeMeta(
  range: CommandCenterRange,
  customDays: number,
): { rangeLabel: string; priorNoun: string } {
  switch (range) {
    case "today":
      return { rangeLabel: "Today", priorNoun: "day" };
    case "week":
      return { rangeLabel: "This Week", priorNoun: "week" };
    case "month":
      return { rangeLabel: "This Month", priorNoun: "month" };
    case "custom":
      return {
        rangeLabel: `Custom · ${customDays} day${customDays === 1 ? "" : "s"}`,
        priorNoun: "period",
      };
  }
}

function sumRow(row: Record<string, number | string>): number {
  return Object.entries(row).reduce(
    (sum, [key, val]) =>
      key === "date" || typeof val !== "number" ? sum : sum + val,
    0,
  );
}

/**
 * Assembles the four HQ Command Center KPI tiles for a date range, sourced from
 * hq-analytics + each location's LocationMetrics. The date range scales the
 * period metrics (revenue, bookings); occupancy and outstanding payments are
 * snapshots and stay constant across ranges.
 */
export function buildCommandCenterKpis(
  locations: Location[],
  range: CommandCenterRange,
  customDays = MONTH_DAYS,
): CommandCenterKpis {
  const factor = rangeFactor(range, customDays);
  const { rangeLabel, priorNoun } = rangeMeta(range, customDays);

  // ── Revenue: scaled monthly total + period-over-period % change ─────────
  const trend = hqOverviewMetrics.revenueTrend;
  const last = trend.length ? sumRow(trend[trend.length - 1]) : 0;
  const prev = trend.length > 1 ? sumRow(trend[trend.length - 2]) : 0;
  const deltaPct = prev ? round1(((last - prev) / prev) * 100) : 0;
  const revenue = {
    value: Math.round(hqOverviewMetrics.totalRevenue * factor),
    deltaPct,
  };

  // ── Bookings: scaled total, split across services by LocationMetrics
  //    volume so the four buckets always sum back to the total. ─────────────
  const vol = locations.reduce(
    (acc, loc) => {
      const m = loc.metrics;
      if (!m) return acc;
      acc.boarding += m.boardingNights;
      acc.daycare += m.daycareAttendance;
      acc.grooming += m.groomingVolume;
      acc.training += m.trainingSessionsCompleted;
      return acc;
    },
    { boarding: 0, daycare: 0, grooming: 0, training: 0 },
  );
  const totalVol = vol.boarding + vol.daycare + vol.grooming + vol.training;
  const totalBookings = Math.round(hqOverviewMetrics.totalBookings * factor);
  const byService = {
    boarding: 0,
    daycare: 0,
    grooming: 0,
    training: 0,
  };
  if (totalVol > 0) {
    byService.boarding = Math.round((totalBookings * vol.boarding) / totalVol);
    byService.daycare = Math.round((totalBookings * vol.daycare) / totalVol);
    byService.grooming = Math.round((totalBookings * vol.grooming) / totalVol);
    byService.training = Math.round((totalBookings * vol.training) / totalVol);
    // Absorb any rounding drift into the largest bucket so the row ties out.
    const drift =
      totalBookings -
      (byService.boarding +
        byService.daycare +
        byService.grooming +
        byService.training);
    const largest = (
      ["daycare", "boarding", "training", "grooming"] as const
    ).reduce((a, b) => (byService[a] >= byService[b] ? a : b));
    byService[largest] += drift;
  }

  // ── Occupancy: capacity-weighted average across locations ───────────────
  let occWeightedSum = 0;
  let capSum = 0;
  const perLocation = locations.map((loc) => {
    const rate = loc.metrics?.occupancyRate ?? 0;
    const cap = Object.values(loc.capacity).reduce((s, c) => s + (c ?? 0), 0);
    occWeightedSum += rate * cap;
    capSum += cap;
    return { shortCode: loc.shortCode, rate };
  });
  const occupancy = {
    weighted: capSum ? Math.round(occWeightedSum / capSum) : 0,
    perLocation,
  };

  // ── Outstanding payments: network A/R snapshot ──────────────────────────
  const outstanding = outstandingPaymentsByLocation.reduce(
    (acc, row) => {
      acc.total += row.outstanding;
      acc.invoiceCount += row.invoiceCount;
      return acc;
    },
    { total: 0, invoiceCount: 0 },
  );

  return {
    rangeLabel,
    priorNoun,
    revenue,
    bookings: { total: totalBookings, byService },
    occupancy,
    outstanding,
  };
}
