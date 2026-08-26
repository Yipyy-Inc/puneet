import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { getFacilityContext } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import {
  refundableFor,
  refundPayments,
  totalRefundable,
  type RefundablePayment,
} from "@/lib/clover/refund";

// ============================================================================
// Giving money back over the counter.
//
// ── WHAT THIS FINISHES ────────────────────────────────────────────────────
//
// The retail return screen could take a return, apply the facility's refund
// rules, issue store credit and a gift card — and could not put a penny back on
// a card. It said so honestly ("settle it at the terminal"), which was the
// right answer while it was true, and it stopped being true on 2026-08-25 when
// `/api/payments/retail/charge` began writing real `payments` rows. A counter
// sale has carried a `processor_payment_id` ever since. This reverses it.
//
// ── A SALE WITH A BOOKING IS NOT REFUNDED HERE ────────────────────────────
//
// The single refusal worth reading twice. `/api/payments/clover/refund` is the
// route for those, and not because of tidiness: refunding a booking's payment
// through here would move the money correctly and leave `bookings.amount_paid`
// and `payment_status` derived from a ledger the booking screen never learns
// changed. The check below is `booking_id is null`, asked of the ROW rather
// than trusted from the caller, so naming a booking payment cannot get one
// reversed by the wrong door.
//
// ── THE AMOUNT IS BOUNDED BY THE ROW, NOT BY THE REQUEST ──────────────────
//
// `/api/payments/retail/charge` takes its figure from the browser, and says at
// length why it has to: retail carts are fixtures and there is no server-side
// total to derive. That is a real weakening and it does NOT apply here. A
// refund has a row to measure against — what was charged, minus what has
// already gone back — so the ceiling is computed, and an amount above it is
// refused with the figure that was actually available. Do not copy the charge
// route's compromise into a route that has a number of its own.
// ============================================================================

export const dynamic = "force-dynamic";
// A card-present reversal waits on the device the same way a sale does.
export const maxDuration = 150;

const RetailRefund = z.object({
  /** The `payments` row, from `/api/payments/retail/sales`. */
  paymentId: z.string().uuid(),
  /** Omit to give back everything still refundable on this sale. */
  amountCents: z.number().int().positive().max(500_000).optional(),
  /** Why. Lands on `payments.note`, which is the only place it survives. */
  reason: z.string().max(500).optional(),
});

/** `processor_payment_id` is NULLABLE on the table — a cash sale has nothing at
 *  a processor. `RefundablePayment` requires it because by the time the engine
 *  runs it has been proven present, so the null lives here and is narrowed
 *  below rather than being cast away. */
type SaleRow = Omit<RefundablePayment, "processor_payment_id"> & {
  facility_id: string;
  processor_payment_id: string | null;
};

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = RetailRefund.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  // facility-from-request-ok: the session's facility, and the row is matched
  // against it below. A body naming another business would otherwise reverse a
  // sale through somebody else's merchant.
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  // Asked BEFORE Clover, not only by `payments_insert` when the negative row is
  // written — that policy fires after the money has already moved. The database
  // stays the authority; this is the stop in front of the irreversible step.
  if (!holds(await myPermissions(), "process_refund")) {
    return NextResponse.json(
      { error: "You are not allowed to process refunds at this facility." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();

  // The caller's own client, so `payments_read` decides whether this sale is
  // theirs to see at all — and `.is("booking_id", null)` is part of the MATCH,
  // not a check afterwards, so a booking payment is simply not found here.
  const { data: row } = await supabase
    .from("payments")
    .select(
      "id, facility_id, processor_payment_id, grand_total, processor_device_serial",
    )
    .eq("id", parsed.data.paymentId)
    .eq("facility_id", context.facilityId)
    .is("booking_id", null)
    .gt("grand_total", 0)
    .maybeSingle();

  const sale = row as SaleRow | null;
  if (!sale) {
    // Deliberately one answer for "no such sale", "not yours", "that belongs to
    // a booking" and "that is already a refund". Telling them apart would let a
    // caller map another facility's till by guessing ids.
    return NextResponse.json(
      { error: "No counter sale to refund." },
      { status: 404 },
    );
  }

  if (!sale.processor_payment_id) {
    // Cash and store credit leave a row with nothing at a processor. There is
    // no card to credit, and saying so beats a 502 from Clover about an id it
    // has never seen.
    return NextResponse.json(
      {
        error:
          "That sale was not taken on a card, so there is nothing to reverse at Clover.",
      },
      { status: 409 },
    );
  }

  // Narrowed, not cast: the engine is handed a row whose processor id is known
  // to exist because of the guard directly above.
  const card: RefundablePayment = {
    ...sale,
    processor_payment_id: sale.processor_payment_id,
  };

  const refundable = await refundableFor(supabase, [card]);
  const totalCents = totalRefundable(refundable);
  if (totalCents <= 0) {
    return NextResponse.json(
      { error: "This sale has already been refunded in full." },
      { status: 409 },
    );
  }

  const wanted = parsed.data.amountCents ?? totalCents;
  if (wanted > totalCents) {
    return NextResponse.json(
      {
        error: `Only ${(totalCents / 100).toFixed(2)} is still refundable on this sale.`,
        refundableCents: totalCents,
      },
      { status: 409 },
    );
  }

  const outcome = await refundPayments({
    facilityId: context.facilityId,
    refundable,
    wantedCents: wanted,
    reason: parsed.data.reason,
  });

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.message }, { status: 503 });
  }

  if (outcome.refundedCents === 0) {
    return NextResponse.json(
      {
        error: outcome.results[0]?.detail ?? "The refund did not go through.",
        results: outcome.results,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    refunded: true,
    refundedCents: outcome.refundedCents,
    // A counter sale is one payment, so a shortfall means Clover gave back less
    // than was asked for — worth surfacing rather than rounding away.
    shortfallCents: wanted - outcome.refundedCents,
    results: outcome.results,
  });
}
