// ============================================================================
// The reputation numbers, from Postgres.
//
// A NEW module rather than a rewrite of `src/lib/api/reputation.ts`, which is
// still the fixture factory the eight tabs read. Both exist for as long as the
// conversion takes, and that is the state this repo has been bitten by before —
// see the debt map. Nothing here falls back to a fixture: a facility with no
// reviews has no reviews, and showing it somebody else's sample data is how a
// screen ends up lying quietly.
//
// The shapes mirror the SQL exactly, including the {value, numerator,
// denominator, definition} envelope. Flattening it to a bare number in the
// client would throw away the thing the whole metric layer exists to carry.
// ============================================================================

/**
 * One metric, with the numbers that produced it.
 *
 * `value` is null when the denominator is zero. That is deliberate and must be
 * rendered as "no data", never as 0% — "0% of nobody responded" is false, and a
 * card reading 0% looks like a failure rather than a quiet month.
 */
export interface Metric {
  value: number | null;
  numerator: number;
  denominator: number | null;
  definition: string;
}

export interface Sentiment {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  definition: string;
}

export interface ReputationMetrics {
  scope: {
    facilityId: string;
    locationIds: string[] | null;
    from: string;
    to: string;
  };
  requestsSent: Metric;
  responseRate: Metric;
  averageRating: Metric;
  fiveStarShare: Metric;
  detractorRate: Metric;
  publicClickRate: Metric;
  nudgeRecovery: Metric;
  suppressionRate: Metric;
  sentiment: Sentiment;
}

export interface StaffStat {
  staff_id: string;
  staff_name: string;
  /** Single-valued attribution. These SUM to the response total. */
  reviews: number;
  /** Responses whose visit included this person. May exceed the total. */
  mentions: number;
  rating_sum: number;
  average_rating: number | null;
  detractors: number;
  praise: number;
}

export interface ServiceStat {
  service_type: string;
  requests: number;
  responses: number;
  average_rating: number | null;
  detractors: number;
}

export interface ReputationAnalytics {
  metrics: ReputationMetrics;
  staff: StaffStat[];
  services: ServiceStat[];
}

export interface AnalyticsRange {
  from: string;
  to: string;
  /** Empty means every location the caller can see, never "no locations". */
  locationIds?: string[];
}

async function fetchAnalytics(
  range: AnalyticsRange,
): Promise<ReputationAnalytics> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  for (const id of range.locationIds ?? []) params.append("location", id);

  const response = await fetch(`/api/reputation/metrics?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? "Could not read the review figures.");
  }
  return (await response.json()) as ReputationAnalytics;
}

export const reputationAnalyticsQueries = {
  forRange: (range: AnalyticsRange) => ({
    queryKey: [
      "reputation",
      "analytics",
      range.from,
      range.to,
      (range.locationIds ?? []).join(","),
    ] as const,
    queryFn: () => fetchAnalytics(range),
  }),
};

/**
 * A metric as a percentage string, or a dash.
 *
 * The dash is the point. Every caller that would otherwise write
 * `${(m.value ?? 0) * 100}%` reintroduces the "0% of nobody" defect, so the
 * formatting decision is made once, here.
 */
export function asPercent(metric: Metric): string {
  if (metric.value === null) return "—";
  return `${(metric.value * 100).toFixed(1)}%`;
}

/**
 * The subtitle a metric card shows under its figure.
 *
 * This is what makes D-06 structurally impossible: "41.3%" was unresolvable
 * from the shipped screen because nothing said 41.3% of what.
 */
export function denominatorLabel(metric: Metric, noun: string): string {
  if (metric.denominator === null) return "";
  if (metric.denominator === 0) return `no ${noun} yet`;
  return `${metric.numerator} of ${metric.denominator} ${noun}`;
}
