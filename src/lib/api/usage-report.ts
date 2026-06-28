import { REFERENCE_DATE } from "@/data/churn";
import { availableModules, facilities } from "@/data/facilities";
import { facilityStaff } from "@/data/facility-staff";
import { users } from "@/data/users";
import { buildAiDashboard, type AiMonthlyTrendPoint } from "@/lib/api/ai-usage";

// Builder for the Platform Usage Report (/dashboard/reports/usage).
//
// REAL: module-enabled counts (each facility's enabledModules) and the entire
// AI Usage & Cost block — reused from buildAiDashboard() (top-10 facilities by
// token consumption + 12-month cost trend + KPIs), which is derived from the
// real facility roster and merges any live-recorded Anthropic usage.
//
// DERIVED (deterministic, never random — stable hash anchored to REFERENCE_DATE):
// the 30-day daily-active-users series, the module "actively-using" rate, and the
// 30-day API request/response-time series — the mock layer has no daily-active
// events, no per-module usage telemetry, and no API request instrumentation, so
// these are synthesized stably from the real staff count / module mix.

const DAY = 86_400_000;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}
function stableInt(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) % (max - min + 1));
}
function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- types -----------------------------------------------------------------

export interface DauPoint {
  day: string;
  users: number;
}

export interface ModuleUsageRow {
  module: string;
  enabled: number;
  activelyUsing: number;
  usageRate: number; // % of enabled facilities actively using the module
}

export interface ApiVolumePoint {
  day: string;
  requests: number;
  responseMs: number;
}

export interface AiFacilityTokenRow {
  facility: string;
  tokens: number;
  requests: number;
  cost: number;
}

export interface UsageReport {
  kpis: {
    avgDau: number;
    avgApiResponseMs: number;
    apiRequests30d: number;
    aiTokensThisMonth: number;
    aiCostThisMonth: number;
  };
  dau: DauPoint[];
  moduleUsage: ModuleUsageRow[];
  apiVolume: ApiVolumePoint[];
  aiTopFacilities: AiFacilityTokenRow[];
  aiCostTrend: AiMonthlyTrendPoint[];
}

// --- entry point -----------------------------------------------------------

export function getUsageReport(): UsageReport {
  const refMs = new Date(REFERENCE_DATE).getTime();
  const totalStaff = facilityStaff.length + users.length; // real platform staff

  // Daily Active Users (facility staff) — 30-day rolling, weekday pattern.
  const dau: DauPoint[] = [];
  let dauSum = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(refMs - (29 - i) * DAY);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const frac =
      (weekend
        ? stableInt(`dau-we-${i}`, 28, 46)
        : stableInt(`dau-${i}`, 52, 74)) / 100;
    const value = Math.round(totalStaff * frac * (1 + i * 0.003));
    dau.push({ day: shortDate(d), users: value });
    dauSum += value;
  }
  const avgDau = Math.round(dauSum / 30);

  // Module usage — enabled count (REAL) + deterministic actively-using rate.
  const moduleUsage: ModuleUsageRow[] = availableModules
    .map((m) => {
      const enabled = facilities.filter((f) =>
        (f.enabledModules ?? []).includes(m.id),
      ).length;
      const ratio = stableInt(`adopt-${m.id}`, 55, 92) / 100;
      const activelyUsing = Math.round(enabled * ratio);
      return {
        module: m.name,
        enabled,
        activelyUsing,
        usageRate: enabled ? Math.round((activelyUsing / enabled) * 100) : 0,
      };
    })
    .sort((a, b) => b.enabled - a.enabled);

  // API volume — request count + avg response time, 30 days (deterministic).
  const apiVolume: ApiVolumePoint[] = [];
  let reqSum = 0;
  let msSum = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(refMs - (29 - i) * DAY);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const requests = Math.round(
      stableInt(`api-${i}`, 90, 175) *
        1000 *
        (weekend ? 0.6 : 1) *
        (1 + i * 0.004),
    );
    const responseMs = stableInt(`apims-${i}`, 78, 210);
    apiVolume.push({ day: shortDate(d), requests, responseMs });
    reqSum += requests;
    msSum += responseMs;
  }

  // AI Usage & Cost — REUSE the AI dashboard (deterministic via REFERENCE_DATE).
  const ai = buildAiDashboard(new Date(REFERENCE_DATE), []);
  const aiTopFacilities: AiFacilityTokenRow[] = ai.topFacilities.map((f) => ({
    facility: f.facilityName,
    tokens: f.currentMonthTokens,
    requests: f.totalRequests,
    cost: f.estimatedCost,
  }));

  return {
    kpis: {
      avgDau,
      avgApiResponseMs: Math.round(msSum / 30),
      apiRequests30d: reqSum,
      aiTokensThisMonth: ai.kpis.totalTokensThisMonth,
      aiCostThisMonth: ai.kpis.estimatedCostThisMonth,
    },
    dau,
    moduleUsage,
    apiVolume,
    aiTopFacilities,
    aiCostTrend: ai.monthlyTrend,
  };
}
