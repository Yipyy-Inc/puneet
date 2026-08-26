import type { SupabaseClient } from "@supabase/supabase-js";

import { cloverConfig } from "@/lib/clover/config";
import { validAccessToken } from "@/lib/clover/connection";
import { reconcilePayment } from "@/lib/clover/reconcile";
import { refundOnTerminal } from "@/lib/clover/terminal";

// ============================================================================
// Giving money back at Clover — the part that is the same wherever it started.
//
// This was the body of `/api/payments/clover/refund` until 2026-08-26, when the
// shop counter needed the identical machinery. Only the SELECTION of what to
// refund differs between the two: the booking route finds the card payments on
// a booking, the retail route is handed one counter sale. Everything after that
// — draining newest-first, the idempotency key, which Clover endpoint reverses
// a card-present sale, retrying a throw but never a refusal, and writing the
// ledger row from what Clover says rather than from what we asked for — is one
// piece of code, and it is this one.
//
// It was extracted rather than copied deliberately. Every comment below marks a
// trap that was paid for once, and a second copy of this loop is a second place
// for the next one to be paid for again.
// ============================================================================

/** The columns this needs off a `payments` row. Select at least these. */
export interface RefundablePayment {
  id: string;
  processor_payment_id: string;
  grand_total: number | string;
  /** Set only on a card-present sale — and it decides which Clover this row
   *  has to be reversed at. See the branch below. */
  processor_device_serial: string | null;
}

export interface RefundSlice {
  payment: RefundablePayment;
  /** Cents still reversible on this payment, after anything already given back. */
  remaining: number;
}

export interface RefundResult {
  processorPaymentId: string;
  amountCents: number;
  ok: boolean;
  detail: string;
}

export type RefundOutcome =
  | { ok: false; code: "not_connected" | "not_configured"; message: string }
  | { ok: true; refundedCents: number; results: RefundResult[] };

const cents = (value: number | string) => Math.round(Number(value) * 100);

/**
 * What each of these payments still has left to give back.
 *
 * Read with the CALLER'S client, so a reversal the caller may not see is never
 * silently treated as absent — `payments_read` is the boundary and it applies
 * to the negative rows exactly as it does to the positive ones.
 */
export async function refundableFor(
  supabase: SupabaseClient,
  payments: RefundablePayment[],
): Promise<RefundSlice[]> {
  if (payments.length === 0) return [];

  const { data: reversals } = await supabase
    .from("payments")
    .select("refund_of_payment_id, grand_total")
    .in(
      "refund_of_payment_id",
      payments.map((p) => p.id),
    );

  const reversedByPayment = new Map<string, number>();
  for (const row of reversals ?? []) {
    const key = row.refund_of_payment_id as string;
    reversedByPayment.set(
      key,
      (reversedByPayment.get(key) ?? 0) +
        Math.abs(cents(row.grand_total as number | string)),
    );
  }

  return payments.map((payment) => ({
    payment,
    remaining:
      cents(payment.grand_total) - (reversedByPayment.get(payment.id) ?? 0),
  }));
}

/**
 * The total still refundable, floored per payment so an over-reversal on one
 * row cannot borrow against the balance of another.
 */
export const totalRefundable = (slices: RefundSlice[]): number =>
  slices.reduce((sum, slice) => sum + Math.max(0, slice.remaining), 0);

/**
 * Drain `wantedCents` across `refundable`, in the order given.
 *
 * The caller decides that order and has already checked the permission — this
 * moves money, so by the time it is called the irreversible step must already
 * be authorised. `payments_insert` stays the backstop for the ledger row.
 */
export async function refundPayments(input: {
  facilityId: string;
  /** Newest first, by convention: the most recent payment is drained first. */
  refundable: RefundSlice[];
  wantedCents: number;
  /** The operator's reason. Lands on `payments.note` via `reconcilePayment`. */
  reason?: string;
}): Promise<RefundOutcome> {
  const active = await validAccessToken(input.facilityId);
  if (!active) {
    return {
      ok: false,
      code: "not_connected",
      message:
        "The connection to Clover could not be used. Reconnect the payment account.",
    };
  }

  // The merchant's estate, resolved from the token we are about to use.
  const config = cloverConfig(active.environment);
  if (!config) {
    return {
      ok: false,
      code: "not_configured",
      message: `Clover is not configured for ${active.environment}.`,
    };
  }

  const results: RefundResult[] = [];
  let outstanding = input.wantedCents;

  for (const { payment, remaining } of input.refundable) {
    if (outstanding <= 0) break;
    if (remaining <= 0) continue;

    const slice = Math.min(outstanding, remaining);

    // ── OMITTING THE AMOUNT MEANS THE WHOLE ORIGINAL CHARGE ────────────────
    //
    // Not "whatever is left". This read `slice === remaining`, which is true of
    // the LAST slice of an already-part-refunded payment — so refunding the
    // final $32.50 of a $62.50 charge asked Clover to reverse $62.50 and got
    // back "Refund bigger than original payment".
    //
    // So the amount may only be omitted when nothing has been given back yet
    // AND this slice covers all of it. Every other case names its figure.
    const originalCents = cents(payment.grand_total);
    const full = remaining === originalCents && slice === remaining;

    // Deterministic, and load-bearing twice over: a double-clicked button is
    // ONE refund because Clover returns the original for a repeated key, and
    // that same property is what makes the retry below safe. It includes what
    // was already reversed, so a genuine second refund of the same amount later
    // is a different key and goes through.
    const idempotencyKey = `refund:${payment.id}:${remaining}:${slice}`;

    // ── WHICH CLOVER GIVES IT BACK DEPENDS ON HOW IT WAS TAKEN ─────────────
    //
    // A card-present sale carries the serial of the device that took it, and
    // that device is the only thing that can partially reverse it. The booking
    // route sent every refund to the ecommerce endpoint until 2026-08-25, and
    // the debt map called the terminal case an open question. It is answered,
    // in the sandbox, and the answer is no:
    //
    //   POST /v1/refunds {charge: <a terminal payment>, amount: 1}
    //   -> 400 processing_error
    //      "Partial refund for order with multiple line items/tip/convenience
    //       fee is not supported by this api"
    //
    // A TIP is enough to trigger that, and the terminal asks for a tip. The
    // endpoint Clover's own error recommends — /v1/orders/{id}/returns — is
    // worse than useless here: it answers 200 and refunds the WHOLE order
    // while echoing the amount you asked for back at you. See the note on
    // `refundOnTerminal`, which is where that is written down at length.
    const onDevice = payment.processor_device_serial;

    const send = onDevice
      ? async () =>
          refundOnTerminal({
            facilityId: input.facilityId,
            processorPaymentId: payment.processor_payment_id,
            deviceSerial: onDevice,
            amountCents: full ? undefined : slice,
            idempotencyKey,
          })
      : async () => {
          const response = await fetch(
            new URL("/v1/refunds", config.ecommerceOrigin),
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${active.accessToken}`,
                "Content-Type": "application/json",
                "idempotency-key": idempotencyKey,
                "X-Clover-Merchant-Id": active.merchantId,
              },
              // Amount OMITTED only for an untouched payment being reversed
              // whole. On a same-day charge Clover then reverses the
              // authorisation outright, which is cheaper for the merchant and
              // lands as result=VOIDED.
              body: JSON.stringify({
                charge: payment.processor_payment_id,
                ...(full ? {} : { amount: slice }),
              }),
              signal: AbortSignal.timeout(30_000),
            },
          );
          const body = (await response.json().catch(() => null)) as {
            id?: string;
            message?: string;
            error?: { message?: string };
          } | null;
          return response.ok && Boolean(body?.id)
            ? ({ ok: true, refundId: body?.id ?? null } as const)
            : ({
                ok: false,
                code: "refused",
                message:
                  body?.error?.message ??
                  body?.message ??
                  `Clover refused the refund (${response.status}).`,
              } as const);
        };

    // ── A THROW IS NOT A FAILURE, IT IS AN UNKNOWN ────────────────────────
    //
    // The first version had no catch at all, so a connect timeout to Clover
    // — which happens — crashed the route and answered with no body, leaving
    // the caller unable to tell a refused refund from a possible one.
    //
    // Retried ONCE, which is safe only because of the idempotency key above:
    // if the first attempt never arrived the retry creates the refund, and if
    // it did arrive the retry returns that same one. Exactly one either way.
    let ok = false;
    let detail = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const outcome = await send();
        ok = outcome.ok;
        detail = outcome.ok ? "" : outcome.message;
        // A REFUSAL is an answer, and asking twice will not change it — only a
        // throw is worth retrying. Retrying a 400 would double the wait before
        // the operator is told what Clover said.
        break;
      } catch {
        detail =
          "Clover did not answer. The outcome of this refund is unknown until it is checked.";
      }
    }

    // Asked REGARDLESS of what happened above. reconcilePayment reads Clover's
    // own state and writes only the gap, so it is both how the ledger row gets
    // written on success and how an unknown outcome becomes a known one: if the
    // refund did land despite the timeout, this finds it.
    const reconciled = await reconcilePayment(
      input.facilityId,
      payment.processor_payment_id,
      // The operator's reason, so the row it writes can say why. Parsed since
      // the first version of the booking route and dropped on the floor until
      // 20260825190000 gave `payments` somewhere to put it.
      input.reason,
    );

    if (!ok && reconciled.kind !== "reversed") {
      results.push({
        processorPaymentId: payment.processor_payment_id,
        amountCents: slice,
        ok: false,
        detail: `${detail} ${reconciled.detail}`.trim(),
      });
      // Stop at the first refusal. Continuing would refund part of what was
      // asked for while reporting the whole request as failed.
      break;
    }

    results.push({
      processorPaymentId: payment.processor_payment_id,
      amountCents: slice,
      ok: true,
      detail: ok
        ? reconciled.detail
        : `Clover did not answer, but the refund had landed: ${reconciled.detail}`,
    });
    outstanding -= slice;
  }

  return {
    ok: true,
    refundedCents: results
      .filter((r) => r.ok)
      .reduce((sum, r) => sum + r.amountCents, 0),
    results,
  };
}
