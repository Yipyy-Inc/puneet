"use client";

import { useSyncExternalStore } from "react";

import { addFacilityNotification } from "@/data/facility-notifications";
import {
  resyncToQuickBooks,
  syncPaymentToQuickBooks,
  syncRefundToQuickBooks,
  type QBInvoiceData,
  type QBSyncResult,
} from "@/lib/quickbooks-sync";

import { recordSyncedDocument } from "./synced-documents-store";
import {
  isQuickBooksSyncPaused,
  getQuickBooksConnection,
  quickBooksSyncPauseReason,
  scopeKey,
  type QuickBooksScope,
} from "./connection-store";

// ============================================================================
// Mock sync engine (Phase 4.1).
//
// Extends src/lib/quickbooks-sync.ts rather than replacing it: that file is the
// declared seam and still performs the "call", while this file owns the queue
// around it — idempotency, attempts, backoff and terminal failure.
//
// THE RULE that shapes everything here: a failed sync NEVER blocks operations.
// The Yipyy payment already succeeded and the client has already left. A sync
// failure is a bookkeeping problem, so it lives in the log and the queue, and
// nothing in this file can refuse, reverse or delay a sale.
//
// TODO: real QuickBooks API + real durable queue — this queue is localStorage
// and its timers are simulated (nextRetryAt is a stored timestamp, not a live
// scheduler). A real one is server-side, survives the browser being closed, and
// is drained by a worker.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-sync-queue";
const CHANNEL = "yipyy-quickbooks-sync-queue";

/** Attempts before a job stops retrying and is reported as failed. */
export const MAX_ATTEMPTS = 5;

/** Wait before each attempt: the first is immediate, then it backs off hard.
 *  A QuickBooks outage that lasts a morning shouldn't be hammered, and by the
 *  24-hour mark a human needs to look at it anyway. */
export const BACKOFF_MINUTES = [0, 5, 30, 120, 1440] as const;

export type SyncJobStatus = "pending" | "synced" | "failed" | "ignored";

export type SyncDocumentType =
  | "sales_receipt"
  | "invoice"
  | "refund_receipt"
  | "credit_memo"
  /** A payment applied against an invoice. Its own type because the idempotency
   *  key is derived from (type, transaction) — two payments settling one
   *  invoice must not collide, so the key is keyed on the payment, not the
   *  invoice. */
  | "payment"
  /** A movement with no customer and no sale — gift-card breakage (5C). */
  | "journal_entry";

export interface SyncJob {
  id: string;
  /** The Yipyy transaction this job posts. */
  transactionId: string;
  /**
   * Derived from the transaction id, never random (7B). Two enqueues of the
   * same transaction produce the same key, which is what makes a double-click,
   * a page refresh mid-checkout and a replayed queue all harmless.
   */
  idempotencyKey: string;
  documentType: SyncDocumentType;
  /** Human-readable line for the sync log. */
  description: string;
  amount: number;
  /** Display fields the activity log needs. Carried on the job rather than
   *  looked up later: the log is a RECORD, and it has to stay readable after
   *  the underlying transaction is edited, archived or gone. */
  transactionDate?: string;
  clientName?: string;
  petName?: string;
  serviceSummary?: string;
  status: SyncJobStatus;
  attemptCount: number;
  /** When the next attempt becomes due. Absent once the job is settled. */
  nextRetryAt?: string;
  /** Set once QuickBooks has the document — the idempotency guard reads this. */
  quickBooksDocumentId?: string;
  quickBooksDocumentNumber?: string;
  lastError?: string;
  ignoredReason?: string;
  /** Carried so a retry posts the same document the first attempt would have. */
  payload?: QBInvoiceData;
  createdAt: string;
  updatedAt: string;
}

type QueueByScope = Record<string, SyncJob[]>;

const EMPTY_JOBS: SyncJob[] = Object.freeze([]) as unknown as SyncJob[];
const EMPTY_MAP: QueueByScope = Object.freeze({});

let state: QueueByScope = EMPTY_MAP;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as QueueByScope;
  } catch {
    // ignore
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    load();
    emit();
  };
}

function ensureReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  load();
  ensureChannel();
}

function commit(next: QueueByScope) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function jobsFor(scope: QuickBooksScope): SyncJob[] {
  ensureReady();
  return state[scopeKey(scope)] ?? EMPTY_JOBS;
}

function writeJobs(scope: QuickBooksScope, jobs: SyncJob[]) {
  commit({ ...state, [scopeKey(scope)]: jobs });
}

function updateJob(
  scope: QuickBooksScope,
  jobId: string,
  patch: Partial<SyncJob>,
): SyncJob | undefined {
  const jobs = jobsFor(scope);
  let updated: SyncJob | undefined;
  const next = jobs.map((j) => {
    if (j.id !== jobId) return j;
    updated = { ...j, ...patch, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (updated) writeJobs(scope, next);
  return updated;
}

// ── Idempotency (7B) ────────────────────────────────────────────────────────

/** Stable and derived — the same transaction always yields the same key. */
export function idempotencyKeyFor(
  transactionId: string,
  documentType: SyncDocumentType,
): string {
  return `yipyy:${documentType}:${transactionId}`;
}

/**
 * Has this transaction already reached QuickBooks?
 *
 * Checked before every sync AND every retry. Without it a retry after a
 * timeout — where the document actually posted but the response was lost —
 * would duplicate revenue in someone's books, which is far worse than a sync
 * that didn't happen.
 */
export function existingDocumentFor(
  scope: QuickBooksScope,
  idempotencyKey: string,
): SyncJob | undefined {
  return jobsFor(scope).find(
    (j) => j.idempotencyKey === idempotencyKey && j.quickBooksDocumentId,
  );
}

// ── Reads ───────────────────────────────────────────────────────────────────

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncJobs(scope: QuickBooksScope): SyncJob[] {
  return jobsFor(scope);
}

export function useSyncJobs(scope: QuickBooksScope): SyncJob[] {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? EMPTY_JOBS,
    () => EMPTY_JOBS,
  );
}

export function jobForTransaction(
  scope: QuickBooksScope,
  transactionId: string,
): SyncJob | undefined {
  return jobsFor(scope).find((j) => j.transactionId === transactionId);
}

/** Jobs whose next attempt is due. */
export function dueJobs(
  scope: QuickBooksScope,
  now: Date = new Date(),
): SyncJob[] {
  return jobsFor(scope).filter(
    (j) =>
      j.status === "pending" &&
      (!j.nextRetryAt || Date.parse(j.nextRetryAt) <= now.getTime()),
  );
}

// ── Enqueue ─────────────────────────────────────────────────────────────────

export interface EnqueueInput {
  transactionId: string;
  documentType: SyncDocumentType;
  description: string;
  amount: number;
  transactionDate?: string;
  clientName?: string;
  petName?: string;
  serviceSummary?: string;
  payload?: QBInvoiceData;
}

/**
 * Queue a transaction for syncing.
 *
 * Enqueuing the same transaction twice returns the existing job rather than
 * adding a second — the idempotency key is derived, so the queue itself is the
 * deduplication point.
 */
export function enqueueSync(
  scope: QuickBooksScope,
  input: EnqueueInput,
): SyncJob {
  ensureReady();
  const idempotencyKey = idempotencyKeyFor(
    input.transactionId,
    input.documentType,
  );
  const jobs = jobsFor(scope);
  const existing = jobs.find((j) => j.idempotencyKey === idempotencyKey);
  if (existing) return existing;

  const now = new Date().toISOString();
  const job: SyncJob = {
    id: `qbjob-${input.transactionId}-${input.documentType}`,
    transactionId: input.transactionId,
    idempotencyKey,
    documentType: input.documentType,
    description: input.description,
    amount: input.amount,
    transactionDate: input.transactionDate,
    clientName: input.clientName,
    petName: input.petName,
    serviceSummary: input.serviceSummary,
    status: "pending",
    attemptCount: 0,
    // No nextRetryAt: the field means "not before this time", and a job that
    // has never been attempted carries no such constraint. Stamping it with the
    // wall clock instead made a fresh job due at the moment it was created
    // rather than immediately — which is the same thing in production and a
    // different thing entirely under any other clock.
    nextRetryAt: undefined,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  };
  writeJobs(scope, [...jobs, job]);
  return job;
}

// ── Performing one attempt ──────────────────────────────────────────────────

function fallbackPayload(job: SyncJob): QBInvoiceData {
  return {
    invoiceId: `INV-${job.transactionId}`,
    bookingId: 0,
    clientName: "",
    clientEmail: "",
    items: [],
    subtotal: job.amount,
    discountAmount: 0,
    taxAmount: 0,
    total: job.amount,
    amountPaid: job.amount,
    paymentMethod: "",
    paymentDate: job.createdAt,
  };
}

/** Routes to the declared seam — this engine owns the queue, not the call. */
function performSync(job: SyncJob, manual: boolean): Promise<QBSyncResult> {
  const payload = job.payload ?? fallbackPayload(job);
  if (manual) return resyncToQuickBooks(payload);
  if (
    job.documentType === "refund_receipt" ||
    job.documentType === "credit_memo"
  )
    return syncRefundToQuickBooks(payload);
  return syncPaymentToQuickBooks(payload);
}

function backoffFor(attemptCount: number): number {
  const index = Math.min(attemptCount, BACKOFF_MINUTES.length - 1);
  return BACKOFF_MINUTES[index];
}

function notifyTerminalFailure(job: SyncJob) {
  addFacilityNotification({
    type: "warning",
    category: "quickbooks",
    title: "QuickBooks sync failed",
    message: `${job.description} couldn't be sent to QuickBooks after ${MAX_ATTEMPTS} attempts. The payment itself was taken successfully.`,
    link: "/facility/dashboard/settings/integrations/quickbooks",
  });
}

export interface AttemptOptions {
  /** Force an outcome instead of the seam's own behaviour. */
  simulate?: "success" | "failure";
  now?: Date;
  /** Skip the seam's simulated latency. */
  latencyMs?: number;
}

/**
 * Run one attempt for one job.
 *
 * Always resolves — never throws — because a caller in a checkout flow must not
 * be able to fail because bookkeeping did.
 */
export async function attemptJob(
  scope: QuickBooksScope,
  jobId: string,
  options: AttemptOptions = {},
): Promise<SyncJob | undefined> {
  const { simulate, now = new Date() } = options;
  const job = jobsFor(scope).find((j) => j.id === jobId);
  if (!job || job.status === "ignored") return job;

  // 7B: if this transaction already has a document, do not post a second one.
  const alreadyPosted = existingDocumentFor(scope, job.idempotencyKey);
  if (alreadyPosted) {
    return updateJob(scope, job.id, {
      status: "synced",
      nextRetryAt: undefined,
      quickBooksDocumentId: alreadyPosted.quickBooksDocumentId,
      quickBooksDocumentNumber: alreadyPosted.quickBooksDocumentNumber,
      lastError: undefined,
    });
  }

  let result: QBSyncResult;
  if (simulate === "success") {
    result = {
      success: true,
      syncedAt: now.toISOString(),
      quickbooksInvoiceId: `QB-INV-${job.transactionId}`,
      quickbooksPaymentId: `QB-PMT-${job.transactionId}`,
    };
  } else if (simulate === "failure") {
    result = {
      success: false,
      syncedAt: now.toISOString(),
      error: "QuickBooks API timeout — please retry",
    };
  } else {
    try {
      result = await performSync(job, false);
    } catch (error) {
      result = {
        success: false,
        syncedAt: now.toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const attemptCount = job.attemptCount + 1;

  if (result.success) {
    // The ledger entry outlives the job: money reached the books, and that fact
    // must survive the queue being pruned.
    recordSyncedDocument(scope, {
      transactionId: job.transactionId,
      jobId: job.id,
      documentType: job.documentType,
      quickBooksDocumentId: result.quickbooksPaymentId ?? job.id,
      documentNumber: result.quickbooksInvoiceId ?? job.transactionId,
      amount: job.amount,
      description: job.description,
      syncedAt: result.syncedAt,
      // Stamp the environment so a Test-mode entry can never be mistaken for a
      // real one, and so the production-sync gate (Phase 10) can tell them apart.
      environment: getQuickBooksConnection(scope).environment ?? "production",
    });
    return updateJob(scope, job.id, {
      status: "synced",
      attemptCount,
      nextRetryAt: undefined,
      quickBooksDocumentId: result.quickbooksPaymentId,
      quickBooksDocumentNumber: result.quickbooksInvoiceId,
      lastError: undefined,
    });
  }

  // Out of attempts — stop retrying and tell someone.
  if (attemptCount >= MAX_ATTEMPTS) {
    const failed = updateJob(scope, job.id, {
      status: "failed",
      attemptCount,
      nextRetryAt: undefined,
      lastError: result.error,
    });
    if (failed) notifyTerminalFailure(failed);
    return failed;
  }

  const waitMinutes = backoffFor(attemptCount);
  return updateJob(scope, job.id, {
    status: "pending",
    attemptCount,
    nextRetryAt: new Date(now.getTime() + waitMinutes * 60_000).toISOString(),
    lastError: result.error,
  });
}

// ── Draining ────────────────────────────────────────────────────────────────

export interface ProcessResult {
  attempted: number;
  synced: number;
  stillPending: number;
  failed: number;
  /** Set when nothing ran because the connection isn't usable (7D). */
  pausedReason?: string;
}

/**
 * Attempt every job that's due.
 *
 * An expired or unreachable connection PAUSES the queue rather than failing it
 * (7D): the jobs stay pending with their attempt counts untouched, so
 * reconnecting resumes instead of having burned five attempts against a
 * connection that was never going to answer.
 */
export async function processQueue(
  scope: QuickBooksScope,
  options: AttemptOptions = {},
): Promise<ProcessResult> {
  const now = options.now ?? new Date();
  const connection = getQuickBooksConnection(scope);

  if (isQuickBooksSyncPaused(connection)) {
    const jobs = jobsFor(scope);
    return {
      attempted: 0,
      synced: 0,
      stillPending: jobs.filter((j) => j.status === "pending").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      pausedReason: quickBooksSyncPauseReason(connection) ?? undefined,
    };
  }

  const due = dueJobs(scope, now);
  for (const job of due) {
    await attemptJob(scope, job.id, options);
  }

  const after = jobsFor(scope);
  return {
    attempted: due.length,
    synced: after.filter((j) => j.status === "synced").length,
    stillPending: after.filter((j) => j.status === "pending").length,
    failed: after.filter((j) => j.status === "failed").length,
  };
}

/**
 * Manual retry from the sync log.
 *
 * Clears the backoff and the failed state so a job that exhausted its attempts
 * can be tried again once whatever caused it has been fixed. The idempotency
 * check still runs first.
 */
export async function retry(
  scope: QuickBooksScope,
  jobId: string,
  options: AttemptOptions = {},
): Promise<SyncJob | undefined> {
  const job = jobsFor(scope).find((j) => j.id === jobId);
  if (!job) return undefined;

  updateJob(scope, jobId, {
    status: "pending",
    nextRetryAt: (options.now ?? new Date()).toISOString(),
    // Attempts are NOT reset: the history of how hard this fought is part of
    // the record, and resetting would let a broken job loop forever.
  });
  return attemptJob(scope, jobId, options);
}

/** Take a job out of the queue for a stated reason — a duplicate, a test
 *  transaction, something the bookkeeper will enter by hand. */
export function markIgnored(
  scope: QuickBooksScope,
  jobId: string,
  reason: string,
): SyncJob | undefined {
  return updateJob(scope, jobId, {
    status: "ignored",
    ignoredReason: reason,
    nextRetryAt: undefined,
  });
}

/** Drop every job for a scope — used when disconnecting a company. */
export function clearSyncQueue(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}
