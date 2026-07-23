"use client";

import { useSyncExternalStore } from "react";

import {
  QUICKBOOKS_MOCK_COMPANY,
  QUICKBOOKS_MOCK_COMPANY_MINIMAL,
} from "@/data/quickbooks-mock";
import type {
  QuickBooksAccount,
  QuickBooksAccountType,
  QuickBooksCompanyData,
  QuickBooksItem,
} from "@/types/quickbooks";

import {
  getQuickBooksConnection,
  scopeKey,
  type QuickBooksScope,
} from "./connection-store";

// ============================================================================
// Yipyy's cache of a QuickBooks company (Phase 2.1).
//
// The setup wizard reads the company once, right after connecting, and then
// works entirely from this cache: the account health check (3.3), the
// service→account mapping screen (3.4/3.5) and the sync settings dropdowns all
// read it rather than hitting QuickBooks per keystroke.
//
// Same store shape as connection-store: useSyncExternalStore + localStorage +
// BroadcastChannel, keyed by the same facility/location scope, so a facility
// running a QuickBooks company per location caches each one separately.
//
// TODO: real QuickBooks read APIs (Account, Item, Customer, TaxCode) — replace
// loadCompanyData() with four paged queries against the Accounting API. Nothing
// above this line changes: the cached shapes already match the real entities.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-data-cache";
const CHANNEL = "yipyy-quickbooks-data-cache";

export type QuickBooksCacheStatus = "empty" | "loading" | "ready" | "error";

/** Which canned company to read. Pre-wires the sandbox toggle (Phase 10) and,
 *  more immediately, lets the health check be demonstrated against books that
 *  are missing the optional accounts. */
export type QuickBooksDataVariant = "production" | "minimal";

export interface QuickBooksDataCacheEntry extends QuickBooksCompanyData {
  status: QuickBooksCacheStatus;
  /** ISO timestamp of the last completed read — the mapping UI shows this so a
   *  facility knows whether it is looking at stale accounts. */
  readAt?: string;
  variant: QuickBooksDataVariant;
  error?: string;
}

const EMPTY_ENTRY: QuickBooksDataCacheEntry = Object.freeze({
  status: "empty" as const,
  variant: "production" as const,
  accounts: Object.freeze([]) as unknown as QuickBooksAccount[],
  items: Object.freeze([]) as unknown as QuickBooksItem[],
  customers: [],
  taxCodes: [],
  taxRates: [],
  classes: [],
  // Nothing has been read yet, so the safest assumption is the plan with the
  // fewest features: never offer Class tracking on the strength of a guess.
  plan: "simple_start" as const,
});

type CacheMap = Record<string, QuickBooksDataCacheEntry>;

const EMPTY_MAP: CacheMap = Object.freeze({});

let state: CacheMap = EMPTY_MAP;
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
    if (raw) state = JSON.parse(raw) as CacheMap;
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

function commit(next: CacheMap) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function put(scope: QuickBooksScope, entry: QuickBooksDataCacheEntry) {
  ensureReady();
  commit({ ...state, [scopeKey(scope)]: entry });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Stands in for the four API queries. Returns a defensive copy so a caller
 *  mutating cached rows can never corrupt the canned source. */
function loadCompanyData(
  variant: QuickBooksDataVariant,
): QuickBooksCompanyData {
  const source =
    variant === "minimal"
      ? QUICKBOOKS_MOCK_COMPANY_MINIMAL
      : QUICKBOOKS_MOCK_COMPANY;
  return {
    accounts: source.accounts.map((a) => ({ ...a })),
    items: source.items.map((i) => ({ ...i })),
    customers: source.customers.map((c) => ({ ...c })),
    taxCodes: source.taxCodes.map((t) => ({ ...t })),
    taxRates: source.taxRates.map((r) => ({ ...r })),
    classes: source.classes.map((c) => ({ ...c })),
    plan: source.plan,
  };
}

// ── Reads ───────────────────────────────────────────────────────────────────

export function getQuickBooksData(
  scope: QuickBooksScope,
): QuickBooksDataCacheEntry {
  ensureReady();
  return state[scopeKey(scope)] ?? EMPTY_ENTRY;
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The cached QuickBooks company for one facility/location. */
export function useQuickBooksData(
  scope: QuickBooksScope,
): QuickBooksDataCacheEntry {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? EMPTY_ENTRY,
    () => EMPTY_ENTRY,
  );
}

// ── Reading from QuickBooks ─────────────────────────────────────────────────

export interface ReadQuickBooksDataOptions {
  variant?: QuickBooksDataVariant;
  /** Stands in for four API round trips. */
  latencyMs?: number;
  /** Force a failed read, so the wizard's retry path can be shown. */
  simulate?: "success" | "error";
}

export type QuickBooksReadResult =
  | { ok: true; data: QuickBooksDataCacheEntry }
  | { ok: false; message: string };

/**
 * Read the company into the cache. Call immediately after a successful connect,
 * and again from the health check's "Re-check".
 *
 * Requires a live connection: reading is guarded rather than assumed, so a
 * disconnected or expired scope can never end up with a cache that looks
 * freshly authoritative. That guard is also why this lives here and not inside
 * connectQuickBooks — a real implementation makes these separate API calls, and
 * keeping them separate keeps the OAuth seam replaceable on its own.
 */
export async function readQuickBooksData(
  scope: QuickBooksScope,
  options: ReadQuickBooksDataOptions = {},
): Promise<QuickBooksReadResult> {
  const {
    variant = "production",
    latencyMs = 700,
    simulate = "success",
  } = options;

  const connection = getQuickBooksConnection(scope);
  if (connection.status !== "connected") {
    const message =
      connection.status === "expired"
        ? "Your QuickBooks connection has expired. Reconnect to resume syncing."
        : "Connect QuickBooks before reading your chart of accounts.";
    put(scope, {
      ...getQuickBooksData(scope),
      status: "error",
      error: message,
    });
    return { ok: false, message };
  }

  // Keep whatever is already cached visible while the re-read runs — the
  // mapping screen must not blank out mid-edit.
  const previous = getQuickBooksData(scope);
  put(scope, { ...previous, status: "loading", error: undefined });

  if (latencyMs > 0) await delay(latencyMs);

  if (simulate === "error") {
    const message =
      "Couldn't read your QuickBooks company. Try again in a moment.";
    put(scope, { ...previous, status: "error", error: message });
    return { ok: false, message };
  }

  const entry: QuickBooksDataCacheEntry = {
    ...loadCompanyData(variant),
    status: "ready",
    readAt: new Date().toISOString(),
    variant,
  };
  put(scope, entry);
  return { ok: true, data: entry };
}

/** Re-read the company — the health check's "Re-check" and the mapping
 *  screen's refresh. Keeps the variant already in use. */
export function refresh(
  scope: QuickBooksScope,
  options: Omit<ReadQuickBooksDataOptions, "variant"> = {},
): Promise<QuickBooksReadResult> {
  return readQuickBooksData(scope, {
    ...options,
    variant: getQuickBooksData(scope).variant,
  });
}

/** Drop a scope's cache — on disconnect, so the next connect starts clean. */
export function clearQuickBooksData(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}

// ── The catch-all for unmapped items ────────────────────────────────────────

export const QUICKBOOKS_UNASSIGNED_INCOME = "Yipyy Unassigned Income";

/**
 * Ensure the catch-all income account exists, creating it if it doesn't.
 *
 * Anything the facility left unmapped posts here rather than being dropped or
 * blocking the sale — the money moved in Yipyy either way, and an unmapped
 * service must never be a reason a payment fails to reach the books. Every
 * transaction that lands here also raises a sync warning, so "unassigned" is
 * visible rather than a quiet dumping ground.
 *
 * Called on Finish Setup (3.5).
 *
 * TODO: real QuickBooks Account create (POST /v3/company/{realmId}/account).
 */
export function ensureUnassignedIncomeAccount(
  scope: QuickBooksScope,
): QuickBooksAccount {
  const entry = getQuickBooksData(scope);
  const existing = entry.accounts.find(
    (a) => a.Name === QUICKBOOKS_UNASSIGNED_INCOME,
  );
  if (existing) return existing;

  const account: QuickBooksAccount = {
    Id: "yipyy-unassigned",
    Name: QUICKBOOKS_UNASSIGNED_INCOME,
    FullyQualifiedName: QUICKBOOKS_UNASSIGNED_INCOME,
    AccountType: "Income",
    AccountSubType: "OtherPrimaryIncome",
    Classification: "Revenue",
    CurrentBalance: 0,
    Active: true,
    Description:
      "Created by Yipyy. Revenue from items that haven't been mapped to an account yet.",
  };
  put(scope, { ...entry, accounts: [...entry.accounts, account] });
  return account;
}

// ── Selectors for the mapping UI ────────────────────────────────────────────

/** Active accounts of a given type — what the mapping dropdowns and the health
 *  check both need. Inactive accounts are excluded: QuickBooks keeps them for
 *  history, but posting to one fails. */
export function findAccounts(
  data: QuickBooksCompanyData,
  filter: { type?: QuickBooksAccountType; subType?: string } = {},
): QuickBooksAccount[] {
  return data.accounts.filter(
    (a) =>
      a.Active &&
      (!filter.type || a.AccountType === filter.type) &&
      (!filter.subType || a.AccountSubType === filter.subType),
  );
}

/** Income accounts, for the service→account mapping step. */
export function incomeAccounts(
  data: QuickBooksCompanyData,
): QuickBooksAccount[] {
  return findAccounts(data, { type: "Income" });
}

/** Where a payment can be deposited (Table 3's "Payment deposit account"):
 *  bank accounts plus Undeposited Funds. */
export function depositAccounts(
  data: QuickBooksCompanyData,
): QuickBooksAccount[] {
  return data.accounts.filter(
    (a) =>
      a.Active &&
      (a.AccountType === "Bank" || a.AccountSubType === "UndepositedFunds"),
  );
}

/** Active products and services, for the item side of the mapping. */
export function activeItems(data: QuickBooksCompanyData): QuickBooksItem[] {
  return data.items.filter((i) => i.Active);
}
