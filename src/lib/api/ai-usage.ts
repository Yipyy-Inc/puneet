import { aiFacilityConfigs, estimateCost, stableInt } from "@/data/ai-settings";
import type {
  AiUsageRecord,
  AiFacilityUsageSummary,
} from "@/types/ai-settings";

// AI usage dashboard data. Real Anthropic usage recorded by the AI routes is
// merged in via the /api/ai/usage endpoint (see aiUsageQueries below); the
// deterministic seed below gives the platform a populated 12-month baseline so
// the console isn't 0/0 before live traffic accrues.

const REQUEST_TYPES = [
  "evaluation_summary",
  "report_card_summary",
  "chat_reply",
  "email_marketing",
  "incident_note",
  "pet_update",
];
const SEED_MODEL = "claude-haiku-4-5-20251001";
const TREND_MONTHS = 12;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthLabel(mi: number): string {
  return `${MONTH_LABELS[((mi % 12) + 12) % 12]} ${Math.floor(mi / 12)}`;
}

export interface AiMonthlyTrendPoint {
  month: string;
  tokens: number;
  cost: number;
}

export interface AiUsageDashboard {
  records: AiUsageRecord[];
  recentRecords: AiUsageRecord[];
  summaries: AiFacilityUsageSummary[];
  kpis: {
    totalTokensThisMonth: number;
    estimatedCostThisMonth: number;
    facilitiesUsingAi: number;
  };
  topFacilities: AiFacilityUsageSummary[];
  monthlyTrend: AiMonthlyTrendPoint[];
}

/** Deterministic 12-month usage history across the AI-enabled facilities. */
export function buildAiUsageRecords(now: Date): AiUsageRecord[] {
  const records: AiUsageRecord[] = [];
  const nowMI = now.getFullYear() * 12 + now.getMonth();

  for (const cfg of aiFacilityConfigs) {
    for (let back = 0; back < TREND_MONTHS; back++) {
      const mi = nowMI - back;
      const year = Math.floor(mi / 12);
      const month = ((mi % 12) + 12) % 12;
      // Slightly fewer requests in older months (adoption ramp).
      const base = stableInt(`req-${cfg.facilityId}-${mi}`, 2, 9);
      const reqs = Math.max(1, base - Math.floor(back / 4));
      for (let i = 0; i < reqs; i++) {
        const type =
          REQUEST_TYPES[
            stableInt(
              `t-${cfg.facilityId}-${mi}-${i}`,
              0,
              REQUEST_TYPES.length - 1,
            )
          ];
        const inputTokens = stableInt(
          `in-${cfg.facilityId}-${mi}-${i}`,
          280,
          950,
        );
        const outputTokens = stableInt(
          `out-${cfg.facilityId}-${mi}-${i}`,
          90,
          360,
        );
        const day = stableInt(`d-${cfg.facilityId}-${mi}-${i}`, 1, 27);
        const hour = stableInt(`h-${cfg.facilityId}-${mi}-${i}`, 8, 18);
        records.push({
          id: `seed-${cfg.facilityId}-${mi}-${i}`,
          facilityId: cfg.facilityId,
          facilityName: cfg.facilityName,
          timestamp: new Date(
            Date.UTC(year, month, day, hour, 0, 0),
          ).toISOString(),
          type,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          model: SEED_MODEL,
          cost: estimateCost(SEED_MODEL, inputTokens, outputTokens),
        });
      }
    }
  }
  return records;
}

function isSameMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month;
}

/** Build the full dashboard, merging any live-recorded usage onto the seed. */
export function buildAiDashboard(
  now: Date,
  live: AiUsageRecord[] = [],
): AiUsageDashboard {
  const records = [...live, ...buildAiUsageRecords(now)].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : -1,
  );

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const thisMonth = records.filter((r) =>
    isSameMonth(r.timestamp, year, month),
  );

  const summaries: AiFacilityUsageSummary[] = aiFacilityConfigs.map((cfg) => {
    const facRecords = records.filter((r) => r.facilityId === cfg.facilityId);
    const monthRecords = facRecords.filter((r) =>
      isSameMonth(r.timestamp, year, month),
    );
    return {
      facilityId: cfg.facilityId,
      facilityName: cfg.facilityName,
      currentMonthTokens: monthRecords.reduce((s, r) => s + r.totalTokens, 0),
      monthlyLimit: cfg.monthlyTokenLimit,
      totalRequests: facRecords.length,
      estimatedCost: monthRecords.reduce((s, r) => s + r.cost, 0),
      lastUsed: facRecords[0]?.timestamp ?? "",
      usesCustomKey: !!cfg.customApiKey,
    };
  });

  const nowMI = year * 12 + month;
  const monthlyTrend: AiMonthlyTrendPoint[] = [];
  for (let back = TREND_MONTHS - 1; back >= 0; back--) {
    const mi = nowMI - back;
    const y = Math.floor(mi / 12);
    const m = ((mi % 12) + 12) % 12;
    const monthRecs = records.filter((r) => isSameMonth(r.timestamp, y, m));
    monthlyTrend.push({
      month: monthLabel(mi),
      tokens: monthRecs.reduce((s, r) => s + r.totalTokens, 0),
      cost: Number(monthRecs.reduce((s, r) => s + r.cost, 0).toFixed(2)),
    });
  }

  return {
    records,
    recentRecords: records.slice(0, 30),
    summaries,
    kpis: {
      totalTokensThisMonth: thisMonth.reduce((s, r) => s + r.totalTokens, 0),
      estimatedCostThisMonth: thisMonth.reduce((s, r) => s + r.cost, 0),
      facilitiesUsingAi: summaries.filter((s) => s.currentMonthTokens > 0)
        .length,
    },
    topFacilities: [...summaries]
      .sort((a, b) => b.currentMonthTokens - a.currentMonthTokens)
      .slice(0, 10),
    monthlyTrend,
  };
}

export const aiUsageQueries = {
  dashboard: () => ({
    queryKey: ["ai-usage", "dashboard"] as const,
    queryFn: async (): Promise<AiUsageDashboard> => {
      let live: AiUsageRecord[] = [];
      try {
        const res = await fetch("/api/ai/usage");
        if (res.ok) live = ((await res.json()).live as AiUsageRecord[]) ?? [];
      } catch {
        // endpoint unavailable — fall back to the seed baseline
      }
      return buildAiDashboard(new Date(), live);
    },
    initialData: (): AiUsageDashboard => buildAiDashboard(new Date(), []),
  }),
};
