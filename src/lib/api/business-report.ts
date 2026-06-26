// Business / growth report — every value COMPUTED from the facility-lifecycle
// population in @/data/churn (the same deterministic customer base that powers
// the churn report). MRR movement, tier mix, growth and forecast are all
// derived; nothing is hard-coded.

import {
  REFERENCE_MI,
  dateToMI,
  facilityLifecycles,
  miToLabel,
} from "@/data/churn";
import { getChurnReport } from "@/lib/api/churn";

const TREND_MONTHS = 24;

export interface MrrMovementPoint {
  month: string;
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number; // negative
  netMrr: number;
  totalMrr: number;
}
export interface GrowthPoint {
  month: string;
  activeFacilities: number;
}
export interface TierSlice {
  tier: string;
  mrr: number;
  pct: number;
}
export interface ForecastRow {
  month: string;
  projectedMrr: number;
  projectedArr: number;
  netNewMrr: number;
  growthPct: number;
}
export interface BusinessKpis {
  mrr: number;
  arr: number;
  activeFacilities: number;
  avgRevenuePerFacility: number;
  nrr: number;
}
export interface BusinessReport {
  kpis: BusinessKpis;
  mrrTrend: MrrMovementPoint[];
  facilityGrowth: GrowthPoint[];
  revenueByTier: TierSlice[];
  forecast: ForecastRow[];
}

function stableInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

interface Row {
  id: string;
  tier: string;
  mrr: number;
  expansion: number;
  jmi: number;
  cmi: number | null;
  expMi: number; // month the expansion is realized
}

function buildRows(): Row[] {
  return facilityLifecycles.map((l) => {
    const jmi = dateToMI(l.joinedAt);
    return {
      id: l.id,
      tier: l.tier,
      mrr: l.mrr,
      expansion: l.expansionMrr,
      jmi,
      cmi: l.churnedAt ? dateToMI(l.churnedAt) : null,
      expMi: jmi + stableInt(`exp-${l.id}`, 3, 9),
    };
  });
}

function isActiveAt(r: Row, mi: number): boolean {
  return r.jmi <= mi && (r.cmi === null || r.cmi > mi);
}

/** Total recurring revenue level at month `mi` (base MRR + realized expansion). */
function totalMrrAt(rows: Row[], mi: number): number {
  let sum = 0;
  for (const r of rows) {
    if (!isActiveAt(r, mi)) continue;
    sum += r.mrr;
    if (r.expansion > 0 && r.expMi <= mi) sum += r.expansion;
  }
  return sum;
}

export function getBusinessReport(): BusinessReport {
  const rows = buildRows();

  // --- MRR movement + level, 24-month window ---
  const mrrTrend: MrrMovementPoint[] = [];
  for (let mi = REFERENCE_MI - (TREND_MONTHS - 1); mi <= REFERENCE_MI; mi++) {
    let newMrr = 0;
    let expansionMrr = 0;
    let churnedMag = 0;
    for (const r of rows) {
      if (r.jmi === mi) newMrr += r.mrr;
      if (r.cmi === mi) churnedMag += r.mrr;
      if (r.expansion > 0 && r.expMi === mi && (r.cmi === null || r.cmi > mi))
        expansionMrr += r.expansion;
    }
    const churnedMrr = -churnedMag;
    mrrTrend.push({
      month: miToLabel(mi),
      newMrr,
      expansionMrr,
      churnedMrr,
      netMrr: newMrr + expansionMrr + churnedMrr,
      totalMrr: Math.round(totalMrrAt(rows, mi)),
    });
  }

  // --- Facility growth (cumulative active count) ---
  const facilityGrowth: GrowthPoint[] = [];
  for (let mi = REFERENCE_MI - (TREND_MONTHS - 1); mi <= REFERENCE_MI; mi++) {
    facilityGrowth.push({
      month: miToLabel(mi),
      activeFacilities: rows.filter((r) => isActiveAt(r, mi)).length,
    });
  }

  // --- Current KPIs ---
  const mrr = Math.round(totalMrrAt(rows, REFERENCE_MI));
  const activeFacilities = rows.filter((r) =>
    isActiveAt(r, REFERENCE_MI),
  ).length;
  const nrr = getChurnReport().kpis.nrr;
  const kpis: BusinessKpis = {
    mrr,
    arr: mrr * 12,
    activeFacilities,
    avgRevenuePerFacility: activeFacilities
      ? Math.round(mrr / activeFacilities)
      : 0,
    nrr,
  };

  // --- Revenue by tier (current MRR mix) ---
  const tierMap = new Map<string, number>();
  for (const r of rows) {
    if (!isActiveAt(r, REFERENCE_MI)) continue;
    const value =
      r.mrr + (r.expansion > 0 && r.expMi <= REFERENCE_MI ? r.expansion : 0);
    tierMap.set(r.tier, (tierMap.get(r.tier) ?? 0) + value);
  }
  const revenueByTier: TierSlice[] = Array.from(tierMap.entries())
    .map(([tier, value]) => ({
      tier,
      mrr: Math.round(value),
      pct: mrr ? Math.round((value / mrr) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.mrr - a.mrr);

  // --- 3-month forecast (run-rate = avg net MRR over last 6 months) ---
  const recentNet = mrrTrend.slice(-6).map((p) => p.netMrr);
  const avgNet = Math.round(
    recentNet.reduce((a, b) => a + b, 0) / recentNet.length,
  );
  const forecast: ForecastRow[] = [];
  let running = mrr;
  for (let k = 1; k <= 3; k++) {
    const prev = running;
    running += avgNet;
    forecast.push({
      month: miToLabel(REFERENCE_MI + k),
      projectedMrr: running,
      projectedArr: running * 12,
      netNewMrr: avgNet,
      growthPct: prev ? Math.round((avgNet / prev) * 1000) / 10 : 0,
    });
  }

  return { kpis, mrrTrend, facilityGrowth, revenueByTier, forecast };
}
