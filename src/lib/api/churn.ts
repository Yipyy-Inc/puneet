// Churn / retention report — all values COMPUTED from the facility-lifecycle
// population in @/data/churn. No metric here is hard-coded.

import {
  REFERENCE_MI,
  dateToMI,
  facilityLifecycles,
  miToLabel,
  type FacilityLifecycle,
} from "@/data/churn";

export interface ChurnKpis {
  /** Latest month's churn rate (%). */
  monthlyChurnRate: number;
  /** Trailing 12-month average churn rate (%). */
  avgChurnRate12mo: number;
  /** Expected customer lifetime in months (1 / monthly churn). */
  avgLifetimeMonths: number;
  /** Net revenue retention over the trailing 12 months (%). */
  nrr: number;
  /** Gross revenue retention over the trailing 12 months (%). */
  grr: number;
}

export interface ChurnTrendPoint {
  month: string;
  rate: number;
}

export interface CohortRow {
  cohort: string;
  size: number;
  /** Retention % for each column month; null when not yet observable. */
  cells: (number | null)[];
}

export interface ChurnedLogRow {
  id: string;
  name: string;
  tier: string;
  plan: string;
  tenureMonths: number;
  mrr: number;
  reason: string;
  churnedAt: string;
  churnedLabel: string;
}

export interface ChurnReport {
  kpis: ChurnKpis;
  trend: ChurnTrendPoint[];
  cohortColumns: number[];
  cohorts: CohortRow[];
  churnedLog: ChurnedLogRow[];
  totals: { churnedCount: number; mrrLost: number; activeNow: number };
}

const COHORT_COLUMNS = [1, 2, 3, 6, 12];

interface Row {
  l: FacilityLifecycle;
  jmi: number;
  cmi: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function getChurnReport(refMI: number = REFERENCE_MI): ChurnReport {
  const rows: Row[] = facilityLifecycles.map((l) => ({
    l,
    jmi: dateToMI(l.joinedAt),
    cmi: l.churnedAt ? dateToMI(l.churnedAt) : null,
  }));

  // --- 12-month churn-rate trend ---
  const trend: ChurnTrendPoint[] = [];
  const monthlyRates: number[] = [];
  for (let m = refMI - 11; m <= refMI; m++) {
    const activeStart = rows.filter(
      (r) => r.jmi < m && (r.cmi === null || r.cmi >= m),
    ).length;
    const churned = rows.filter((r) => r.cmi === m).length;
    const rate = activeStart ? (churned / activeStart) * 100 : 0;
    monthlyRates.push(rate);
    trend.push({ month: miToLabel(m), rate: round1(rate) });
  }
  const monthlyChurnRate = round1(monthlyRates[monthlyRates.length - 1]);
  const avgChurnRate12mo =
    monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length;
  const avgLifetimeMonths =
    avgChurnRate12mo > 0 ? Math.round(100 / avgChurnRate12mo) : 0;

  // --- NRR / GRR over the trailing 12 months ---
  const startMI = refMI - 12;
  const base = rows.filter(
    (r) => r.jmi <= startMI && (r.cmi === null || r.cmi > startMI),
  );
  const startMRR = base.reduce((s, r) => s + r.l.mrr, 0);
  const churnedFromBaseMRR = base
    .filter((r) => r.cmi !== null && r.cmi <= refMI)
    .reduce((s, r) => s + r.l.mrr, 0);
  const expansionMRR = base
    .filter((r) => r.cmi === null)
    .reduce((s, r) => s + r.l.expansionMrr, 0);
  const grr = startMRR ? ((startMRR - churnedFromBaseMRR) / startMRR) * 100 : 0;
  const nrr = startMRR
    ? ((startMRR - churnedFromBaseMRR + expansionMRR) / startMRR) * 100
    : 0;

  // --- Cohort retention (Jan 2025 onward) ---
  const firstCohort = 2025 * 12; // Jan 2025
  const cohorts: CohortRow[] = [];
  for (let c = firstCohort; c < firstCohort + 14; c++) {
    const members = rows.filter((r) => r.jmi === c);
    if (members.length === 0) continue;
    const size = members.length;
    const elapsed = refMI - c;
    const cells = COHORT_COLUMNS.map((m) => {
      if (elapsed < m) return null;
      const survivors = members.filter(
        (r) => (r.cmi === null ? refMI : r.cmi) - c >= m,
      ).length;
      return Math.round((survivors / size) * 100);
    });
    cohorts.push({ cohort: miToLabel(c), size, cells });
  }

  // --- Churned facility log (trailing 12 months) ---
  const churnedLog: ChurnedLogRow[] = rows
    .filter((r) => r.cmi !== null && r.cmi >= refMI - 11)
    .map((r) => ({
      id: r.l.id,
      name: r.l.name,
      tier: r.l.tier,
      plan: r.l.plan,
      tenureMonths: (r.cmi as number) - r.jmi,
      mrr: r.l.mrr,
      reason: r.l.reason ?? "—",
      churnedAt: r.l.churnedAt as string,
      churnedLabel: miToLabel(r.cmi as number),
    }))
    .sort((a, b) => (a.churnedAt < b.churnedAt ? 1 : -1));

  const activeNow = rows.filter((r) => r.cmi === null).length;
  const mrrLost = churnedLog.reduce((s, r) => s + r.mrr, 0);

  return {
    kpis: {
      monthlyChurnRate,
      avgChurnRate12mo: round1(avgChurnRate12mo),
      avgLifetimeMonths,
      nrr: round1(nrr),
      grr: round1(grr),
    },
    trend,
    cohortColumns: COHORT_COLUMNS,
    cohorts,
    churnedLog,
    totals: { churnedCount: churnedLog.length, mrrLost, activeNow },
  };
}
