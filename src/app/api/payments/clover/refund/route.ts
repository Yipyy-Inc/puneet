import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";
import { cloverConfig } from "@/lib/clover/config";
import { validAccessToken } from "@/lib/clover/connection";
import { reconcilePayment } from "@/lib/clover/reconcile";

// ============================================================================
// Giving the money back — actually giving it back.
//
// `useRefundBooking` has always written a negative ledger row and stopped. On a
// cash refund that is the whole truth: somebody opened a drawer. On a card it
// was a statement about money that never moved — the books said refunded and
// the customer's card was never credited.
//
// ── THE PERMISSION IS CHECKED BEFORE CLOVER, NOT AFTER ────────────────────
//
// `payments_insert` already refuses a negative row without `process_refund`, so
// the database is the authority and stays that way. But that check happens when
// the LEDGER is written, which here is after Clover has already moved money.
// A caller who cannot refund must be stopped before the irreversible step, so
// the permission is asked for explicitly first. The policy remains the backstop
// for every other path.
//
// ── THE LEDGER ROW IS NOT WRITTEN HERE ────────────────────────────────────
//
// `reconcilePayment` writes it, from what Clover says happened rather than from
// what we asked for. That matters more than it looks:
//
//   a full refund on a same-day charge becomes a VOID, and Clover reports it as
//   result=VOIDED with an EMPTY refunds array — a different shape entirely from
//   the partial case, which reports refundType=REFUND and populates refunds[].
//
// Writing the row from the request would record the shape we assumed. Writing
// it from the read records the shape that happened. It is also gap-based and
// idempotent, so the webhook that arrives seconds later finds nothing left to
// do rather than double-refunding the books.
//
// ── NEWEST FIRST, AND IT SAYS WHAT IT DID ─────────────────────────────────
//
// A booking can carry more than one card payment — a deposit and a balance are
// two. An amount is drained across them from the most recent backwards, and the
// response reports each one, because "refund $30" against two payments is two
// events at the processor and the operator should see both.
// ============================================================================

export const dynamic = "force-dynamic";

const RefundInput = z.object({
  bookingRef: z.number().int().positive(),
  /** Omit to refund everything still refundable on this booking. */
  amountCents: z.number().int().positive().max(2_000_000).optional(),
  reason: z.string().max(500).optional(),
});

interface PaymentRow {
  id: string;
  facility_id: string;
  processor_payment_id: string;
  grand_total: number;
  created_at: string;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = RefundInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // The caller's own client: `bookings_read` decides whether this booking is
  // theirs to see at all.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, facility_id")
    .eq("ref", parsed.data.bookingRef)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  if (!holds(await myPermissions(), "process_refund")) {
    return NextResponse.json(
      { error: "You are not allowed to process refunds at this facility." },
      { status: 403 },
    );
  }

  // Card payments on this booking, newest first. `payments_read` needs
  // financial_view_amounts, so a caller who cannot see money gets an empty list
  // and the same "nothing to refund" answer as a booking that was never paid.
  const { data: rows } = await supabase
    .from("payments")
    .select("id, facility_id, processor_payment_id, grand_total, created_at")
    .eq("booking_id", booking.id)
    .eq("processor", "clover")
    .gt("grand_total", 0)
    .order("created_at", { ascending: false });

  const payments = (rows ?? []) as PaymentRow[];
  if (payments.length === 0) {
    return NextResponse.json(
      { error: "No card payment on this booking to refund." },
      { status: 409 },
    );
  }

  // What each one still has left, after anything already given back.
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
        Math.abs(Math.round(Number(row.grand_total) * 100)),
    );
  }

  const refundable = payments.map((payment) => ({
    payment,
    remaining:
      Math.round(Number(payment.grand_total) * 100) -
      (reversedByPayment.get(payment.id) ?? 0),
  }));

  const totalRefundable = refundable.reduce(
    (sum, entry) => sum + Math.max(0, entry.remaining),
    0,
  );
  if (totalRefundable <= 0) {
    return NextResponse.json(
      { error: "Everything on this booking has already been refunded." },
      { status: 409 },
    );
  }

  const wanted = parsed.data.amountCents ?? totalRefundable;
  if (wanted > totalRefundable) {
    return NextResponse.json(
      {
        error: `Only ${(totalRefundable / 100).toFixed(2)} is still refundable on this booking.`,
        refundableCents: totalRefundable,
      },
      { status: 409 },
    );
  }

  const active = await validAccessToken(booking.facility_id);
  if (!active) {
    return NextResponse.json(
      {
        error:
          "The connection to Clover could not be used. Reconnect the payment account.",
      },
      { status: 503 },
    );
  }

  // The merchant's estate, resolved from the token we are about to use.
  const config = cloverConfig(active.environment);
  if (!config) {
    return NextResponse.json(
      {
        error: `Clover is not configured for ${active.environment}.`,
      },
      { status: 503 },
    );
  }

  const results: {
    processorPaymentId: string;
    amountCents: number;
    ok: boolean;
    detail: string;
  }[] = [];
  let outstanding = wanted;

  for (const { payment, remaining } of refundable) {
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
    const originalCents = Math.round(Number(payment.grand_total) * 100);
    const full = remaining === originalCents && slice === remaining;

    // Deterministic, and load-bearing twice over: a double-clicked button is
    // ONE refund because Clover returns the original for a repeated key, and
    // that same property is what makes the retry below safe. It includes what
    // was already reversed, so a genuine second refund of the same amount later
    // is a different key and goes through.
    const idempotencyKey = `refund:${payment.id}:${remaining}:${slice}`;

    const send = () =>
      fetch(new URL("/v1/refunds", config.ecommerceOrigin), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${active.accessToken}`,
          "Content-Type": "application/json",
          "idempotency-key": idempotencyKey,
          "X-Clover-Merchant-Id": active.merchantId,
        },
        // Amount OMITTED only for an untouched payment being reversed whole.
        // On a same-day charge Clover then reverses the authorisation outright,
        // which is cheaper for the merchant and lands as result=VOIDED.
        body: JSON.stringify({
          charge: payment.processor_payment_id,
          ...(full ? {} : { amount: slice }),
        }),
        signal: AbortSignal.timeout(30_000),
      });

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
        const response = await send();
        const body = (await response.json().catch(() => null)) as {
          id?: string;
          message?: string;
          error?: { message?: string };
        } | null;

        ok = response.ok && Boolean(body?.id);
        detail = ok
          ? ""
          : (body?.error?.message ??
            body?.message ??
            `Clover refused the refund (${response.status}).`);
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
      booking.facility_id,
      payment.processor_payment_id,
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

  const refundedCents = results
    .filter((r) => r.ok)
    .reduce((sum, r) => sum + r.amountCents, 0);

  if (refundedCents === 0) {
    return NextResponse.json(
      {
        error: results[0]?.detail ?? "The refund did not go through.",
        results,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    refunded: true,
    refundedCents,
    // Named when it happens rather than hidden: a partial success is a thing
    // the operator has to act on.
    shortfallCents: wanted - refundedCents,
    results,
  });
}
