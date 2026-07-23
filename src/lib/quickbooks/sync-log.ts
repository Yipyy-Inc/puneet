import type { SyncJob } from "./sync-engine";
import type { SyncedDocument } from "./synced-documents-store";

// ============================================================================
// The sync activity log (Phase 5.3) — the trust engine.
//
// Pure: jobs + ledger in, rows out. The whole point of this screen is that a
// facility can check Yipyy's claims, so the filtering and the CSV are built
// where they can be verified rather than inside a component.
// ============================================================================

/** RULE: the log shows 12 months. Older entries are archived — still exported,
 *  just not rendered, because a table nobody can scroll isn't a record. */
export const RETENTION_MONTHS = 12;

export type SyncLogStatus = "synced" | "pending" | "failed" | "ignored";

export interface SyncLogRow {
  jobId: string;
  transactionId: string;
  /** Yipyy transaction date/time — when the money actually moved. */
  occurredAt: string;
  clientName: string;
  petName?: string;
  serviceSummary: string;
  amount: number;
  status: SyncLogStatus;
  documentNumber?: string;
  quickBooksDocumentId?: string;
  error?: string;
  /** Why someone took this out of the queue by hand. Shown in the row and the
   *  CSV — an ignored transaction with no stated reason is just a gap. */
  ignoredReason?: string;
  attemptCount: number;
}

export interface SyncLogFilters {
  from?: string;
  to?: string;
  status?: SyncLogStatus | "all";
  /** Matched against the service summary. */
  serviceType?: string;
  minAmount?: number;
  maxAmount?: number;
  /** Client name or pet name. */
  search?: string;
}

/**
 * Build the log from the queue, enriched with what actually posted.
 *
 * The queue is the spine rather than the ledger: a facility needs to see the
 * failures and the waiting work, and those have no document. The ledger fills
 * in the document number for the ones that made it.
 */
export function buildSyncLog(
  jobs: SyncJob[],
  documents: SyncedDocument[],
): SyncLogRow[] {
  const byTransaction = new Map(
    documents.map((d) => [`${d.transactionId}:${d.documentType}`, d]),
  );

  return jobs
    .map((job) => {
      const doc = byTransaction.get(`${job.transactionId}:${job.documentType}`);
      return {
        jobId: job.id,
        transactionId: job.transactionId,
        // Fall back to when the job was created: a row with no date is
        // unusable, and the enqueue time is the closest honest stand-in.
        occurredAt: job.transactionDate ?? job.createdAt,
        clientName: job.clientName ?? "Walk-in",
        petName: job.petName,
        serviceSummary: job.serviceSummary ?? job.description,
        amount: job.amount,
        status: job.status as SyncLogStatus,
        documentNumber: doc?.documentNumber ?? job.quickBooksDocumentNumber,
        quickBooksDocumentId:
          doc?.quickBooksDocumentId ?? job.quickBooksDocumentId,
        error: job.lastError,
        ignoredReason: job.ignoredReason,
        attemptCount: job.attemptCount,
      };
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function monthsAgo(months: number, now: Date): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Rows inside the retention window — what the table renders. */
export function withinRetention(
  rows: SyncLogRow[],
  now: Date = new Date(),
): SyncLogRow[] {
  const cutoff = monthsAgo(RETENTION_MONTHS, now).getTime();
  return rows.filter((r) => {
    const t = Date.parse(r.occurredAt);
    return Number.isNaN(t) ? true : t >= cutoff;
  });
}

/** Rows older than the window: excluded from the table, included in the CSV. */
export function archivedRows(
  rows: SyncLogRow[],
  now: Date = new Date(),
): SyncLogRow[] {
  const cutoff = monthsAgo(RETENTION_MONTHS, now).getTime();
  return rows.filter((r) => {
    const t = Date.parse(r.occurredAt);
    return Number.isNaN(t) ? false : t < cutoff;
  });
}

export function applySyncLogFilters(
  rows: SyncLogRow[],
  filters: SyncLogFilters,
): SyncLogRow[] {
  const search = filters.search?.trim().toLowerCase();
  const service = filters.serviceType?.trim().toLowerCase();

  return rows.filter((row) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      row.status !== filters.status
    )
      return false;

    // Dates compare as "YYYY-MM-DD" prefixes so a whole `to` day is included —
    // an inclusive end date is what a person means by "to the 23rd".
    const day = row.occurredAt.slice(0, 10);
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;

    if (filters.minAmount !== undefined && row.amount < filters.minAmount)
      return false;
    if (filters.maxAmount !== undefined && row.amount > filters.maxAmount)
      return false;

    if (service && !row.serviceSummary.toLowerCase().includes(service))
      return false;

    if (search) {
      const haystack = `${row.clientName} ${row.petName ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

/** Distinct service labels present in the log, for the filter dropdown. */
export function serviceTypeOptions(rows: SyncLogRow[]): string[] {
  return [...new Set(rows.map((r) => r.serviceSummary).filter(Boolean))].sort();
}

// ── QuickBooks deeplink ─────────────────────────────────────────────────────

/**
 * Stubbed link to the document in QuickBooks Online.
 *
 * TODO: real QuickBooks deeplink — the live URL is company-scoped and
 * per-entity (…/app/salesreceipt?txnId=…&realmId=…). The shape is the same.
 */
export function quickBooksDocumentUrl(
  documentId: string | undefined,
  realmId?: string,
): string {
  const base = "https://qbo.intuit.com/app/salesreceipt";
  const params = new URLSearchParams();
  if (documentId) params.set("txnId", documentId);
  if (realmId) params.set("realmId", realmId);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

const CSV_HEADER = [
  "Date",
  "Time",
  "Client",
  "Pet",
  "Service",
  "Amount",
  "Status",
  "QuickBooks document",
  "Attempts",
  "Error / reason",
];

const STATUS_LABEL: Record<SyncLogStatus, string> = {
  synced: "Synced",
  pending: "Pending",
  failed: "Failed",
  ignored: "Ignored",
};

/**
 * Rows for the CSV export.
 *
 * Exports EVERYTHING passed in, archived rows included — that is the point of
 * the export, and it is the only way a facility can reach entries older than
 * the retention window.
 */
export function buildSyncLogCsv(rows: SyncLogRow[]): (string | number)[][] {
  return [
    CSV_HEADER,
    ...rows.map((r) => [
      r.occurredAt.slice(0, 10),
      r.occurredAt.slice(11, 16),
      r.clientName,
      r.petName ?? "",
      r.serviceSummary,
      r.amount.toFixed(2),
      STATUS_LABEL[r.status],
      r.documentNumber ?? "",
      r.attemptCount,
      // One column for "what went wrong or why it was skipped" — a row can
      // only be in one of those states.
      r.error ?? r.ignoredReason ?? "",
    ]),
  ];
}
