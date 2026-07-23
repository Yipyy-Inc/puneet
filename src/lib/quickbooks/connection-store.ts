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
  /** Which Intuit environment this connection points at (Phase 10). "sandbox"
   *  is Test mode: a throwaway company for rehearsing the mapping before going
   *  live. Absent is treated as "production" so existing connections are
   *  unaffected. */
  environment?: QuickBooksEnvironment;
}

/** Intuit runs two entirely separate stacks — a sandbox company for testing and
 *  the real one. They have different base URLs and different realms; a token for
 *  one is meaningless against the other. */
export type QuickBooksEnvironment = "production" | "sandbox";

/** The disconnect confirmation, kept here so no screen paraphrases it into a
 *  promise Yipyy can't keep — disconnecting stops syncing, it does not reach
 *  into the facility's books. */
export const QUICKBOOKS_DISCONNECT_CONFIRMATION =
  "Disconnecting will stop all future syncs. Existing entries in QuickBooks will not be deleted.";

/** The 7D expiry banner (dashboard + anywhere syncing is surfaced). */
export const QUICKBOOKS_EXPIRED_BANNER =
  "Your QuickBooks connection has expired. Reconnect to resume syncing.";

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

/**
 * Disconnect QuickBooks for a scope. The UI confirms first with
 * QUICKBOOKS_DISCONNECT_CONFIRMATION.
 *
 * Tokens are dropped, but the company reference and `lastSyncAt` are kept:
 *  • `realmId` lets a later reconnect tell whether the facility came back to
 *    the SAME QuickBooks company — mappings are only safe to keep if it did.
 *  • `lastSyncAt` is a fact that happened; clearing it would make the dashboard
 *    read as though the facility had never synced.
 * Service→account mappings live in their own store and are deliberately
 * untouched here, so disconnecting and reconnecting doesn't cost the facility
 * its setup work.
 *
 * TODO: real QuickBooks OAuth 2.0 (Intuit) — also POST the refresh token to the
 * revocation endpoint server-side; dropping it locally is not a revoke.
 */
export function disconnectQuickBooks(
  scope: QuickBooksScope,
): QuickBooksConnection {
  ensureReady();
  const key = scopeKey(scope);
  const current = state[key];
  if (!current) return DISCONNECTED;

  const next: QuickBooksConnection = {
    connected: false,
    status: "disconnected",
    realmId: current.realmId,
    companyName: current.companyName,
    companyCountry: current.companyCountry,
    companyCurrency: current.companyCurrency,
    lastSyncAt: current.lastSyncAt,
  };
  commit({ ...state, [key]: next });
  return next;
}

/**
 * Force the refresh token past its life so the 7D "connection expired" banner
 * can be demonstrated without waiting 100 days.
 *
 * This is a demo affordance, not a code path a real facility reaches — real
 * expiry arrives on its own and is detected by isRefreshTokenExpired().
 */
export function expireQuickBooksRefreshToken(
  scope: QuickBooksScope,
): QuickBooksConnection {
  ensureReady();
  const key = scopeKey(scope);
  const current = state[key];
  if (!current?.connected) return current ?? DISCONNECTED;

  const past = new Date(Date.now() - 60_000).toISOString();
  const next: QuickBooksConnection = {
    ...current,
    connected: false,
    status: "expired",
    // Both tokens are dead once the refresh token is: there is nothing left to
    // renew with, which is exactly why only a reconnect clears this state.
    accessTokenExpiresAt: past,
    refreshTokenExpiresAt: past,
  };
  commit({ ...state, [key]: next });
  return next;
}

// ── Sync gating (7D) ────────────────────────────────────────────────────────

export type QuickBooksPauseReason = "expired" | "outage" | "disconnected";

/** The reason as a sentence. The code is for logic; this is for people, and
 *  rendering the code was leaving "expired" in the middle of a paragraph. */
export const PAUSE_REASON_TEXT: Record<QuickBooksPauseReason, string> = {
  expired: "This location's QuickBooks connection has expired.",
  outage: "QuickBooks is unreachable for this location.",
  disconnected: "This location isn't connected to QuickBooks.",
};

/**
 * Whether queued sync jobs should HOLD rather than fail.
 *
 * 7D is explicit that an expired connection pauses the queue — the Yipyy
 * payment already succeeded, and failing its sync would turn a re-authorisation
 * chore into a pile of false errors. The sync engine calls this before draining
 * the queue; jobs stay pending and drain once the facility reconnects.
 */
export function isQuickBooksSyncPaused(
  connection: QuickBooksConnection,
): boolean {
  return connection.status !== "connected";
}

/** Why the queue is holding, for the banner the dashboard shows above it. */
export function quickBooksSyncPauseReason(
  connection: QuickBooksConnection,
): QuickBooksPauseReason | null {
  switch (connection.status) {
    case "connected":
      return null;
    case "expired":
      return "expired";
    case "outage":
      return "outage";
    case "disconnected":
      return "disconnected";
  }
}

// Reconnect lives in ./oauth-mock (reconnectQuickBooks) — it re-runs the OAuth
// flow, and importing that here would make this store depend on the module that
// already depends on it.
