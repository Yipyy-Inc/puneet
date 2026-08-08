import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "./config";
import { validAccessToken } from "./connection";

// ============================================================================
// Acting on what a webhook named — after asking Clover what actually happened.
//
// A delivery carries an object id and nothing else, and the auth header behind
// it is a shared secret with no per-message integrity. So nothing here trusts
// the message: it is a prompt to go and read the object with the merchant's own
// token, and every decision is made from that read.
//
// ── A REVERSAL IS NOT ALWAYS A REFUND ─────────────────────────────────────
//
// Measured against the sandbox, and it would have been a silent bug: calling
// /v1/refunds on a charge from the same batch produces a VOID, not a refund.
// The payment comes back as
//
//     { "result": "VOIDED", "voidReason": "USER_CANCEL", "refunds": {"elements": []} }
//
// — reversed in full, with an EMPTY refunds array. Reconciling on refunds[]
// alone, which is the obvious reading of the API, would have missed every
// same-day reversal a facility ever made and reported the money as still taken.
//
// So "how much has Clover given back" is: the whole amount if the payment is
// voided, otherwise the sum of its refunds.
//
// ── IT RECONCILES THE GAP, NOT THE EVENT ──────────────────────────────────
//
// The question asked is never "did a refund happen" but "does our ledger
// already account for everything Clover has reversed". A duplicate delivery, a
// refund we issued ourselves through the app, and a manual reversal in Clover's
// dashboard all reduce to the same arithmetic, and only the shortfall is
// written. That is what makes this safe to run twice.
// ============================================================================

export type PaymentReconciliation =
  | { kind: "not_ours"; detail: string }
  | { kind: "unreadable"; detail: string }
  | { kind: "settled"; detail: string }
  | { kind: "reversed"; detail: string; amountCents: number };

interface CloverV3Payment {
  id?: string;
  amount?: number;
  result?: string;
  voidReason?: string;
  /** Clover's id for the VOID itself — a real id, not one we invent. */
  voidPaymentRef?: { id?: string };
  refunds?: { elements?: { id?: string; amount?: number }[] };
}

/** Cents, from a numeric-dollars column. */
function cents(value: unknown): number {
  return Math.round(Number(value ?? 0) * 100);
}

/**
 * Bring our ledger in line with what Clover says about one payment.
 *
 * Service role throughout: this runs from a webhook, where there is no caller
 * and therefore nobody for RLS to be evaluated against.
 */
export async function reconcilePayment(
  facilityId: string,
  cloverPaymentId: string,
): Promise<PaymentReconciliation> {
  const config = cloverConfig();
  if (!config || !hasServiceRoleKey()) {
    return { kind: "unreadable", detail: "Clover is not configured here." };
  }

  const admin = createAdminClient();

  // The ORIGINAL row. A reversal also carries a processor_payment_id — the
  // void's or refund's own id — so restricting to a positive grand_total is
  // what keeps a reversal from being mistaken for the payment it reverses.
  const { data: original } = await admin
    .from("payments")
    .select(
      "id, facility_id, booking_id, client_id, method, subtotal, tax, tip, grand_total, amount_charged, card_brand, card_last4, entry_method, processor",
    )
    .eq("processor", "clover")
    .eq("processor_payment_id", cloverPaymentId)
    .gt("grand_total", 0)
    .maybeSingle();

  if (!original) {
    // Every payment the merchant takes on their own terminal reaches this
    // endpoint too. Those are real money at that merchant and none of Yipyy's
    // business; inventing ledger rows for them would put a facility's own
    // walk-in trade into their Yipyy revenue.
    return {
      kind: "not_ours",
      detail: "No Yipyy payment carries this processor id.",
    };
  }

  const active = await validAccessToken(facilityId);
  if (!active) {
    return {
      kind: "unreadable",
      detail: "No usable access token for this merchant.",
    };
  }

  let payment: CloverV3Payment | null;
  let status: number;
  try {
    const response = await fetch(
      new URL(
        `/v3/merchants/${active.merchantId}/payments/${cloverPaymentId}?expand=refunds`,
        config.apiOrigin,
      ),
      {
        headers: { Authorization: `Bearer ${active.accessToken}` },
        signal: AbortSignal.timeout(20_000),
      },
    );
    status = response.status;
    payment = (await response
      .json()
      .catch(() => null)) as CloverV3Payment | null;
  } catch {
    return { kind: "unreadable", detail: "Could not reach Clover." };
  }

  if (status >= 400 || !payment?.id) {
    return {
      kind: "unreadable",
      detail: `Clover answered ${status} for this payment.`,
    };
  }

  const voided = payment.result === "VOIDED";
  const refunded = (payment.refunds?.elements ?? []).reduce(
    (sum, refund) => sum + Math.max(0, Math.round(Number(refund.amount ?? 0))),
    0,
  );
  // Not added together: a void reverses the payment whole, and Clover leaves
  // refunds empty when it does.
  const reversedAtClover = voided ? cents(original.grand_total) : refunded;

  const { data: ours } = await admin
    .from("payments")
    .select("grand_total")
    .eq("refund_of_payment_id", original.id);

  const reversedInLedger = (ours ?? []).reduce(
    (sum, row) => sum + Math.abs(cents(row.grand_total)),
    0,
  );

  const gap = reversedAtClover - reversedInLedger;
  if (gap <= 0) {
    return {
      kind: "settled",
      detail:
        reversedAtClover === 0
          ? "Clover has reversed nothing on this payment."
          : `Already reconciled: ${reversedAtClover} cents reversed, ${reversedInLedger} recorded.`,
    };
  }

  // A FULL reversal is mirrored exactly — every component negated, so tax and
  // tip come back as they went out. A PARTIAL one cannot be split that way
  // without inventing an allocation, so it lands on the subtotal and the event
  // says so rather than quietly assigning somebody's tip.
  const full = gap === cents(original.grand_total) && reversedInLedger === 0;

  const row = full
    ? {
        subtotal: -Number(original.subtotal),
        tax: -Number(original.tax),
        tip: -Number(original.tip),
        grand_total: -Number(original.grand_total),
        amount_charged: -Number(original.amount_charged),
      }
    : {
        subtotal: -gap / 100,
        tax: 0,
        tip: 0,
        grand_total: -gap / 100,
        amount_charged: -gap / 100,
      };

  // Clover's own id for the reversal — the void's, or the refund's. Never one
  // we invent: `payments_processor_identity` is unique on it, so a made-up
  // value would be a made-up identity that a real delivery could then collide
  // with. Falling back to the payment id keeps the row insertable if Clover
  // ever omits both, and it will collide loudly rather than silently.
  const reference =
    (voided
      ? payment.voidPaymentRef?.id
      : payment.refunds?.elements?.[0]?.id) ?? cloverPaymentId;

  const { error } = await admin.from("payments").insert({
    facility_id: original.facility_id,
    booking_id: original.booking_id,
    client_id: original.client_id,
    method: original.method,
    ...row,
    processor: "clover",
    processor_payment_id: reference,
    refund_of_payment_id: original.id,
    card_brand: original.card_brand,
    card_last4: original.card_last4,
    entry_method: original.entry_method,
    // `payments` has no note column, so the author line is the only place the
    // reason survives on the row itself. The full detail — Clover's void
    // reason, the amounts on both sides — is on the webhook event.
    author_name: voided
      ? `Voided at Clover (${payment.voidReason ?? "no reason given"})`
      : "Refunded at Clover",
  });

  if (error) {
    return {
      kind: "unreadable",
      detail: `Clover reversed ${gap} cents but the ledger refused the row: ${error.message}`,
    };
  }

  return {
    kind: "reversed",
    amountCents: gap,
    detail: full
      ? `${voided ? "Voided" : "Refunded"} in full at Clover; ledger mirrored.`
      : `Partial reversal of ${gap} cents recorded against the subtotal — Clover does not say how it splits across tax and tip.`,
  };
}

export type ConnectionCheck = "live" | "revoked" | "unreachable";

/**
 * Is this merchant still ours?
 *
 * Asked whenever Clover reports an app-level event, because install, uninstall
 * and subscription changes all arrive as the same `A:` object and the payload
 * does not say which. Rather than infer it from the CREATE/UPDATE/DELETE verb —
 * a guess about Clover's vocabulary — the question is put to the API: a
 * merchant we can still read is connected, and a 401 is the grant being gone.
 *
 * `unreachable` is deliberately its own answer. A network blip must not revoke
 * a working merchant, so anything that is not a definite refusal leaves the
 * connection exactly as it was.
 */
export async function verifyConnection(
  facilityId: string,
): Promise<ConnectionCheck> {
  const config = cloverConfig();
  if (!config) return "unreachable";

  const active = await validAccessToken(facilityId);
  // No token at all, after a refresh attempt, is the strongest signal short of
  // a 401 — but it is still not a refusal from Clover, so it is not treated as
  // one. validAccessToken has already recorded the error on the connection.
  if (!active) return "unreachable";

  try {
    const response = await fetch(
      new URL(`/v3/merchants/${active.merchantId}`, config.apiOrigin),
      {
        headers: { Authorization: `Bearer ${active.accessToken}` },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (response.ok) return "live";
    if (response.status === 401 || response.status === 403) return "revoked";
    return "unreachable";
  } catch {
    return "unreachable";
  }
}
