"use client";

import { useSyncExternalStore } from "react";

// ============================================================================
// QuickBooks Online connection state (Phase 1.1).
//
// Mirrors the store pattern in src/lib/integrations-store.ts — useSyncExternal
// Store + localStorage + BroadcastChannel — but is a separate, facility-owned
// feature: the platform integrations registry under
// src/app/dashboard/system-admin/integrations is super-admin ops and must not
// be reused here.
//
// Connections are keyed by facility AND location. A facility on one QuickBooks
// company across sites uses a single facility-level scope; a facility running a
// company per location (Section 6B) gets one connection — and one token set —
// per location, so one location's expiry pauses only that location's sync.
//
// TODO: real QuickBooks Online API (OAuth2 + Accounting API) — tokens must move
// to server-side storage. Nothing here is a real credential; see oauth-mock.ts.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-connection";
const CHANNEL = "yipyy-quickbooks-connection";

export type QuickBooksConnectionStatus =
  | "disconnected"
  | "connected"
  /** The refresh token is past its 100-day life — 7D "Reconnect" banner. */
  | "expired"
  /** QuickBooks is unreachable. Distinct from expired: syncing pauses, but
   *  nothing needs the facility to re-authorise. */
  | "outage";

export interface QuickBooksConnection {
  connected: boolean;
  companyName?: string;
  /** ISO 3166-1 alpha-2, e.g. "CA" — drives tax/locale expectations. */
  companyCountry?: string;
  /** ISO 4217, e.g. "CAD". A currency mismatch with Yipyy is a setup warning. */
  companyCurrency?: string;
  /** Intuit's company id. Mock value in this prototype. */
  realmId?: string;
  /** Mock token. Never a real credential, and never sent anywhere. */
  accessToken?: string;
  /** Mock token. Never a real credential, and never sent anywhere. */
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  lastSyncAt?: string;
  status: QuickBooksConnectionStatus;
}

/** Which QuickBooks connection a screen is acting on. */
export interface QuickBooksScope {
  facilityId: string;
  /** Omitted for a facility-wide connection (one QuickBooks company for every
   *  location). Set when the facility runs a company per location. */
  locationId?: string;
}

/** Shared frozen value for "no connection yet".
 *
 *  Returning one stable reference matters: useSyncExternalStore compares
 *  snapshots by identity, so handing back a fresh object for an unconnected
 *  scope would re-render forever. */
export const DISCONNECTED: QuickBooksConnection = Object.freeze({
  connected: false,
  status: "disconnected" as const,
});

type ConnectionMap = Record<string, QuickBooksConnection>;

const EMPTY: ConnectionMap = Object.freeze({});

let state: ConnectionMap = EMPTY;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

export function scopeKey(scope: QuickBooksScope): string {
  return scope.locationId
    ? `${scope.facilityId}:${scope.locationId}`
    : scope.facilityId;
}

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
    if (raw) state = JSON.parse(raw) as ConnectionMap;
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

function commit(next: ConnectionMap) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

// ── Reads ───────────────────────────────────────────────────────────────────

/** Non-hook read, for the OAuth/token helpers and anything outside React. */
export function getQuickBooksConnection(
  scope: QuickBooksScope,
): QuickBooksConnection {
  ensureReady();
  return state[scopeKey(scope)] ?? DISCONNECTED;
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getMapSnapshot(): ConnectionMap {
  return state;
}

function getServerMapSnapshot(): ConnectionMap {
  return EMPTY;
}

/** The connection for one facility (or one of its locations). */
export function useQuickBooksConnection(
  scope: QuickBooksScope,
): QuickBooksConnection {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? DISCONNECTED,
    () => DISCONNECTED,
  );
}

/** Every connection, keyed by scope — for the HQ view, which lists one card
 *  per location (Section 6B). */
export function useQuickBooksConnections(): ConnectionMap {
  return useSyncExternalStore(subscribe, getMapSnapshot, getServerMapSnapshot);
}

// ── Writes ──────────────────────────────────────────────────────────────────

/** Replace a scope's connection outright (used by the mock OAuth flow). */
export function setQuickBooksConnection(
  scope: QuickBooksScope,
  connection: QuickBooksConnection,
): QuickBooksConnection {
  ensureReady();
  commit({ ...state, [scopeKey(scope)]: connection });
  return connection;
}

/** Merge a partial update into a scope's connection. */
export function patchQuickBooksConnection(
  scope: QuickBooksScope,
  patch: Partial<QuickBooksConnection>,
): QuickBooksConnection {
  ensureReady();
  const key = scopeKey(scope);
  const next: QuickBooksConnection = {
    ...(state[key] ?? DISCONNECTED),
    ...patch,
  };
  commit({ ...state, [key]: next });
  return next;
}

/** Move a connection between lifecycle states (expired, outage, recovered). */
export function setQuickBooksStatus(
  scope: QuickBooksScope,
  status: QuickBooksConnectionStatus,
): QuickBooksConnection {
  return patchQuickBooksConnection(scope, {
    status,
    // "connected" is the only status that means syncing can run; the flag and
    // the status must never disagree.
    connected: status === "connected",
  });
}

/** Stamp a successful sync run. */
export function recordQuickBooksSync(
  scope: QuickBooksScope,
  at: string = new Date().toISOString(),
): QuickBooksConnection {
  return patchQuickBooksConnection(scope, { lastSyncAt: at });
}

/** Forget a scope's connection entirely — tokens included. */
export function removeQuickBooksConnection(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}
