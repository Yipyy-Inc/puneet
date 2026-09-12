import type { CustomerPackageRecord } from "@/data/customer-packages";

// ============================================================================
// The training passes a household owns, as rows a trainer can read.
//
// The trainer profile's package chips and panel read `clientTrainingPackages`
// from a fixture — invented purchases for invented dogs — and its "Send
// reminder" stamped a date in the query cache and toasted "Reminder queued".
// What a client really owns is /api/packages/owned (`CustomerPackageRecord`):
// a package belongs to the CLIENT, and each of its lines names the module its
// passes are for. This keeps the training lines of the active ones.
//
// Counts come from the record's lines, which the server derives from the pass
// ledger — nothing here recounts redemptions.
// ============================================================================

export interface TrainingPackageRow {
  id: string;
  packageName: string;
  purchasedAt: string;
  expiresAt?: string;
  /** Training passes on the package, across its training lines. */
  total: number;
  used: number;
  remaining: number;
  /** Share of the passes still left, 0–100. */
  progressPct: number;
  exhausted: boolean;
  /** One pass left. */
  lowBalance: boolean;
  /** Expires within EXPIRY_WINDOW_DAYS of today (and not before today). */
  expiringSoon: boolean;
}

export const EXPIRY_WINDOW_DAYS = 14;

function daysFrom(today: string, date: string): number {
  return Math.round(
    (Date.parse(`${date.slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${today.slice(0, 10)}T00:00:00Z`)) /
      86_400_000,
  );
}

/** Active packages with training passes, the ones needing action first. */
export function trainingPackageRows(
  records: readonly CustomerPackageRecord[],
  today: string,
): TrainingPackageRow[] {
  const rows: TrainingPackageRow[] = [];
  for (const record of records) {
    if (record.status !== "active") continue;
    const lines = record.passes.filter((p) => p.moduleId === "training");
    if (lines.length === 0) continue;
    const total = lines.reduce((n, p) => n + p.totalPasses, 0);
    const used = lines.reduce((n, p) => n + p.usedPasses, 0);
    const remaining = Math.max(0, total - used);
    const untilExpiry = record.expiresAt
      ? daysFrom(today, record.expiresAt)
      : null;
    rows.push({
      id: record.id,
      packageName: record.packageName,
      purchasedAt: record.purchasedAt,
      ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
      total,
      used,
      remaining,
      progressPct: total > 0 ? Math.round((remaining / total) * 100) : 0,
      exhausted: remaining === 0,
      lowBalance: remaining === 1,
      expiringSoon:
        untilExpiry !== null &&
        untilExpiry >= 0 &&
        untilExpiry <= EXPIRY_WINDOW_DAYS,
    });
  }
  return rows.sort((a, b) => {
    const aAction = a.exhausted || a.lowBalance || a.expiringSoon;
    const bAction = b.exhausted || b.lowBalance || b.expiringSoon;
    if (aAction !== bAction) return aAction ? -1 : 1;
    return b.purchasedAt.localeCompare(a.purchasedAt);
  });
}
