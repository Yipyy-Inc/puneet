import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { cloverEnvironment } from "./config";
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
//   the CALLER'S client reads. `connectionStatus` goes through the ordinary
//                              cookie-bound client, so RLS decides — a facility
//                              sees its own row and nothing else, and it never
//                              touches a function that returns a token.
//
// The second is why "are we connected?" is a separate function from "give me
// the token". If asking about status went through the privileged path, the
// answer would eventually get rendered in a component.
// ============================================================================

export interface ConnectionStatus {
  connected: boolean;
  status: "pending" | "connected" | "revoked" | "error" | "none";
  merchantId: string | null;
  environment: string | null;
  publicApiKey: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

const ABSENT: ConnectionStatus = {
  connected: false,
  status: "none",
  merchantId: null,
  environment: null,
  publicApiKey: null,
  connectedAt: null,
  lastError: null,
};

/** Read under the caller's own permissions. Never returns a token. */
export async function connectionStatus(
  facilityId: string,
): Promise<ConnectionStatus> {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("payment_connections")
    .select(
      "status, merchant_id, environment, public_api_key, connected_at, last_error",
    )
    .eq("facility_id", facilityId)
    .eq("processor", "clover")
    .maybeSingle();

  if (!data) return ABSENT;

  return {
    connected: data.status === "connected",
    status: data.status as ConnectionStatus["status"],
    merchantId: data.merchant_id,
    environment: data.environment,
    publicApiKey: data.public_api_key,
    connectedAt: data.connected_at,
    lastError: data.last_error,
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
  publicApiKey?: string | null;
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
    p_environment: cloverEnvironment(),
    p_access_token: params.tokens.accessToken,
    p_refresh_token: params.tokens.refreshToken,
    p_access_expires: params.tokens.accessExpiresAt,
    p_refresh_expires: params.tokens.refreshExpiresAt,
    p_public_api_key: params.publicApiKey ?? null,
    p_connected_by: params.connectedBy,
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
  environment: string;
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
      environment: row.environment,
    };
  }

  if (!row.refresh_token) {
    await recordConnectionError(
      facilityId,
      "The access token expired and no refresh token is stored. The facility must reconnect.",
    );
    return null;
  }

  try {
    const refreshed = await refreshTokens(row.refresh_token);
    await recordConnection({
      facilityId,
      merchantId: row.merchant_id,
      tokens: refreshed,
      connectedBy: null,
    });
    return {
      accessToken: refreshed.accessToken,
      merchantId: row.merchant_id,
      environment: row.environment,
    };
  } catch (error) {
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
