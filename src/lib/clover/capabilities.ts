import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "@/lib/clover/config";
import { validAccessToken } from "@/lib/clover/connection";
import { cloverGet } from "@/lib/clover/request";

// ============================================================================
// What this merchant connection is actually allowed to do.
//
// ── WHY THIS HAS TO BE PROBED, NOT READ ───────────────────────────────────
//
// `payment_connections.scopes` has been an empty array since the column was
// added, and it cannot be filled from the grant: Clover's token exchange
// returns `access_token`, `refresh_token` and two expiries and says nothing
// about permissions (see oauth.ts). Permissions are ticked on the APP, in
// Clover's developer dashboard, and are never reported back to the app that
// holds them.
//
// So the only way to know whether this connection may vault a card is to ask
// Clover to do something that needs the permission, and read the refusal.
//
// ── THE PROBES MOVE NO MONEY AND CREATE NOTHING ───────────────────────────
//
// Four reads and one deliberately invalid write. The write is the important
// one: POST /v1/customers with no `source` CANNOT create a customer, so the
// answer is purely about permission —
//
//   400  the request was understood and rejected on its merits -> PERMITTED
//   401  the token is dead
//   403  the app lacks Ecommerce "Write customers"             -> NOT permitted
//
// That distinction is the whole reason this file exists. Before it, a failed
// vault was indistinguishable from a bug, and the answer — tick "Write
// customers" on the app — was unavailable to the person who could act on it.
//
// ── AND IT MUST NOT OVERCLAIM ─────────────────────────────────────────────
//
// Taking a payment cannot be proved without taking one, so `charge` is reported
// as `untested` and never as working. A capability screen is the easiest place
// in this codebase to write a comfortable lie, and `check:success-claims`
// exists because one was written before.
// ============================================================================

export type CapabilityState =
  | "ok"
  | "missing"
  | "unreachable"
  /** Cannot be established without doing the thing. Never rendered as working. */
  | "untested";

export interface Capability {
  key: string;
  /** What a person would call it. */
  label: string;
  state: CapabilityState;
  /** What to do about it, when there is something to do. */
  detail: string;
}

export interface CapabilityReport {
  environment: "sandbox" | "production" | null;
  merchantId: string | null;
  capabilities: Capability[];
  /** The `scopes` value written to the connection — the proven ones only. */
  granted: string[];
}

/**
 * Every capability, all unreachable, with the reason on the first one.
 *
 * The report names the SAME capabilities whatever happened, so a screen renders
 * one list rather than a different shape depending on connectivity — and so a
 * missing entry always means a bug here rather than "the connection was down".
 * An earlier version returned a single row and a caller reading `charge` got
 * `undefined`, which reads as "not applicable" rather than "not checked".
 */
function allUnreachable(detail: string): CapabilityReport {
  return {
    environment: null,
    merchantId: null,
    granted: [],
    capabilities: CAPABILITY_LABELS.map(({ key, label }, index) => ({
      key,
      label,
      // Taking a payment is never probeable, so it stays `untested` even here —
      // reporting it as unreachable would suggest it might have been checked.
      state: key === "charge" ? "untested" : "unreachable",
      detail:
        index === 0
          ? detail
          : key === "charge"
            ? UNTESTABLE_CHARGE
            : "Not checked, because the connection could not be reached.",
    })),
  };
}

/** The capabilities this report always names, in the order it names them. */
const CAPABILITY_LABELS = [
  { key: "merchant", label: "Merchant account" },
  { key: "tokenization", label: "Card fields (hosted iFrame)" },
  { key: "charges_read", label: "Read payments" },
  { key: "customers_write", label: "Save a card for next time" },
  { key: "charge", label: "Take a payment" },
] as const;

const UNTESTABLE_CHARGE =
  "Cannot be checked without charging a card. Use a test card against the sandbox.";

export async function checkCapabilities(
  facilityId: string,
): Promise<CapabilityReport> {
  if (!hasServiceRoleKey()) {
    return allUnreachable("Clover is not configured on this deployment.");
  }

  const active = await validAccessToken(facilityId);
  if (!active) {
    return allUnreachable(
      "No usable access token. The facility needs to reconnect its merchant account.",
    );
  }

  const config = cloverConfig(active.environment);
  if (!config) {
    return allUnreachable(
      `Clover is not configured for ${active.environment}.`,
    );
  }

  const capabilities: Capability[] = [];
  const push = (
    key: string,
    label: string,
    state: CapabilityState,
    detail: string,
  ) => capabilities.push({ key, label, state, detail });

  // ── The grant itself ────────────────────────────────────────────────────
  const merchant = await cloverGet<{ id?: string }>(
    config.apiOrigin,
    `/v3/merchants/${active.merchantId}`,
    active.accessToken,
    active.merchantId,
  );
  push(
    "merchant",
    "Merchant account",
    merchant.data ? "ok" : merchant.refused ? "missing" : "unreachable",
    merchant.data
      ? "Connected and readable."
      : merchant.refused
        ? "Clover refused the token. The facility needs to reconnect."
        : "Clover could not be reached.",
  );

  // ── Tokenisation: the key the browser mounts the card fields with ───────
  //
  // Served by the ECOMMERCE host. On apiOrigin this path is a flat 404, which
  // is documented in config.ts and cost somebody an afternoon once.
  const pakms = await cloverGet<{ apiAccessKey?: string; active?: boolean }>(
    config.ecommerceOrigin,
    "/pakms/apikey",
    active.accessToken,
    active.merchantId,
  );
  const keyLive =
    Boolean(pakms.data?.apiAccessKey) && pakms.data?.active !== false;
  push(
    "tokenization",
    "Card fields (hosted iFrame)",
    keyLive ? "ok" : pakms.refused ? "missing" : "unreachable",
    keyLive
      ? "A public key is available, so cards can be entered online."
      : pakms.refused
        ? "No public key. Enable the Ecommerce section on the app, including its API checkbox."
        : "Clover could not be reached for the public key.",
  );

  // ── Reading payments and customers ──────────────────────────────────────
  const charges = await cloverGet(
    config.ecommerceOrigin,
    "/v1/charges?limit=1",
    active.accessToken,
    active.merchantId,
  );
  push(
    "charges_read",
    "Read payments",
    charges.refused ? "missing" : charges.status === 0 ? "unreachable" : "ok",
    charges.refused
      ? "The app is missing the Ecommerce Read payments permission."
      : "Charges can be read back from Clover.",
  );

  // NOT probed: `GET /v1/customers`. Measured against the sandbox on
  // 2026-08-27 it answers 405 Method Not Allowed — there is no list endpoint,
  // so the status says nothing about permission and reporting it as proof of
  // "Read customers" would be an invention. The write probe below is the one
  // that carries real information.

  // ── The one that answers the question people actually ask ───────────────
  const vault = await probeVaultWrite(
    config.ecommerceOrigin,
    active.accessToken,
    active.merchantId,
  );
  push(
    "customers_write",
    "Save a card for next time",
    vault.state,
    vault.detail,
  );

  // Taking a payment is not probeable. Said so, rather than assumed.
  push("charge", "Take a payment", "untested", UNTESTABLE_CHARGE);

  const granted = capabilities
    .filter((capability) => capability.state === "ok")
    .map((capability) => capability.key);

  await recordScopes(facilityId, granted);

  return {
    environment: active.environment,
    merchantId: active.merchantId,
    capabilities,
    granted,
  };
}

/**
 * Can this app store a card?
 *
 * Asked with a body that CANNOT succeed — no `source`, so there is no card to
 * store and no customer can be created. A 400 means Clover read the request and
 * rejected it on its merits, which is only reachable with the permission. A 403
 * means the app does not hold it.
 */
async function probeVaultWrite(
  origin: string,
  accessToken: string,
  merchantId: string,
): Promise<{ state: CapabilityState; detail: string }> {
  let status: number;
  try {
    const response = await fetch(new URL("/v1/customers", origin), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Clover-Merchant-Id": merchantId,
      },
      // Deliberately incomplete. If this ever succeeds, something is very wrong
      // and the branch below is the only thing that would notice.
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15_000),
    });
    status = response.status;
  } catch {
    return { state: "unreachable", detail: "Clover could not be reached." };
  }

  if (status === 401 || status === 403) {
    return {
      state: "missing",
      detail:
        "The app is missing the Ecommerce Write customers permission. Tick it on the app in Clover's developer dashboard, then have the facility reconnect.",
    };
  }

  if (status >= 200 && status < 300) {
    // A customer created from an empty body would mean this probe is not the
    // side-effect-free check it is documented to be. Reported, not swallowed.
    return {
      state: "untested",
      detail:
        "Clover accepted an empty customer, which it should not. Do not rely on this result.",
    };
  }

  return {
    state: "ok",
    detail: "Cards can be stored for future payments.",
  };
}

/**
 * Write what was proven onto the connection.
 *
 * `scopes` has held an empty array since the column existed. It now holds the
 * capabilities that were demonstrated, so a later failure can be compared
 * against what was true when the facility last checked.
 *
 * Never throws: a preflight that cannot record its own result should still
 * report it to the person waiting for it.
 */
async function recordScopes(facilityId: string, granted: string[]) {
  try {
    const admin = createAdminClient();
    await admin
      .from("payment_connections")
      .update({ scopes: granted, last_verified_at: new Date().toISOString() })
      .eq("facility_id", facilityId)
      .eq("processor", "clover");
  } catch {
    // Deliberately silent. The report is the product; this is a convenience.
  }
}
