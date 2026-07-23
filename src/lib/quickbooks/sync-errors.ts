import type { SyncJob } from "./sync-engine";

// ============================================================================
// Plain-English sync failures (Phase 5.4 / 4D).
//
// A raw API error is written for whoever wrote the API. The person reading this
// panel runs a grooming salon: they need to know what broke, whether it cost
// them anything, and what to press. So every failure is classified into a small
// set of things that can actually go wrong, and each one states its own fix.
//
// Pure on purpose — the wording is the product here, and it should be checkable
// without rendering anything.
// ============================================================================

export type SyncErrorKind =
  | "mapping"
  | "expired"
  | "duplicate"
  | "permission"
  | "network"
  | "validation"
  | "unknown";

/** What the facility should do next. The panel turns this into buttons. */
export type SyncErrorRemedy = "retry" | "reconnect" | "map" | "none";

export interface ExplainedSyncError {
  kind: SyncErrorKind;
  /** One sentence, no codes, no jargon. */
  reason: string;
  /** What to do about it. */
  remedy: SyncErrorRemedy;
  /** False when pressing Retry cannot possibly help (a duplicate is already
   *  in QuickBooks; retrying would only risk posting revenue twice). */
  retryable: boolean;
  /** The raw error, kept for the tooltip — hidden, never deleted. */
  raw?: string;
}

const DUPLICATE = /duplicate|already exists|6240/i;
const EXPIRED = /expired|refresh token|invalid_grant|reauthorize|reauthorise/i;
const PERMISSION = /unauthoris|unauthoriz|forbidden|permission|401|403/i;
const MAPPING =
  /account|item not found|no such (item|account)|invalid reference|unmapped|mapping/i;
const NETWORK =
  /timeout|timed out|network|unreachable|unavailable|502|503|504/i;
const VALIDATION = /invalid|required|must be|validation|malformed|amount/i;

/** A readable name for whatever the job was posting. */
function subjectOf(job: SyncJob): string {
  return job.serviceSummary || job.description || "this transaction";
}

const DOCUMENT_LABEL: Record<SyncJob["documentType"], string> = {
  sales_receipt: "Sales Receipt",
  invoice: "Invoice",
  refund_receipt: "Refund Receipt",
  credit_memo: "Credit Memo",
};

/**
 * Turn a failed job into something a person can act on.
 *
 * `connectionExpired` is passed in rather than read here: one expired
 * connection explains every failure underneath it, and a panel that blames the
 * mapping for what is really a dead token sends someone editing the wrong page.
 */
export function explainSyncError(
  job: SyncJob,
  connectionExpired = false,
): ExplainedSyncError {
  const raw = job.lastError;

  // The connection outranks whatever the individual call reported: nothing is
  // going to succeed until it's back, so that is the only useful instruction.
  if (connectionExpired || (raw && EXPIRED.test(raw))) {
    return {
      kind: "expired",
      reason:
        "Your QuickBooks connection has expired. Reconnect to resume syncing — nothing is lost, these entries will send again.",
      remedy: "reconnect",
      retryable: false,
      raw,
    };
  }

  if (!raw) {
    return {
      kind: "unknown",
      reason: `Yipyy couldn't send ${subjectOf(job)} to QuickBooks and didn't get a reason back. The payment itself was taken successfully.`,
      remedy: "retry",
      retryable: true,
    };
  }

  if (DUPLICATE.test(raw)) {
    return {
      kind: "duplicate",
      reason: `Duplicate transaction detected: a ${DOCUMENT_LABEL[job.documentType]} for this booking already exists in QuickBooks. Retry skipped.`,
      // Retrying a duplicate is the one action that can do real damage —
      // revenue counted twice in someone's books.
      remedy: "none",
      retryable: false,
      raw,
    };
  }

  if (PERMISSION.test(raw)) {
    return {
      kind: "permission",
      reason:
        "QuickBooks refused the request. The connected account may not have permission to create transactions — reconnect with an admin user.",
      remedy: "reconnect",
      retryable: false,
      raw,
    };
  }

  if (MAPPING.test(raw)) {
    return {
      kind: "mapping",
      reason: `QuickBooks could not find the income account for ${subjectOf(job)}. Update the mapping and retry.`,
      remedy: "map",
      retryable: true,
      raw,
    };
  }

  if (NETWORK.test(raw)) {
    return {
      kind: "network",
      reason:
        "QuickBooks didn't respond in time. This usually clears on its own — retry when you're ready. The payment was taken successfully.",
      remedy: "retry",
      retryable: true,
      raw,
    };
  }

  if (VALIDATION.test(raw)) {
    return {
      kind: "validation",
      reason: `QuickBooks rejected ${subjectOf(job)} as invalid. Check the amounts and the mapping for this item, then retry.`,
      remedy: "map",
      retryable: true,
      raw,
    };
  }

  return {
    kind: "unknown",
    reason: `Yipyy couldn't send ${subjectOf(job)} to QuickBooks. The payment itself was taken successfully — this only affects your books.`,
    remedy: "retry",
    retryable: true,
    raw,
  };
}

export interface FailedSyncEntry {
  job: SyncJob;
  error: ExplainedSyncError;
}

/** Every failure, newest first, each already explained. */
export function failedSyncEntries(
  jobs: SyncJob[],
  connectionExpired = false,
): FailedSyncEntry[] {
  return jobs
    .filter((j) => j.status === "failed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((job) => ({ job, error: explainSyncError(job, connectionExpired) }));
}

/** The banner line. Kept here so the count and the wording can't disagree. */
export function errorBannerMessage(count: number): string {
  return count === 1
    ? "1 transaction needs your attention"
    : `${count} transactions need your attention`;
}

/** Reasons offered when taking a job out of the queue by hand. */
export const IGNORE_REASONS = [
  "Already entered in QuickBooks manually",
  "Duplicate of another transaction",
  "Test transaction",
  "Not needed in QuickBooks",
] as const;
