import type { SyncJob } from "./sync-engine";
import type { SyncedDocument } from "./synced-documents-store";

// ============================================================================
// The dashboard's numbers (Phase 5.2).
//
// Pure, and deliberately split by source:
//   • COUNTS of work in progress come from the queue — pending and errors are
//     properties of jobs, not of documents.
//   • MONEY comes from the synced-documents ledger — only an amount QuickBooks
//     actually accepted may be reported as synced. Summing the queue would let
//     a pending or failed job inflate a revenue figure.
// ============================================================================

export interface DashboardMetrics {
  syncedTodayCount: number;
  syncedTodayAmount: number;
  pendingCount: number;
  errorCount: number;
  last30DaysAmount: number;
  last30DaysCount: number;
}

/** Local calendar day, not a rolling 24 hours — "today" on a dashboard means
 *  the day the facility is having. */
function isSameLocalDay(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

/** "Last N days" means "since N days ago" — deliberately with no upper bound.
 *
 *  Capping at `now` made the two windows disagree: a document stamped later
 *  today counted as synced TODAY but fell outside LAST 30 DAYS, so the smaller
 *  window could report more than the larger one. Clock skew between Yipyy and
 *  QuickBooks is enough to produce that. */
function withinDays(iso: string, days: number, now: Date): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t >= now.getTime() - days * 86_400_000;
}

export function buildDashboardMetrics(
  jobs: SyncJob[],
  documents: SyncedDocument[],
  now: Date = new Date(),
): DashboardMetrics {
  const today = documents.filter((d) => isSameLocalDay(d.syncedAt, now));
  const last30 = documents.filter((d) => withinDays(d.syncedAt, 30, now));

  return {
    syncedTodayCount: today.length,
    syncedTodayAmount: today.reduce((sum, d) => sum + d.amount, 0),
    // Ignored jobs are neither waiting nor broken — someone decided about them.
    pendingCount: jobs.filter((j) => j.status === "pending").length,
    errorCount: jobs.filter((j) => j.status === "failed").length,
    last30DaysAmount: last30.reduce((sum, d) => sum + d.amount, 0),
    last30DaysCount: last30.length,
  };
}

export function formatMoney(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount);
}

/** "3 minutes ago", "2 hours ago", "yesterday". Coarse on purpose: a sync
 *  dashboard needs "recent or not", not a stopwatch. */
export function timeAgo(
  iso: string | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "never";

  const seconds = Math.floor((now.getTime() - t) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
