import { availableModules, facilities } from "@/data/facilities";
import { getCurrentSubscription } from "@/data/facility-billing";
import { createServerClient } from "@/lib/supabase/server";

// Builder for the Facilities Report (/dashboard/reports/facilities).
//
// REAL: per-facility MRR (from facilitySubscriptions via getCurrentSubscription)
// and per-module "enabled" rates (from each facility's enabledModules). DERIVED
// (deterministic, never random): MRR growth-vs-last-month, "actively using"
// rates, login recency, and the 12-month weekly booking series — there is no
// month-over-month, usage-event, recent-login or platform-wide booking history
// in the mock layer, so these are synthesized stably from a hash/PRNG anchored
// to REFERENCE_DATE (the same convention as platform-dashboard.ts /
// business-report.ts). Swap for real series when those backends arrive.

const DAY = 86_400_000;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function stableInt(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) % (max - min + 1));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// --- types -----------------------------------------------------------------

export interface FacilityMrrRow {
  id: number;
  facility: string;
  plan: string;
  status: string;
  mrr: number;
  pctOfRevenue: number; // % of total platform MRR
  growthPct: number; // MRR growth vs last month (signed)
}

export interface ModuleAdoptionRow {
  module: string;
  enabledPct: number; // % of facilities with the module enabled (REAL)
  activeUsingPct: number; // % of facilities actively using it (derived)
  enabledCount: number;
  usingCount: number;
}

export type LoginBucketName =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Rarely"
  | "Never";

export interface LoginBucket {
  bucket: LoginBucketName;
  facilities: number;
}

export interface BookingWeekPoint {
  label: string; // week-ending date, e.g. "Jun 23"
  bookings: number;
}

export interface FacilitiesReport {
  kpis: {
    totalFacilities: number;
    totalMrr: number;
    avgMrr: number;
    modulesTracked: number;
  };
  topByMrr: FacilityMrrRow[];
  moduleAdoption: ModuleAdoptionRow[];
  loginDistribution: LoginBucket[];
  bookingTrend: BookingWeekPoint[];
}

// --- top facilities by MRR (REAL) ------------------------------------------

function buildTopByMrr(): { rows: FacilityMrrRow[]; totalMrr: number } {
  const base = facilities.map((f) => {
    const sub = getCurrentSubscription(f.id);
    return {
      id: f.id,
      facility: f.name,
      plan: sub?.planName ?? f.plan,
      status: f.status,
      mrr: sub?.monthlyEquivalent ?? 0,
    };
  });

  const totalMrr = base.reduce((s, r) => s + r.mrr, 0);

  const rows: FacilityMrrRow[] = base
    .map((r) => {
      // Growth vs last month — deterministic; suspended facilities skew negative.
      const raw = stableInt(`mrr-growth-${r.id}`, -90, 320) / 10; // -9.0 … +32.0
      const growthPct =
        r.mrr === 0 ? 0 : r.status === "suspended" ? -Math.abs(raw) : raw;
      return {
        ...r,
        pctOfRevenue: totalMrr ? round1((r.mrr / totalMrr) * 100) : 0,
        growthPct: round1(growthPct),
      };
    })
    .sort((a, b) => b.mrr - a.mrr);

  return { rows, totalMrr };
}

// --- feature adoption (enabled% REAL, active% derived) ---------------------

function buildModuleAdoption(): ModuleAdoptionRow[] {
  const n = facilities.length;
  return availableModules
    .map((m) => {
      const enabledCount = facilities.filter((f) =>
        (f.enabledModules ?? []).includes(m.id),
      ).length;
      // Of the facilities that enabled it, a stable fraction actively use it.
      const adoptionRatio = stableInt(`adopt-${m.id}`, 55, 92) / 100;
      const usingCount = Math.round(enabledCount * adoptionRatio);
      return {
        module: m.name,
        enabledPct: Math.round((enabledCount / n) * 100),
        activeUsingPct: Math.round((usingCount / n) * 100),
        enabledCount,
        usingCount,
      };
    })
    .sort((a, b) => b.enabledPct - a.enabledPct);
}

// --- login frequency distribution (deterministic recency) ------------------

function loginDaysAgo(id: number, status: string): number {
  const base = stableInt(`login-${id}`, 0, 150);
  if (status === "active") return Math.floor(base * 0.45); // engaged → recent
  if (status === "suspended" || status === "inactive") return 95 + (base % 140);
  return base; // trial / other
}

function bucketFor(days: number): LoginBucketName {
  if (days <= 1) return "Daily";
  if (days <= 7) return "Weekly";
  if (days <= 30) return "Monthly";
  if (days <= 90) return "Rarely";
  return "Never";
}

function buildLoginDistribution(): LoginBucket[] {
  const order: LoginBucketName[] = [
    "Daily",
    "Weekly",
    "Monthly",
    "Rarely",
    "Never",
  ];
  const counts = new Map<LoginBucketName, number>(order.map((b) => [b, 0]));
  for (const f of facilities) {
    const b = bucketFor(loginDaysAgo(f.id, f.status));
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return order.map((bucket) => ({
    bucket,
    facilities: counts.get(bucket) ?? 0,
  }));
}

// --- booking volume trend -------------------------------------------------
//
// COUNTED (platform_booking_volume, 20260919203825). It was
// mulberry32(20260624) × a seasonal factor × a growth factor × a base of 420
// — a chart nobody could tell from a measurement.

async function readBookingTrend(): Promise<BookingWeekPoint[]> {
  const supabase = await createServerClient();
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{
      data: Array<{ week_start: string; bookings: number }> | null;
      error: { message: string } | null;
    }>
  )("platform_booking_volume", { p_weeks: 52 });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    // The week's own day, formatted where it is read (§5q).
    label: row.week_start,
    bookings: Number(row.bookings ?? 0),
  }));
}

// --- entry point -----------------------------------------------------------

export async function getFacilitiesReport(): Promise<FacilitiesReport> {
  const { rows, totalMrr } = buildTopByMrr();
  const paying = rows.filter((r) => r.mrr > 0).length;

  return {
    kpis: {
      totalFacilities: facilities.length,
      totalMrr,
      avgMrr: paying ? Math.round(totalMrr / paying) : 0,
      modulesTracked: availableModules.length,
    },
    topByMrr: rows,
    moduleAdoption: buildModuleAdoption(),
    loginDistribution: buildLoginDistribution(),
    bookingTrend: await readBookingTrend(),
  };
}
