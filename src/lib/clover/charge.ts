import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "./config";
import { chargeableConnection, validAccessToken } from "./connection";

// ============================================================================
// Taking the money.
//
// ── THE ORDER IS THE DESIGN ───────────────────────────────────────────────
//
//   1. open an intent          — BEFORE Clover is called, with the idempotency
//                                key that will be sent
//   2. get a live token        — refreshing if it is inside the margin
//   3. POST /v1/charges        — the only step that moves money
//   4. record it, atomically   — ledger row and intent link in one transaction
//
// Step 1 is what makes a crash survivable. If the process dies between 3 and 4
// the intent still says "we asked for this amount with key K and never heard
// back", which is both the thing to reconcile and what makes a retry safe:
// Clover honours the key and returns the ORIGINAL charge rather than making a
// second one.
//
// ── THE CALLER DOES NOT CHOOSE THE AMOUNT ─────────────────────────────────
//
// It comes from the booking. A tip may come from the customer, because a tip is
// genuinely their decision, and it is bounded so a malformed or hostile value
// cannot turn a $40 groom into a $40,000 one.
//
// ── THE CURRENCY IS THE MERCHANT'S ────────────────────────────────────────
//
// Read from the connection, which read it from Clover. A connection that never
// learned its currency cannot charge at all — refusing is right, because the
// alternative is labelling a Canadian merchant's takings in dollars and
// discovering it in an audit.
// ============================================================================

/** A tip larger than this is a fat finger or an attack, not gratitude. */
const MAX_TIP_CENTS = 100_000;

export type ChargeOutcome =
  | {
      ok: true;
      paymentId: string;
      intentId: string;
      processorPaymentId: string;
      amountCents: number;
      currency: string;
      cardBrand: string | null;
      cardLast4: string | null;
    }
  | {
      ok: false;
      intentId: string | null;
      code: string;
      message: string;
    };

interface CloverCharge {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  captured?: boolean;
  auth_code?: string;
  source?: { brand?: string; last4?: string };
  error?: {
    code?: string;
    message?: string;
    type?: string;
    /** Why the issuer said no — "issuer_declined", "insufficient_funds"… */
    declineCode?: string;
    /** Clover's id for the DECLINED attempt. It exists, and it is what their
     *  dashboard is searched by, so it belongs in the intent. */
    charge?: string;
  };
  message?: string;
}

export interface ChargeRequest {
  facilityId: string;
  bookingId: string | null;
  clientId: string | null;
  /** What is owed, in cents, derived server-side. Never from the client. */
  subtotalCents: number;
  taxCents?: number;
  tipCents?: number;
  /** The `clv_` token the browser produced. Never a card number. */
  source: string;
  createdBy: string | null;
  authorName?: string;
}

export async function chargeCard(
  request: ChargeRequest,
): Promise<ChargeOutcome> {
  const config = cloverConfig();
  if (!config) {
    return {
      ok: false,
      intentId: null,
      code: "not_configured",
      message: "Clover is not configured on this deployment.",
    };
  }
  if (!hasServiceRoleKey()) {
    return {
      ok: false,
      intentId: null,
      code: "not_configured",
      message:
        "The server cannot record payments. SUPABASE_SERVICE_ROLE_KEY is unset.",
    };
  }

  const tipCents = Math.max(0, Math.round(request.tipCents ?? 0));
  const taxCents = Math.max(0, Math.round(request.taxCents ?? 0));
  const subtotalCents = Math.round(request.subtotalCents);

  if (tipCents > MAX_TIP_CENTS) {
    return {
      ok: false,
      intentId: null,
      code: "tip_too_large",
      message: "That tip is larger than we will take in one payment.",
    };
  }

  const amountCents = subtotalCents + taxCents + tipCents;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return {
      ok: false,
      intentId: null,
      code: "invalid_amount",
      message: "There is nothing to pay.",
    };
  }

  // Through the service role, NOT the caller's client: the person paying is
  // usually a customer, who is not a member of the facility being paid and
  // whom RLS would show nothing.
  const connection = await chargeableConnection(request.facilityId);
  if (!connection) {
    return {
      ok: false,
      intentId: null,
      code: "not_connected",
      message: "This facility has not connected a payment account.",
    };
  }
  if (!connection.currency) {
    // Deliberately fatal. Guessing here mislabels real money.
    return {
      ok: false,
      intentId: null,
      code: "unknown_currency",
      message:
        "We do not know which currency this merchant settles in, so we will not charge a card.",
    };
  }

  const admin = createAdminClient();
  const idempotencyKey = randomUUID();

  // ── 1. The intent, before anything can move ──────────────────────────────
  const opened = await admin.rpc("open_payment_intent", {
    p_facility_id: request.facilityId,
    p_amount_cents: amountCents,
    p_currency: connection.currency,
    p_kind: "ecom",
    p_idempotency_key: idempotencyKey,
    p_booking_id: request.bookingId,
    p_client_id: request.clientId,
    p_created_by: request.createdBy,
  });

  if (opened.error || !opened.data) {
    return {
      ok: false,
      intentId: null,
      code: "intent_failed",
      message: opened.error?.message ?? "Could not start the payment.",
    };
  }
  const intentId = opened.data as unknown as string;

  /**
   * `message` is what the payer is told; `detail` is what the intent keeps.
   *
   * They are different on purpose. Clover's own decline text for this merchant
   * comes back as "REFUSÉE : aucune raison fournie." — the merchant's locale,
   * not the reader's, and it says nothing a customer can act on. The intent
   * still gets it verbatim, along with the decline code and Clover's id for the
   * declined attempt, because that is what somebody reconciling in Clover's
   * dashboard will search by.
   */
  const fail = async (
    code: string,
    message: string,
    detail?: string,
  ): Promise<ChargeOutcome> => {
    await admin.rpc("close_payment_intent", {
      p_intent_id: intentId,
      p_status: code === "declined" ? "declined" : "failed",
      p_failure_code: code,
      p_failure_message: detail ?? message,
    });
    return { ok: false, intentId, code, message };
  };

  // ── 2. A token that will still be valid when the request lands ───────────
  const active = await validAccessToken(request.facilityId);
  if (!active) {
    return fail(
      "no_token",
      "The connection to Clover could not be refreshed. Reconnect the payment account.",
    );
  }

  // ── 3. The only step that moves money ────────────────────────────────────
  await admin.rpc("close_payment_intent", {
    p_intent_id: intentId,
    p_status: "sent",
  });

  let charge: CloverCharge | null;
  let httpStatus: number;
  try {
    const response = await fetch(
      new URL("/v1/charges", config.ecommerceOrigin),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${active.accessToken}`,
          "Content-Type": "application/json",
          // Clover honours this: a retry with the same key returns the original
          // charge rather than making a second one.
          "idempotency-key": idempotencyKey,
          "X-Clover-Merchant-Id": active.merchantId,
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: connection.currency.toLowerCase(),
          source: request.source,
          // Card not present, entered by the cardholder online.
          ecomind: "ecom",
          capture: true,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    httpStatus = response.status;
    charge = (await response.json().catch(() => null)) as CloverCharge | null;
  } catch (error) {
    // A timeout is the dangerous one: the charge may have succeeded. The intent
    // survives saying exactly that, and unreconciled_payments will not show it
    // because it never reached 'approved' — which is why the intent's own
    // failure message has to say "unknown", not "failed".
    return fail(
      "network",
      error instanceof Error && error.name === "TimeoutError"
        ? "Clover did not answer in time. The outcome of this charge is UNKNOWN and must be checked before retrying."
        : "Could not reach Clover.",
    );
  }

  if (httpStatus >= 400 || !charge?.id) {
    const failure = charge?.error;
    const code = failure?.code ?? `http_${httpStatus}`;

    // ── A DECLINE IS A 402, AND CLOVER SENDS NO `type` ON ONE ──────────────
    //
    // This used to read `error.type === "card_error"`. Measured against the
    // sandbox, a declined card comes back as:
    //
    //   HTTP 402  { error: { code: "card_declined",
    //                        declineCode: "issuer_declined",
    //                        charge: "GQ5GHQPDTPCSP", message: "REFUSÉE …" } }
    //
    // — no `type` field at all. So that test never matched, every declined card
    // fell through to the generic branch, and the route turned it into a 500:
    // the customer was told the system had broken when their bank had simply
    // said no. Classified on the status Clover actually sends, which is the one
    // HTTP has a word for.
    const declined = httpStatus === 402 || code === "card_declined";

    if (declined) {
      return fail(
        "declined",
        "That card was declined. Try another card, or check with your bank.",
        [
          `Clover declined the charge (${failure?.declineCode ?? code}).`,
          failure?.message,
          failure?.charge ? `Clover attempt ${failure.charge}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    }

    return fail(
      code,
      failure?.message ?? charge?.message ?? "Clover refused the charge.",
    );
  }

  // ── 4. The ledger row and the intent link, atomically ────────────────────
  const recorded = await admin.rpc("record_clover_payment", {
    p_intent_id: intentId,
    p_processor_payment_id: charge.id,
    p_subtotal_cents: subtotalCents,
    p_tax_cents: taxCents,
    p_tip_cents: tipCents,
    p_card_brand: charge.source?.brand ?? null,
    p_card_last4: charge.source?.last4 ?? null,
    p_auth_code: charge.auth_code ?? null,
    p_entry_method: "ecom",
    p_author_name: request.authorName ?? "Online payment",
  });

  if (recorded.error || !recorded.data) {
    // The money HAS moved. Mark the intent approved so it shows up in
    // unreconciled_payments rather than looking like a failure — this is
    // precisely the case that view exists for.
    await admin
      .from("payment_intents")
      .update({
        status: "approved",
        processor_payment_id: charge.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", intentId);

    return {
      ok: false,
      intentId,
      code: "unrecorded",
      message:
        "The card was charged but the payment could not be written to the ledger. It is flagged for reconciliation.",
    };
  }

  return {
    ok: true,
    paymentId: recorded.data as unknown as string,
    intentId,
    processorPaymentId: charge.id,
    amountCents,
    currency: connection.currency,
    cardBrand: charge.source?.brand ?? null,
    cardLast4: charge.source?.last4 ?? null,
  };
}
