import "server-only";

import { cloverConfig } from "@/lib/clover/config";
import {
  chargeableConnection,
  validAccessToken,
} from "@/lib/clover/connection";

// ============================================================================
// Storing a card so the customer does not have to hand it over again.
//
// ── WHAT WE HOLD, AND WHY IT IS NOT A CARD ────────────────────────────────
//
// The browser turns the card into a `clv_` token with the PAKMS key
// (`clover-card-fields.tsx`). That token is single-use. Handing it to
// `POST /v1/customers` as `source` turns it into a MULTI-PAY token attached to
// a Clover customer, and what comes back is an id.
//
// Clover's own vaulting documentation says these are "one-way encrypted and can
// be stored on systems that are not in the Payment Card Industry Data Security
// Standard (PCI DSS) scope". That sentence is the only reason `saved_cards` may
// exist in our Postgres. Nothing here ever sees or forwards a card number — if
// it did, this deployment would be in PCI scope and the answer would be no.
//
// ── TWO PREREQUISITES THAT ARE NOT CODE ───────────────────────────────────
//
// 1. The MERCHANT must be configured to accept vaulted cards. Clover states it
//    plainly: it happens "during initial merchant setup or after the fact", and
//    an app cannot turn it on. A merchant without it gets a refusal that looks
//    like any other 4xx, so `vaultCard` names that case specifically rather
//    than reporting "could not save card" — the person who can fix it needs to
//    know it is an account setting and not a bug.
//
// 2. CONSENT. "Merchants must obtain explicit consent from cardholders before
//    storing and using their payment credentials for future transactions."
//    That is recorded in `saved_cards.consent_at`/`consent_by` by the caller,
//    and the charge path refuses a card that has none. It is not this module's
//    job to ask, but it is the reason this module exists at arm's length from
//    the charge itself.
//
// ── CANADA ────────────────────────────────────────────────────────────────
//
// Vaulting is available in the United States and Canada; Clover excludes
// Argentina, the UK and Ireland. This is NOT the same constraint as pre-auth,
// which Canadian merchants genuinely cannot use and which is why the terminal
// asks for a tip before charging rather than tip-adjusting after. The repo
// recorded "no card vault" for a while on the strength of that other limit.
// ============================================================================

export type VaultOutcome =
  | {
      ok: true;
      /** Clover's customer, which is what a later charge names as its source. */
      customerId: string;
      cardId: string | null;
      brand: string | null;
      last4: string | null;
      expMonth: number | null;
      expYear: number | null;
    }
  | {
      ok: false;
      /**
       * `not_enabled` means the merchant account cannot vault at all. Say so on
       * screen in those words — it is fixed by Clover, not by us.
       */
      code:
        | "not_connected"
        | "not_configured"
        | "not_enabled"
        | "refused"
        | "unreachable";
      message: string;
    };

interface CloverCustomer {
  id?: string;
  sources?: {
    elements?: {
      id?: string;
      brand?: string;
      last4?: string;
      exp_month?: string | number;
      exp_year?: string | number;
    }[];
  };
  error?: { message?: string; code?: string; type?: string };
  message?: string;
}

/** Clover states expiry as strings often enough that Number() is not optional. */
function digits(value: string | number | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Turn a single-use card token into a stored card at Clover.
 *
 * Records nothing in Postgres — the caller writes `saved_cards`, because the
 * caller is the one who knows whether consent was given and by whom.
 *
 * @param source the `clv_` token from the browser. Never a card number.
 */
export async function vaultCard(request: {
  facilityId: string;
  source: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<VaultOutcome> {
  const connection = await chargeableConnection(request.facilityId);
  if (!connection) {
    return {
      ok: false,
      code: "not_connected",
      message: "This facility has not connected a merchant account.",
    };
  }

  const active = await validAccessToken(request.facilityId);
  if (!active) {
    return {
      ok: false,
      code: "not_connected",
      message: "The merchant connection needs to be reconnected.",
    };
  }

  const config = cloverConfig(active.environment);
  if (!config) {
    return {
      ok: false,
      code: "not_configured",
      message: `Clover is not configured for ${active.environment}.`,
    };
  }

  let status: number;
  let body: CloverCustomer | null;
  try {
    const response = await fetch(
      new URL("/v1/customers", config.ecommerceOrigin),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${active.accessToken}`,
          "Content-Type": "application/json",
          "X-Clover-Merchant-Id": active.merchantId,
        },
        body: JSON.stringify({
          // Clover documents `email` as required on this call.
          email: request.email ?? undefined,
          firstName: request.firstName ?? undefined,
          lastName: request.lastName ?? undefined,
          // The single-use token becomes a multi-pay token on the customer.
          source: request.source,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    status = response.status;
    body = (await response.json().catch(() => null)) as CloverCustomer | null;
  } catch {
    // Unlike a charge, a failure here moved no money. Nothing to reconcile.
    return {
      ok: false,
      code: "unreachable",
      message: "Clover could not be reached. The card was not saved.",
    };
  }

  if (status >= 200 && status < 300 && body?.id) {
    const card = body.sources?.elements?.[0];
    return {
      ok: true,
      customerId: body.id,
      cardId: card?.id ?? null,
      brand: card?.brand ?? null,
      // Guarded: this value lands in a column whose CHECK takes four digits or
      // nothing, precisely so a card number cannot arrive in it.
      last4: card?.last4?.trim().slice(-4) ?? null,
      expMonth: digits(card?.exp_month),
      expYear: digits(card?.exp_year),
    };
  }

  const detail = body?.error?.message ?? body?.message ?? "";

  // ── THE MERCHANT-NOT-ENABLED CASE, NAMED ────────────────────────────────
  //
  // Clover does not publish a stable code for this, so it is recognised from
  // the message and from a 403. Being wrong in this direction is cheap: the
  // worst case is telling somebody to check an account setting that turns out
  // to be fine. Being silent is what costs an afternoon.
  const looksNotEnabled =
    status === 403 ||
    /not (enabled|configured|permitted|supported)|vault|card on file/i.test(
      detail,
    );

  if (looksNotEnabled) {
    return {
      ok: false,
      code: "not_enabled",
      message:
        "This merchant account is not set up to store cards. Clover enables " +
        "card vaulting on the account itself — ask your Clover representative " +
        "to switch it on, then try again.",
    };
  }

  return {
    ok: false,
    code: "refused",
    message: detail || `Clover refused to save the card (${status}).`,
  };
}
