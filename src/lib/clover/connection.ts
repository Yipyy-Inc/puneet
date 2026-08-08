import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { asCloverEnvironment, type CloverEnvironment } from "./config";
import { refreshTokens, type CloverTokens } from "./oauth";

// ============================================================================
// Recording a connection, and reading whether there is one.
//
// Two clients, and the split is the point.
//
//   the SERVICE ROLE writes.   store_payment_credentials and
//                              payment_access_token are granted to service_role
//                              alone (20260807700000). Nothing else can reach
//                              a merchant's tokens, including a signed-in
//                              platform admin.
//
//   the CALLER'S client reads. That is ./status.ts — a SEPARATE MODULE rather
//                              than a separate function, so this one never
//                              imports next/headers. Which is what lets it run
//                              outside a request, and is the only reason the
//                              first end-to-end charge could be proven at all.
//
// Splitting them also fixed a real bug. chargeCard read the connection through
// the caller's client, so a CUSTOMER paying online — who is not a member of the
// facility, and whom RLS therefore shows nothing — would have been told "this
// facility has not connected a payment account". Every customer-facing payment
// would have failed, with a message pointing at entirely the wrong thing.
//
// So anything on the money path reads the connection with the admin client
// below, and only the UI asks under the caller's own permissions.
// ============================================================================

export interface ChargeableConnection {
  merchantId: string;
  /** Narrowed on the way out, so callers can hand it straight to cloverConfig. */
  environment: CloverEnvironment;
  currency: string | null;
  publicApiKey: string | null;
}

/**
 * The connection as the MONEY PATH sees it — through the service role, because
 * the person paying is usually not a member of the facility being paid.
 */
export async function chargeableConnection(
  facilityId: string,
): Promise<ChargeableConnection | null> {
  if (!hasServiceRoleKey()) return null;
  const admin = createAdminClient();

  const { data } = await admin
    .from("payment_connections")
    .select("merchant_id, environment, currency, public_api_key, status")
    .eq("facility_id", facilityId)
    .eq("processor", "clover")
    .maybeSingle();

  if (!data || data.status !== "connected") return null;

  return {
    merchantId: data.merchant_id,
    environment: asCloverEnvironment(data.environment),
    currency: data.currency,
    publicApiKey: data.public_api_key,
  };
}

/**
 * Store a freshly-exchanged token pair against a facility.
 *
 * Throws when the service-role key is absent rather than returning a quiet
 * failure: the merchant has already approved at Clover by this point, so a
 * connection that silently does not persist leaves them believing they are set
 * up. Loud is the only honest option that late in the flow.
 */
export async function recordConnection(params: {
  facilityId: string;
  merchantId: string;
  tokens: CloverTokens;
  connectedBy: string | null;
  /**
   * The estate these tokens belong to. REQUIRED, and the reason is a bug this
   * used to have waiting: it wrote `defaultCloverEnvironment()`, so refreshing
   * a sandbox connection on a deployment whose default had moved to production
   * would rewrite that row's environment to production — and every later call
   * for that merchant would then be aimed at the wrong estate. A refresh must
   * preserve what the connection is, not restate where new ones go.
   */
  environment: CloverEnvironment;
  publicApiKey?: string | null;
  currency?: string | null;
  country?: string | null;
}): Promise<void> {
  if (!hasServiceRoleKey()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured, so the merchant's tokens " +
        "cannot be stored. See .env.example.",
    );
  }

  const admin = createAdminClient();

  const { error } = await admin.rpc("store_payment_credentials", {
    p_facility_id: params.facilityId,
    p_merchant_id: params.merchantId,
    p_environment: params.environment,
    p_access_token: params.tokens.accessToken,
    p_refresh_token: params.tokens.refreshToken,
    p_access_expires: params.tokens.accessExpiresAt,
    p_refresh_expires: params.tokens.refreshExpiresAt,
    p_public_api_key: params.publicApiKey ?? null,
    p_connected_by: params.connectedBy,
    // NULL leaves whatever connecting already discovered — a token refresh
    // does not re-read the merchant and must not blank these.
    p_currency: params.currency ?? null,
    p_country: params.country ?? null,
  });

  if (error) throw new Error(error.message);
}

/**
 * A token that will still be valid when the request lands.
 *
 * ── THIRTY MINUTES ────────────────────────────────────────────────────────
 *
 * Measured against the sandbox on the first real connection: Clover's access
 * token expires in THIRTY MINUTES, and the refresh token in a year. That makes
 * this function mandatory rather than an optimisation — a facility that takes
 * one payment an hour would fail every single one if the stored token were used
 * as-is, and the failure would be a 401 at the moment a customer is standing at
 * the counter.
 *
 * The five-minute margin is for the request itself: a token with ninety seconds
 * left passes any "is it expired" check and then expires mid-charge, which is
 * the worst possible moment because the outcome is genuinely unknown.
 *
 * Returns null rather than throwing when there is nothing usable, because the
 * caller has a better error to give than this layer does — it knows whether a
 * customer is waiting.
 */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface ActiveToken {
  accessToken: string;
  merchantId: string;
  /** Which estate this token is good against. Never assume the default. */
  environment: CloverEnvironment;
}

export async function validAccessToken(
  facilityId: string,
): Promise<ActiveToken | null> {
  if (!hasServiceRoleKey()) return null;
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("payment_access_token", {
    p_facility_id: facilityId,
  });
  if (error) return null;

  const row = (data as unknown as CredentialRow[] | null)?.[0];
  if (!row?.access_token) return null;

  const expiresAt = row.access_token_expires_at
    ? Date.parse(row.access_token_expires_at)
    : 0;

  // Still comfortably alive — nothing to do.
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return {
      accessToken: row.access_token,
      merchantId: row.merchant_id,
      environment: asCloverEnvironment(row.environment),
    };
  }

  if (!row.refresh_token) {
    await recordConnectionError(
      facilityId,
      "The access token expired and no refresh token is stored. The facility must reconnect.",
    );
    return null;
  }

  const environment = asCloverEnvironment(row.environment);
  try {
    // The connection's OWN estate, both to refresh against and to write back.
    const refreshed = await refreshTokens(row.refresh_token, environment);
    await recordConnection({
      facilityId,
      merchantId: row.merchant_id,
      tokens: refreshed,
      connectedBy: null,
      environment,
    });
    return {
      accessToken: refreshed.accessToken,
      merchantId: row.merchant_id,
      environment,
    };
  } catch (error) {
    // ── A LOST RACE IS NOT A BROKEN CONNECTION ───────────────────────────
    //
    // CLOVER ROTATES REFRESH TOKENS: a successful refresh invalidates the one
    // that bought it. So two requests refreshing at the same moment — two
    // customers paying at once while the access token is inside its margin —
    // produce one winner and one 401 "Invalid refresh token".
    //
    // Observed here, half a second apart:
    //
    //   20:30:21.254  credentials rotated, new access token valid for 30 min
    //   20:30:21.733  the loser's 401 marked the connection `error`
    //
    // And `chargeableConnection` refuses anything not `connected`, so the
    // facility's card payments all began failing with "this facility has not
    // connected a payment account" — while holding a perfectly good token.
    //
    // So before believing the failure, look again. If somebody else has just
    // stored a usable token, this request lost a race and should use it.
    const again = await admin.rpc("payment_access_token", {
      p_facility_id: facilityId,
    });
    const fresh = (again.data as unknown as CredentialRow[] | null)?.[0];
    const freshExpiry = fresh?.access_token_expires_at
      ? Date.parse(fresh.access_token_expires_at)
      : 0;

    if (fresh?.access_token && freshExpiry - Date.now() > REFRESH_MARGIN_MS) {
      return {
        accessToken: fresh.access_token,
        merchantId: fresh.merchant_id,
        environment: asCloverEnvironment(fresh.environment),
      };
    }

    await recordConnectionError(
      facilityId,
      error instanceof Error ? error.message : "Token refresh failed.",
    );
    return null;
  }
}

interface CredentialRow {
  access_token: string;
  refresh_token: string | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  merchant_id: string;
  environment: string;
  connection_status: string;
}

/**
 * Mark a connection broken. Deliberately does not delete the credentials — the
 * refresh token is what repairs it (20260807720000).
 */
export async function recordConnectionError(
  facilityId: string,
  message: string,
): Promise<void> {
  if (!hasServiceRoleKey()) return;
  const admin = createAdminClient();
  await admin.rpc("record_payment_connection_error", {
    p_facility_id: facilityId,
    p_error: message,
  });
}
