"use client";

import { useSyncExternalStore } from "react";

import { getAllTransactions } from "@/data/retail";
import type { Transaction } from "@/types/retail";

import {
  getQuickBooksConnection,
  scopeKey,
  type QuickBooksScope,
} from "./connection-store";
import { syncCheckoutToQuickBooks } from "./checkout-sync";
import {
  HISTORICAL_BATCH_SIZE,
  HISTORICAL_RATE_LIMIT_PER_MIN,
  historicalTransactions,
  type HistoricalRange,
} from "./historical-sync";
import {
  attemptJob,
  existingDocumentFor,
  idempotencyKeyFor,
} from "./sync-engine";

// ============================================================================
// The historical batch runner (3.6).
//
// Drives the same document builders the realtime path uses — through
// syncCheckoutToQuickBooks — so a backfilled sale is byte-for-byte the sale
// realtime would have posted. It adds three things realtime doesn't need:
//
//   1. Pacing. It never posts faster than the ~500/min ceiling, so a large run
//      can't get the whole app throttled. In this mock the ceiling is honoured
//      as a per-batch delay; a real one would read the rate-limit headers.
//   2. Progress. A run of thousands needs a bar, so every batch publishes where
//      it is to a store the UI subscribes to.
//   3. Resumability. It can be cancelled, and — because enqueue is idempotent
//      (4.1) — re-running skips whatever already posted rather than duplicating.
//
// TODO: real durable runner — this one lives in the tab that started it. A real
// one is server-side, survives a refresh, and reads 429 Retry-After headers
// instead of a fixed delay.
// ============================================================================

/** Real ~500/min would make even a modest run take real minutes, which nobody
 *  is going to sit and watch in a demo. The pacing is modelled instead: a short
 *  delay per batch, and the progress UI reports the throttle it is HONOURING,
 *  not this wall-clock delay. */
const SIMULATED_BATCH_DELAY_MS = 350;

export type HistoricalRunStatus =
  | "idle"
  | "running"
  | "cancelling"
  | "cancelled"
  | "done"
  | "paused";

export interface HistoricalProgress {
  status: HistoricalRunStatus;
  range?: HistoricalRange;
  /** Documents this run is responsible for. */
  total: number;
  /** How many have been handled (synced + skipped + failed). */
  processed: number;
  /** Newly posted to QuickBooks by this run. */
  synced: number;
  /** Already in QuickBooks from a prior run / realtime — the idempotency win. */
  skipped: number;
  failed: number;
  /** The pace being honoured, for the "throttled to ~500/min" line. */
  ratePerMin: number;
  /** Set when the run stopped because the connection isn't usable (7D). */
  pausedReason?: string;
  startedAt?: string;
  finishedAt?: string;
}

const EMPTY: HistoricalProgress = Object.freeze({
  status: "idle" as const,
  total: 0,
  processed: 0,
  synced: 0,
  skipped: 0,
  failed: 0,
  ratePerMin: HISTORICAL_RATE_LIMIT_PER_MIN,
});

type ByScope = Record<string, HistoricalProgress>;

const EMPTY_MAP: ByScope = Object.freeze({});

let state: ByScope = EMPTY_MAP;
const listeners = new Set<() => void>();
/** Cancellation flags, keyed by scope — not in the published state so a flip
 *  doesn't itself trigger a render. */
const cancelled = new Set<string>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(scope: QuickBooksScope, patch: Partial<HistoricalProgress>) {
  const key = scopeKey(scope);
  const current = state[key] ?? EMPTY;
  state = { ...state, [key]: { ...current, ...patch } };
  emit();
}

export function getHistoricalProgress(
  scope: QuickBooksScope,
): HistoricalProgress {
  return state[scopeKey(scope)] ?? EMPTY;
}

export function useHistoricalProgress(
  scope: QuickBooksScope,
): HistoricalProgress {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? EMPTY,
    () => EMPTY,
  );
}

/** True while a run is in flight, so the UI can disable "Start" and the range
 *  picker without owning that state itself. */
export function isHistoricalRunActive(scope: QuickBooksScope): boolean {
  const s = getHistoricalProgress(scope).status;
  return s === "running" || s === "cancelling";
}

export function cancelHistoricalSync(scope: QuickBooksScope): void {
  if (!isHistoricalRunActive(scope)) return;
  cancelled.add(scopeKey(scope));
  write(scope, { status: "cancelling" });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RunHistoricalOptions {
  /** Force outcomes instead of the seam's own behaviour — for tests. */
  simulate?: "success" | "failure";
  /** Override the per-batch pause (0 in tests, so they don't wait). */
  batchDelayMs?: number;
  /** Inject transactions instead of reading the mock — for tests. */
  transactions?: Transaction[];
  batchSize?: number;
}

/**
 * Back-fill a date range.
 *
 * Enqueues every completed sale in range (deduped by the idempotency key), then
 * posts them in rate-limited batches, publishing progress as it goes. Never
 * throws: a historical run is bookkeeping, and one bad row must not abort the
 * rest — it's counted as failed and the run continues.
 */
export async function runHistoricalSync(
  scope: QuickBooksScope,
  range: HistoricalRange,
  options: RunHistoricalOptions = {},
): Promise<HistoricalProgress> {
  const key = scopeKey(scope);
  const batchSize = options.batchSize ?? HISTORICAL_BATCH_SIZE;
  const batchDelayMs = options.batchDelayMs ?? SIMULATED_BATCH_DELAY_MS;

  const txns = historicalTransactions(
    range,
    options.transactions ?? getAllTransactions(),
  );

  cancelled.delete(key);
  write(scope, {
    status: "running",
    range,
    total: txns.length,
    processed: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
    ratePerMin: HISTORICAL_RATE_LIMIT_PER_MIN,
    pausedReason: undefined,
    startedAt: new Date().toISOString(),
    finishedAt: undefined,
  });

  if (txns.length === 0) {
    write(scope, { status: "done", finishedAt: new Date().toISOString() });
    return getHistoricalProgress(scope);
  }

  let processed = 0;
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < txns.length; i += batchSize) {
    if (cancelled.has(key)) {
      write(scope, {
        status: "cancelled",
        finishedAt: new Date().toISOString(),
      });
      return getHistoricalProgress(scope);
    }

    // 7D: an expired/unreachable connection pauses the run rather than burning
    // the whole backlog against a connection that can't answer.
    const connection = getQuickBooksConnection(scope);
    if (connection.status !== "connected") {
      write(scope, {
        status: "paused",
        pausedReason:
          connection.status === "expired"
            ? "Your QuickBooks connection expired mid-run. Reconnect and start again — everything already synced is skipped."
            : "QuickBooks became unreachable mid-run. Try again — everything already synced is skipped.",
        finishedAt: new Date().toISOString(),
      });
      return getHistoricalProgress(scope);
    }

    const batch = txns.slice(i, i + batchSize);
    for (const txn of batch) {
      // Idempotency (4.1): if this sale already has a QuickBooks document, it is
      // a skip, not a re-post. Checked before enqueuing so a re-run over an
      // already-synced range does no work and creates no duplicate.
      const already = existingDocumentFor(
        scope,
        idempotencyKeyFor(txn.id, "sales_receipt"),
      );
      if (already) {
        skipped += 1;
        processed += 1;
        continue;
      }

      const outcome = syncCheckoutToQuickBooks(scope, txn);
      if (!outcome.job) {
        // Skipped by the checkout guard (not connected / setup incomplete /
        // routed to an invoice with no location, etc.) — not this run's failure.
        skipped += 1;
        processed += 1;
        continue;
      }

      const result = await attemptJob(scope, outcome.job.id, {
        simulate: options.simulate,
        latencyMs: 0,
      });
      if (result?.status === "synced") synced += 1;
      else failed += 1;
      processed += 1;
    }

    write(scope, { processed, synced, skipped, failed });

    // Honour the rate limit between batches. Skipped when the delay is 0 (tests)
    // and pointless on the final batch.
    if (batchDelayMs > 0 && i + batchSize < txns.length) {
      await delay(batchDelayMs);
    }
  }

  write(scope, { status: "done", finishedAt: new Date().toISOString() });
  return getHistoricalProgress(scope);
}

/** Clear a finished run's progress so the panel returns to its resting state. */
export function dismissHistoricalRun(scope: QuickBooksScope): void {
  const key = scopeKey(scope);
  if (isHistoricalRunActive(scope)) return;
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  state = next;
  emit();
}
