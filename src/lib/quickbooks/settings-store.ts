"use client";

import { useSyncExternalStore } from "react";

import { scopeKey, type QuickBooksScope } from "./connection-store";

// ============================================================================
// Table 3 — how the facility wants syncing to behave (Phase 3.5).
//
// Separate from the mappings store: mappings say WHERE money lands, these say
// WHEN and HOW it gets there. A facility changes these long after setup, from
// the dashboard, without touching a single mapping.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-settings";
const CHANNEL = "yipyy-quickbooks-settings";

/** Real-time is the default: a payment that reaches the books minutes later is
 *  what the integration is for. Batch and manual exist for facilities whose
 *  bookkeeper prefers to review before anything posts. */
export type SyncTrigger = "realtime" | "daily" | "manual";

/** Which QuickBooks document a sale becomes. "auto" follows the money: paid in
 *  full becomes a Sales Receipt, an outstanding balance becomes an Invoice. */
export type DocumentRule = "auto" | "always_sales_receipt" | "always_invoice";

/** Whose tax numbers win. Yipyy's are recommended because they are the amounts
 *  the client was actually charged — recalculating in QuickBooks can produce a
 *  total that doesn't match the receipt in the client's hand. */
export type TaxHandling = "yipyy" | "quickbooks";

export type RefundHandling = "auto" | "manual";

export interface QuickBooksSettings {
  syncTrigger: SyncTrigger;
  /** QuickBooks account payments are deposited to. */
  depositAccountId?: string;
  documentRule: DocumentRule;
  syncHistorical: boolean;
  historicalFrom?: string;
  historicalTo?: string;
  taxHandling: TaxHandling;
  refundHandling: RefundHandling;
  /** Where discount lines post. */
  discountAccountId?: string;
  /** Payment terms for invoices Yipyy creates (Table 10). */
  invoiceDueDays?: number;
  /** Where unspent customer credit sits as a liability. */
  storeCreditAccountId?: string;
  /** Where an uncollectable invoice is written off to. */
  badDebtAccountId?: string;
  /** The liability booking deposits are held in until checkout (5E). */
  depositsHeldAccountId?: string;
  /** Optional contra-revenue account for package-pass redemptions. Must be an
   *  income account — see documents/package.ts. */
  packageRedemptionAccountId?: string;
}

/** Net 15 — long enough to be payable, short enough that a facility notices an
 *  unpaid stay before the client's next visit. */
export const DEFAULT_INVOICE_DUE_DAYS = 15;

export const DEFAULT_SETTINGS: QuickBooksSettings = Object.freeze({
  syncTrigger: "realtime" as const,
  documentRule: "auto" as const,
  syncHistorical: false,
  invoiceDueDays: DEFAULT_INVOICE_DUE_DAYS,
  taxHandling: "yipyy" as const,
  // Refunds already happened in Yipyy; holding them back would leave the books
  // showing income the facility no longer has.
  refundHandling: "auto" as const,
});

type SettingsByScope = Record<string, QuickBooksSettings>;

const EMPTY_MAP: SettingsByScope = Object.freeze({});

let state: SettingsByScope = EMPTY_MAP;
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
    if (raw) state = JSON.parse(raw) as SettingsByScope;
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

function commit(next: SettingsByScope) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQuickBooksSettings(
  scope: QuickBooksScope,
): QuickBooksSettings {
  ensureReady();
  return state[scopeKey(scope)] ?? DEFAULT_SETTINGS;
}

export function useQuickBooksSettings(
  scope: QuickBooksScope,
): QuickBooksSettings {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? DEFAULT_SETTINGS,
    () => DEFAULT_SETTINGS,
  );
}

export function patchQuickBooksSettings(
  scope: QuickBooksScope,
  patch: Partial<QuickBooksSettings>,
): QuickBooksSettings {
  ensureReady();
  const key = scopeKey(scope);
  const next = { ...(state[key] ?? DEFAULT_SETTINGS), ...patch };
  commit({ ...state, [key]: next });
  return next;
}

export function resetQuickBooksSettings(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}

// ── Labels, kept beside the values they describe ────────────────────────────

export const SYNC_TRIGGER_LABEL: Record<SyncTrigger, string> = {
  realtime: "Real-time",
  daily: "Daily batch",
  manual: "Manual only",
};

/** A historical range this long is worth a warning: it can create thousands of
 *  documents in a live company, and undoing that is manual work in QuickBooks. */
export const LARGE_HISTORICAL_RANGE_DAYS = 90;

export function historicalRangeDays(settings: QuickBooksSettings): number {
  if (!settings.historicalFrom || !settings.historicalTo) return 0;
  const from = Date.parse(settings.historicalFrom);
  const to = Date.parse(settings.historicalTo);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.round((to - from) / 86_400_000);
}

export function isLargeHistoricalRange(settings: QuickBooksSettings): boolean {
  return (
    settings.syncHistorical &&
    historicalRangeDays(settings) > LARGE_HISTORICAL_RANGE_DAYS
  );
}
