import { getAllTransactions } from "@/data/retail";
import type { Transaction } from "@/types/retail";

// ============================================================================
// Historical sync (3.6) — the back-catalogue.
//
// When a facility connects mid-life, everything before today is invisible to
// QuickBooks unless they backfill it. That is a genuinely dangerous button: it
// can create thousands of documents in a live company, and undoing them is
// manual work in QuickBooks, one at a time. So the flow is built to make the
// SIZE of what's about to happen impossible to miss, and to run it slowly and
// resumably rather than firing a thousand requests at once.
//
// Two things keep it safe:
//   - idempotency (4.1): every enqueue derives its key from the transaction, so
//     a re-run — or a run that overlaps yesterday's realtime sync — skips what
//     already posted instead of duplicating revenue.
//   - rate limiting: QuickBooks' real ceiling is ~500 requests/minute, and
//     exceeding it gets the whole app throttled. The runner paces itself under
//     that, which is also what makes a large run take long enough to need a
//     progress bar.
//
// Pure here; the runner that drives it lives in historical-runner.ts.
// ============================================================================

/** QuickBooks Online's documented throttle: ~500 requests per minute per realm.
 *  The runner stays under this; going over gets HTTP 429s for everyone. */
export const HISTORICAL_RATE_LIMIT_PER_MIN = 500;

/** How many documents to post before yielding. Small enough that a cancel or a
 *  connection drop is felt within a second, not a minute. */
export const HISTORICAL_BATCH_SIZE = 25;

/** A range longer than this is "large" and gets the accountant warning. Matches
 *  the setup-step threshold so the two never disagree. */
export const LARGE_HISTORICAL_RANGE_DAYS = 90;

export interface HistoricalRange {
  /** "YYYY-MM-DD", inclusive. */
  from: string;
  /** "YYYY-MM-DD", inclusive. Defaults to today at call sites. */
  to: string;
}

export function rangeDays(range: HistoricalRange): number {
  const from = Date.parse(`${range.from}T00:00:00`);
  const to = Date.parse(`${range.to}T00:00:00`);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.round((to - from) / 86_400_000) + 1; // inclusive of both ends
}

/** Whole months, for the human-facing "6 months of history" phrasing. */
export function rangeMonths(range: HistoricalRange): number {
  return Math.max(1, Math.round(rangeDays(range) / 30));
}

export function isLargeRange(range: HistoricalRange): boolean {
  return rangeDays(range) > LARGE_HISTORICAL_RANGE_DAYS;
}

/**
 * The transactions a historical run would actually enqueue.
 *
 * Only completed sales: a voided sale never happened, and a refund is posted by
 * its own flow, not backfilled as a sale. The date is the transaction's own
 * `createdAt`, so what's counted is what actually occurred in the window — not
 * a projection.
 */
export function historicalTransactions(
  range: HistoricalRange,
  all: Transaction[] = getAllTransactions(),
): Transaction[] {
  const from = `${range.from}T00:00:00`;
  const to = `${range.to}T23:59:59`;
  return all
    .filter((t) => t.status === "completed")
    .filter((t) => t.createdAt >= from && t.createdAt <= to)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * How many QuickBooks entries this run will create.
 *
 * The real count of matching transactions — NOT an estimate dressed up as a
 * fact. A facility deciding whether to press the button deserves the true
 * number, and inventing "you have ~2,400 entries" from a per-day rate would be
 * exactly the kind of fake this codebase forbids. The word "estimate" appears
 * nowhere in the UI for that reason.
 */
export function historicalEntryCount(
  range: HistoricalRange,
  all: Transaction[] = getAllTransactions(),
): number {
  return historicalTransactions(range, all).length;
}

export interface BatchPlan {
  total: number;
  batchSize: number;
  batches: number;
  /** Minutes the run would take at the rate limit, floored at the real pace.
   *  Zero for a run small enough to finish inside one minute. */
  estimatedMinutes: number;
}

export function planBatches(
  total: number,
  ratePerMin: number = HISTORICAL_RATE_LIMIT_PER_MIN,
  batchSize: number = HISTORICAL_BATCH_SIZE,
): BatchPlan {
  return {
    total,
    batchSize,
    batches: Math.ceil(total / batchSize),
    estimatedMinutes: ratePerMin > 0 ? Math.floor(total / ratePerMin) : 0,
  };
}

/**
 * The large-range warning, worded for the person who signs off on the books.
 *
 * Names the real count and points at the accountant, because the risk isn't
 * technical — it's a year of revenue landing in a live company that someone now
 * has to reconcile.
 */
export function historicalWarning(
  range: HistoricalRange,
  count: number,
): string {
  const months = rangeMonths(range);
  const entries =
    count === 1 ? "1 entry" : `${count.toLocaleString("en-CA")} entries`;
  return `Syncing ${months} ${months === 1 ? "month" : "months"} of history will create ${entries} in QuickBooks. This can't be undone in bulk — your accountant should review these before you rely on the numbers.`;
}

/** The one-line confirmation shown even for a small run, so nobody backfills a
 *  live company by reflex. */
export function historicalSummary(
  range: HistoricalRange,
  count: number,
): string {
  if (count === 0) {
    return "No completed sales in this range — nothing to sync.";
  }
  const entries =
    count === 1 ? "1 sale" : `${count.toLocaleString("en-CA")} sales`;
  return `${entries} from ${range.from} to ${range.to} will be sent to QuickBooks. Ones already synced are skipped.`;
}
