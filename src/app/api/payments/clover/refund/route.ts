import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";
import {
  refundableFor,
  refundPayments,
  totalRefundable,
  type RefundablePayment,
} from "@/lib/clover/refund";

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
// ── THIS ROUTE ONLY CHOOSES WHAT TO REFUND ────────────────────────────────
//
// Everything that actually reverses money lives in `lib/clover/refund.ts`:
// draining newest-first, the idempotency key, the terminal-vs-ecommerce branch,
// and writing the ledger row from what Clover says happened rather than from
// what we asked for. The shop counter needs the identical machinery, so it was
// extracted rather than copied — see that file for why each step is the shape
// it is.
//
// What stays here is the part that is genuinely about bookings: finding the
// card payments on one, and refusing an amount larger than they still carry.
// A booking can hold more than one — a deposit and a balance are two — so the
// response reports each payment separately, because "refund $30" across two of
// them is two events at the processor and the operator should see both.
// ============================================================================

export const dynamic = "force-dynamic";

const RefundInput = z.object({
  bookingRef: z.number().int().positive(),
  /** Omit to refund everything still refundable on this booking. */
  amountCents: z.number().int().positive().max(2_000_000).optional(),
  reason: z.string().max(500).optional(),
});

type PaymentRow = RefundablePayment & {
  facility_id: string;
  created_at: string;
};

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
    .select(
      "id, facility_id, processor_payment_id, grand_total, created_at, processor_device_serial",
    )
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
  const refundable = await refundableFor(supabase, payments);
  const totalCents = totalRefundable(refundable);

  if (totalCents <= 0) {
    return NextResponse.json(
      { error: "Everything on this booking has already been refunded." },
      { status: 409 },
    );
  }

  const wanted = parsed.data.amountCents ?? totalCents;
  if (wanted > totalCents) {
    return NextResponse.json(
      {
        error: `Only ${(totalCents / 100).toFixed(2)} is still refundable on this booking.`,
        refundableCents: totalCents,
      },
      { status: 409 },
    );
  }

  const outcome = await refundPayments({
    facilityId: booking.facility_id,
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
    // Named when it happens rather than hidden: a partial success is a thing
    // the operator has to act on.
    shortfallCents: wanted - outcome.refundedCents,
    results: outcome.results,
  });
}
