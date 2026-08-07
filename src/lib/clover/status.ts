import "server-only";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Whether a facility is connected, asked under the CALLER's own permissions.
//
// Separate from connection.ts on purpose. That module is the money path and
// runs as the service role; this one goes through the ordinary cookie-bound
// client, so RLS decides — a facility sees its own row and nothing else, and
// nothing here can reach a function that returns a token.
//
// It is also why the two are separate MODULES rather than two functions: this
// one imports next/headers and can therefore only run inside a request, and
// dragging that into the charge path would make it untestable outside one.
// ============================================================================

export interface ConnectionStatus {
  connected: boolean;
  status: "pending" | "connected" | "revoked" | "error" | "none";
  merchantId: string | null;
  environment: string | null;
  publicApiKey: string | null;
  /** From the merchant, never defaulted. NULL means we have not asked. */
  currency: string | null;
  country: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

const ABSENT: ConnectionStatus = {
  connected: false,
  status: "none",
  merchantId: null,
  environment: null,
  publicApiKey: null,
  currency: null,
  country: null,
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
      "status, merchant_id, environment, public_api_key, currency, country, connected_at, last_error",
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
    currency: data.currency,
    country: data.country,
    connectedAt: data.connected_at,
    lastError: data.last_error,
  };
}
