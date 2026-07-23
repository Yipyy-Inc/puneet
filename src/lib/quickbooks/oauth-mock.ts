"use client";

import { getLocationById } from "@/data/locations";

import { SANDBOX_COMPANY_NAME, SANDBOX_REALM_ID } from "./environments";

import {
  getQuickBooksConnection,
  patchQuickBooksConnection,
  setQuickBooksConnection,
  setQuickBooksStatus,
  QUICKBOOKS_EXPIRED_BANNER,
  type QuickBooksConnection,
  type QuickBooksScope,
} from "./connection-store";

// ============================================================================
// Simulated QuickBooks Online OAuth (Phase 1.1).
//
// There is no backend here, so this models the shape of the real flow rather
// than performing it: no redirect, no network call, no real credential. The
// consent screen is an in-app modal (Part 3.2) that calls connectQuickBooks()
// on "Connect" and cancelQuickBooksConnect() on dismiss.
//
// TODO: real QuickBooks OAuth 2.0 (Intuit) redirect + server-side token
// exchange — the browser should never hold these tokens. Replace
// connectQuickBooks with a redirect to Intuit's authorization endpoint and a
// server route that exchanges the code, persists the tokens, and returns only
// the company profile to the client.
// ============================================================================

/** Intuit's real access-token lifetime. */
const ACCESS_TOKEN_TTL_MINUTES = 60;
/** Intuit's real refresh-token lifetime, measured from first issue. */
const REFRESH_TOKEN_TTL_DAYS = 100;
/** Refresh this far before expiry rather than waiting for a 401. */
const PROACTIVE_REFRESH_SKEW_MINUTES = 5;

/** What the consent screen tells the facility Yipyy will do with their books.
 *  Mirrors the real `com.intuit.quickbooks.accounting` scope. */
export const QUICKBOOKS_CONSENT = {
  reads: [
    "Your customer list",
    "Your chart of accounts",
    "Your products and services",
    "Your tax codes",
  ],
  writes: ["Sales receipts", "Invoices", "Refund receipts", "Credit memos"],
} as const;

export interface QuickBooksConsentCompany {
  name: string;
  country: string;
  currency: string;
  realmId: string;
}

const MOCK_COMPANY: QuickBooksConsentCompany = {
  name: "Yipyy Pet Services Inc.",
  country: "CA",
  currency: "CAD",
  realmId: "9341452093216780",
};

/**
 * The company the consent screen names before the facility approves anything.
 *
 * Intuit renders that screen itself and already knows which company the user
 * is signed in to, so the simulated one has to know it too — otherwise it
 * would have to ask "do you approve?" without saying what it is approving.
 *
 * A facility running a company PER LOCATION authorises a genuinely different
 * company each time, so the scope's location is folded into the realm id and
 * the name. Returning one realm for every branch would model three connections
 * to the SAME books, which is the exact mistake this mode exists to avoid — and
 * it would make the per-location isolation impossible to see.
 */
export function getQuickBooksConsentCompany(
  scope?: QuickBooksScope,
): Readonly<QuickBooksConsentCompany> {
  if (!scope?.locationId) return MOCK_COMPANY;

  const location = getLocationById(scope.locationId);
  const suffix = location?.shortCode ?? scope.locationId.toUpperCase();
  return {
    ...MOCK_COMPANY,
    name: `${MOCK_COMPANY.name} — ${location?.city ?? suffix}`,
    // Deterministic per location: reconnecting the same branch must land on the
    // same realm, or the "you connected a different company" guard would fire
    // on every reconnect.
    realmId: `${MOCK_COMPANY.realmId.slice(0, 12)}${hashSuffix(scope.locationId)}`,
  };
}

/** Four stable digits from a location id, so each branch reads as its own
 *  QuickBooks company without the ids colliding. */
function hashSuffix(locationId: string): string {
  let h = 0;
  for (const ch of locationId) h = (h * 31 + ch.charCodeAt(0)) % 10000;
  return String(h).padStart(4, "0");
}

// ── Results ─────────────────────────────────────────────────────────────────

/** Why a connection attempt did not produce tokens. Every one of these is
 *  recoverable by trying again, which is what the entry point's "Try again"
 *  state exists for — a failed connect never leaves a half-connected scope. */
export type QuickBooksConnectFailure =
  /** The facility closed the consent screen. */
  | "cancelled"
  /** The facility pressed Deny on the consent screen. */
  | "consent_denied"
  /** Intuit was unreachable. */
  | "network"
  /** Intuit rejected the authorization code. */
  | "invalid_grant";

export type QuickBooksConnectResult =
  | { ok: true; connection: QuickBooksConnection }
  | {
      ok: false;
      failure: QuickBooksConnectFailure;
      message: string;
      /** Always true today; kept explicit so the UI never has to infer it. */
      retryable: boolean;
    };

export type QuickBooksRefreshFailure =
  | "not_connected"
  /** Past 100 days — only a full reconnect fixes this (7D). */
  | "refresh_token_expired"
  | "network";

export type QuickBooksRefreshResult =
  | { ok: true; connection: QuickBooksConnection }
  | { ok: false; failure: QuickBooksRefreshFailure; message: string };

const CONNECT_FAILURE_MESSAGE: Record<QuickBooksConnectFailure, string> = {
  cancelled: "Connection cancelled. Nothing was changed in QuickBooks.",
  consent_denied:
    "Yipyy wasn't granted access to your QuickBooks company. Try again and choose Connect to continue.",
  network:
    "Couldn't reach QuickBooks. Check your connection and try again — nothing was changed.",
  invalid_grant:
    "QuickBooks didn't accept the authorisation. Try connecting again.",
};

// ── Mock token minting ──────────────────────────────────────────────────────

let tokenCounter = 0;

function mockToken(prefix: string): string {
  tokenCounter += 1;
  const noise = Math.random().toString(36).slice(2, 10);
  return `${prefix}.mock.${tokenCounter}.${noise}`;
}

function plusMinutes(from: Date, minutes: number): string {
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}

function plusDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ── Connect ─────────────────────────────────────────────────────────────────

export interface ConnectQuickBooksOptions {
  /** Force an outcome. The default is success: a demo that failed at random
   *  would be untrustworthy, so failure paths are opt-in and the setup screens
   *  drive them explicitly to show the "Try again" state. */
  simulate?: "success" | QuickBooksConnectFailure;
  /** Stand-in for the redirect + token-exchange round trip. */
  latencyMs?: number;
  /** Fixed clock, for deterministic checks. */
  now?: Date;
}

/**
 * Complete the simulated consent flow and store the resulting connection.
 *
 * Called by the mock consent modal's "Connect" button. On success the scope
 * holds a company profile and a token pair; on failure the store is untouched,
 * so a cancelled or failed attempt can never leave a scope half-connected.
 */
export async function connectQuickBooks(
  scope: QuickBooksScope,
  options: ConnectQuickBooksOptions = {},
): Promise<QuickBooksConnectResult> {
  const { simulate = "success", latencyMs = 900, now = new Date() } = options;

  if (latencyMs > 0) await delay(latencyMs);

  if (simulate !== "success") {
    return {
      ok: false,
      failure: simulate,
      message: CONNECT_FAILURE_MESSAGE[simulate],
      retryable: true,
    };
  }

  // A scope that chose Test mode before connecting keeps it: the consent screen
  // in production is the sandbox one, and the company it authorises is the
  // sandbox company.
  const environment =
    getQuickBooksConnection(scope).environment ?? "production";
  const company = getQuickBooksConsentCompany(scope);
  const sandbox = environment === "sandbox";
  const connection: QuickBooksConnection = {
    connected: true,
    status: "connected",
    environment,
    companyName: sandbox ? SANDBOX_COMPANY_NAME : company.name,
    companyCountry: company.country,
    companyCurrency: company.currency,
    realmId: sandbox ? SANDBOX_REALM_ID : company.realmId,
    accessToken: mockToken("qb-access"),
    refreshToken: mockToken("qb-refresh"),
    accessTokenExpiresAt: plusMinutes(now, ACCESS_TOKEN_TTL_MINUTES),
    refreshTokenExpiresAt: plusDays(now, REFRESH_TOKEN_TTL_DAYS),
    // Survives a reconnect: re-authorising after an expiry doesn't undo the
    // syncing that already happened, and the dashboard's "last synced" would
    // otherwise read as though the facility had never synced at all.
    lastSyncAt: getQuickBooksConnection(scope).lastSyncAt,
  };

  setQuickBooksConnection(scope, connection);
  return { ok: true, connection };
}

export type QuickBooksReconnectResult =
  | {
      ok: true;
      connection: QuickBooksConnection;
      /** The facility authorised a DIFFERENT QuickBooks company than before.
       *  Their service→account mappings point at the old company's accounts and
       *  items, so the UI must warn and send them back through mapping rather
       *  than silently syncing into the wrong books. */
      companyChanged: boolean;
    }
  | {
      ok: false;
      failure: QuickBooksConnectFailure;
      message: string;
      retryable: boolean;
    };

/**
 * Re-authorise a scope after an expiry or a disconnect.
 *
 * Distinct from connectQuickBooks in one way that matters: mappings and sync
 * history are kept, so a facility that reconnects doesn't redo its setup. The
 * mappings themselves live in their own store and are never touched here — what
 * this adds is the check that keeping them is *safe*, by comparing the realm id
 * of the company that came back against the one that was mapped.
 */
export async function reconnectQuickBooks(
  scope: QuickBooksScope,
  options: ConnectQuickBooksOptions = {},
): Promise<QuickBooksReconnectResult> {
  const previousRealmId = getQuickBooksConnection(scope).realmId;
  const result = await connectQuickBooks(scope, options);
  if (!result.ok) return result;
  return {
    ok: true,
    connection: result.connection,
    companyChanged: Boolean(
      previousRealmId && previousRealmId !== result.connection.realmId,
    ),
  };
}

/** The failure half of QuickBooksConnectResult. */
export type QuickBooksConnectFailureResult = Extract<
  QuickBooksConnectResult,
  { ok: false }
>;

/** Dismissing the consent screen. Pure — the store is never touched.
 *
 *  Typed as the failure variant rather than the full union: cancelling never
 *  produces a connection, and saying so spares every caller a narrowing check
 *  for a branch that cannot happen. */
export function cancelQuickBooksConnect(): QuickBooksConnectFailureResult {
  return {
    ok: false,
    failure: "cancelled",
    message: CONNECT_FAILURE_MESSAGE.cancelled,
    retryable: true,
  };
}

// ── Token lifecycle ─────────────────────────────────────────────────────────

function isPast(iso: string | undefined, now: Date): boolean {
  // No expiry recorded means nothing was ever issued — treat as expired rather
  // than as "valid forever", so a malformed record fails closed.
  if (!iso) return true;
  const at = Date.parse(iso);
  return Number.isNaN(at) || at <= now.getTime();
}

/** Whether the 60-minute access token has lapsed. */
export function isAccessTokenExpired(
  connection: QuickBooksConnection,
  now: Date = new Date(),
): boolean {
  if (!connection.connected) return true;
  return isPast(connection.accessTokenExpiresAt, now);
}

/** Whether the 100-day refresh token has lapsed. Once this is true only a full
 *  reconnect restores syncing — this is what raises the 7D banner. */
export function isRefreshTokenExpired(
  connection: QuickBooksConnection,
  now: Date = new Date(),
): boolean {
  if (!connection.refreshTokenExpiresAt) return !connection.connected;
  return isPast(connection.refreshTokenExpiresAt, now);
}

/** Whether the access token is expired or close enough that it should be
 *  renewed now rather than mid-sync. */
export function shouldRefreshAccessToken(
  connection: QuickBooksConnection,
  now: Date = new Date(),
): boolean {
  if (!connection.connected) return false;
  if (isRefreshTokenExpired(connection, now)) return false;
  const skewed = new Date(
    now.getTime() + PROACTIVE_REFRESH_SKEW_MINUTES * 60_000,
  );
  return isPast(connection.accessTokenExpiresAt, skewed);
}

export interface RefreshAccessTokenOptions {
  simulate?: "success" | "network";
  now?: Date;
}

/**
 * Exchange the refresh token for a new access token.
 *
 * Mirrors Intuit's behaviour in two ways worth keeping: the refresh token is
 * rotated on every use, and its expiry is NOT extended — the 100-day clock runs
 * from first issue, which is exactly why a quiet facility eventually has to
 * reconnect.
 */
export function refreshAccessToken(
  scope: QuickBooksScope,
  options: RefreshAccessTokenOptions = {},
): QuickBooksRefreshResult {
  const { simulate = "success", now = new Date() } = options;
  const connection = getQuickBooksConnection(scope);

  // Order matters. An expired or interrupted connection still HAS a refresh
  // token and must be reported as such — reporting it as "not connected" would
  // hide the one state the 7D banner exists for. Only a scope that was never
  // connected, or was deliberately disconnected, is not_connected.
  if (connection.status === "disconnected" || !connection.refreshToken) {
    return {
      ok: false,
      failure: "not_connected",
      message: "QuickBooks isn't connected for this location.",
    };
  }

  if (isRefreshTokenExpired(connection, now)) {
    setQuickBooksStatus(scope, "expired");
    return {
      ok: false,
      failure: "refresh_token_expired",
      message: QUICKBOOKS_EXPIRED_BANNER,
    };
  }

  if (simulate === "network") {
    setQuickBooksStatus(scope, "outage");
    return {
      ok: false,
      failure: "network",
      message:
        "Couldn't reach QuickBooks. Syncing is paused until it responds.",
    };
  }

  const next = patchQuickBooksConnection(scope, {
    connected: true,
    status: "connected",
    accessToken: mockToken("qb-access"),
    accessTokenExpiresAt: plusMinutes(now, ACCESS_TOKEN_TTL_MINUTES),
    // Rotated, but the expiry stands.
    refreshToken: mockToken("qb-refresh"),
  });
  return { ok: true, connection: next };
}

/**
 * Refresh only if the access token is spent or nearly so.
 *
 * Returns null when nothing needed doing, so callers can tell "already fresh"
 * from "refreshed" and from "failed". Call this before a sync run rather than
 * reacting to a 401.
 */
export function ensureFreshAccessToken(
  scope: QuickBooksScope,
  options: RefreshAccessTokenOptions = {},
): QuickBooksRefreshResult | null {
  const now = options.now ?? new Date();
  const connection = getQuickBooksConnection(scope);

  if (isRefreshTokenExpired(connection, now)) {
    if (connection.status !== "expired") setQuickBooksStatus(scope, "expired");
    return {
      ok: false,
      failure: "refresh_token_expired",
      message: QUICKBOOKS_EXPIRED_BANNER,
    };
  }

  if (!shouldRefreshAccessToken(connection, now)) return null;
  return refreshAccessToken(scope, options);
}
