import { availableModules, facilities } from "@/data/facilities";
import { getCurrentSubscription } from "@/data/facility-billing";
import { REFERENCE_DATE } from "@/data/churn";

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

// --- booking volume trend (deterministic 12-month weekly series) -----------

function weekLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildBookingTrend(): BookingWeekPoint[] {
  const rng = mulberry32(20260624);
  const ref = new Date(REFERENCE_DATE).getTime();
  const points: BookingWeekPoint[] = [];
  for (let i = 0; i < 52; i++) {
    const weeksAgo = 51 - i;
    const d = new Date(ref - weeksAgo * 7 * DAY);
    const month = d.getMonth();
    // Summer boarding peak (Jun–Aug), mild winter-holiday bump (Dec–Jan).
    const seasonal =
      month >= 5 && month <= 7 ? 1.3 : month === 11 || month <= 0 ? 1.12 : 1;
    const trend = 1 + i * 0.012; // gradual platform growth over the year
    const noise = 0.85 + rng() * 0.3; // 0.85 … 1.15
    const bookings = Math.round(420 * seasonal * trend * noise);
    points.push({ label: weekLabel(d), bookings });
  }
  return points;
}

// --- entry point -----------------------------------------------------------

export function getFacilitiesReport(): FacilitiesReport {
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
    bookingTrend: buildBookingTrend(),
  };
}
