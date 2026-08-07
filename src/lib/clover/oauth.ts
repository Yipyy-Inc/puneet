import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { cloverConfig, cloverReturnUrl } from "./config";

// ============================================================================
// The OAuth v2 exchange, and the state that makes it safe.
//
// ── WHAT THE STATE IS ACTUALLY DEFENDING AGAINST ──────────────────────────
//
// Clover returns the merchant to ONE registered Site URL for every facility on
// the platform. So the return has to say which facility was connecting, and
// that value arrives through the browser of whoever is being redirected.
//
// If the facility were simply a query parameter, an attacker would start the
// flow, approve their own Clover merchant, and hand back a facility id that is
// not theirs — attaching their merchant account to somebody else's business.
// Every subsequent payment that business takes would settle into the
// attacker's bank account, and every screen would look completely normal.
//
// So the facility travels inside a value we signed, with a nonce and an expiry.
// An attacker can replay their own state (which connects their own facility, to
// no effect) but cannot mint one naming a facility they do not control.
//
// ── SIGNED, NOT STORED ────────────────────────────────────────────────────
//
// A row in a table would do the same job and would also need a cleanup job, a
// unique index, and a decision about what happens when a merchant takes eleven
// minutes to approve. An HMAC needs none of those and is tamper-evident by
// construction.
//
// The App Secret signs it. That is defensible — it is a server-only value of
// exactly the right sensitivity, it is guaranteed present whenever this code
// runs at all, and if it leaks the state signature is far from the worst of
// the problem.
//
// ── TEN MINUTES ───────────────────────────────────────────────────────────
//
// Long enough for a merchant to read a consent screen, find their password and
// approve. Short enough that a state captured from a browser history or a
// referrer header is dead by the time anyone goes looking.
// ============================================================================

const STATE_TTL_MS = 10 * 60 * 1000;

interface StatePayload {
  /** The facility being connected. Never read from the query string. */
  f: string;
  /** Nonce, so two connects in the same millisecond differ. */
  n: string;
  /** Expiry, epoch milliseconds. */
  e: number;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createOAuthState(facilityId: string): string | null {
  const config = cloverConfig();
  if (!config) return null;

  const payload: StatePayload = {
    f: facilityId,
    n: randomBytes(9).toString("base64url"),
    e: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, config.appSecret)}`;
}

export type StateFailure = "malformed" | "bad-signature" | "expired";

/** The facility this state was minted for, or why it cannot be trusted. */
export function readOAuthState(
  state: string | null | undefined,
): { facilityId: string } | { error: StateFailure } {
  const config = cloverConfig();
  if (!config || !state) return { error: "malformed" };

  const [body, signature] = state.split(".");
  if (!body || !signature) return { error: "malformed" };

  const expected = sign(body, config.appSecret);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);

  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and a thrown exception is itself a timing signal.
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return { error: "bad-signature" };
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as StatePayload;
  } catch {
    return { error: "malformed" };
  }

  if (!payload.f || typeof payload.e !== "number")
    return { error: "malformed" };
  if (Date.now() > payload.e) return { error: "expired" };

  return { facilityId: payload.f };
}

// ── The redirect ───────────────────────────────────────────────────────────

export function authorizeUrl(state: string): string | null {
  const config = cloverConfig();
  if (!config) return null;

  const url = new URL("/oauth/v2/authorize", config.authorizeOrigin);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  // Sent even though Clover returns to the registered Site URL regardless: if
  // it is honoured we get environment-specific returns for free, and if it is
  // ignored nothing breaks. What must NOT happen is relying on it.
  url.searchParams.set("redirect_uri", cloverReturnUrl());
  return url.toString();
}

// ── The exchange ───────────────────────────────────────────────────────────

export interface CloverTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Absolute, derived from Clover's seconds-from-now. */
  accessExpiresAt: string | null;
  refreshExpiresAt: string | null;
}

/**
 * An ABSOLUTE epoch, in seconds. What `*_token_expiration` actually contains.
 *
 * This was first written to sniff absolute-versus-relative by magnitude, with
 * the boundary at 10^10 seconds. That is backwards: 10^10 is the year 2286, so
 * EVERY epoch for the next two and a half centuries falls below it and was
 * treated as a duration. The first real connection stored an expiry of
 * 2083-03-14 — Clover's ten-day epoch, added to today.
 *
 * A wrong expiry here is not cosmetic. Too far out and the refresh never runs,
 * so the token quietly dies and every payment at that facility starts failing
 * with a 401 that nothing anticipated.
 *
 * The fix is to stop guessing. Clover names the two shapes differently and the
 * caller knows which it has, so the field decides, not the magnitude. The range
 * check that remains is a sanity guard, not a classifier: it rejects a value
 * that cannot be a plausible expiry at all.
 */
function fromEpochSeconds(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const ms = value * 1000;
  // Anything in the past, or more than ten years out, is not an expiry we
  // should act on — record nothing rather than a number that would silently
  // disable refreshing.
  const now = Date.now();
  if (ms <= now || ms > now + 10 * 365 * 24 * 60 * 60 * 1000) return null;
  return new Date(ms).toISOString();
}

/** A RELATIVE lifetime, in seconds. What `expires_in` contains. */
function fromDurationSeconds(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(Date.now() + value * 1000).toISOString();
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  access_token_expiration?: number;
  refresh_token_expiration?: number;
  expires_in?: number;
  message?: string;
  error?: string;
}

async function postToken(
  path: string,
  body: Record<string, string>,
): Promise<CloverTokens> {
  const config = cloverConfig();
  if (!config) throw new Error("Clover is not configured.");

  const response = await fetch(new URL(path, config.apiOrigin), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    // A merchant is waiting on a redirect; a hung socket must not hold the
    // request open until the platform's own timeout.
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as TokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    // Never include the body verbatim: a token response that partially
    // succeeded can carry a live credential, and this string ends up in
    // payment_connections.last_error where a facility can read it.
    throw new Error(
      `Clover refused the token exchange (HTTP ${response.status})${
        payload?.message ? `: ${payload.message}` : ""
      }`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    // By field, not by magnitude: `*_expiration` is an epoch, `expires_in` is
    // a lifetime, and Clover sends whichever the endpoint uses.
    accessExpiresAt:
      fromEpochSeconds(payload.access_token_expiration) ??
      fromDurationSeconds(payload.expires_in),
    refreshExpiresAt: fromEpochSeconds(payload.refresh_token_expiration),
  };
}

/** Trade the one-time code from the redirect for a token pair. */
export async function exchangeCode(code: string): Promise<CloverTokens> {
  const config = cloverConfig();
  if (!config) throw new Error("Clover is not configured.");

  return postToken("/oauth/v2/token", {
    client_id: config.appId,
    client_secret: config.appSecret,
    code,
  });
}

/** Swap a refresh token for a fresh pair. Repairs a connection in error. */
export async function refreshTokens(
  refreshToken: string,
): Promise<CloverTokens> {
  const config = cloverConfig();
  if (!config) throw new Error("Clover is not configured.");

  return postToken("/oauth/v2/refresh", {
    client_id: config.appId,
    refresh_token: refreshToken,
  });
}
