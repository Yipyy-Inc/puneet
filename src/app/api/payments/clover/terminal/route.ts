import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";
import { chargeOnTerminal, deviceState } from "@/lib/clover/terminal";

// ============================================================================
// Charging a card on the counter's own terminal.
//
// ── THE REQUEST IS HELD OPEN WHILE SOMEBODY PAYS ──────────────────────────
//
// REST Pay Display is a long poll: Clover keeps the connection while the
// customer reads the screen, finds their card and taps it. The verified sale
// took SEVENTY SECONDS.
//
// So maxDuration is not tuning, it is a correctness requirement. On the default
// serverless limit this function is killed mid-payment — the customer is
// charged and nothing is recorded, which is the single worst outcome available
// to a payments integration. 150s covers a slow customer with room to spare.
//
// ── THIS IS STAFF-ONLY, UNLIKE THE ONLINE PATH ────────────────────────────
//
// /pay/[ref] is deliberately open to the customer as well, because a person
// paying their own booking online is the ordinary case. A terminal is different:
// it is physically behind the counter, and the person pressing the button is
// always staff. So this asks for `financial_take_payment` rather than leaning
// on RLS alone — and asks BEFORE the device is woken, because a payment that
// should not have been started cannot be un-started.
//
// ── THE AMOUNT IS STILL NOT IN THE REQUEST ────────────────────────────────
//
// Same rule as everywhere else: it is `amount_due - amount_paid`, off the row.
// The tip IS from the request, because a tip is the payer's decision — though
// note it must be decided BEFORE the card is presented, since tip-adjust needs
// a pre-authorisation and Canadian merchants cannot take those.
// ============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 150;

const TerminalInput = z.object({
  bookingRef: z.number().int().positive(),
  /** The device SERIAL from the terminals list — not its id. */
  deviceSerial: z.string().min(4).max(64),
  tipCents: z.number().int().min(0).max(100_000).default(0),
  /** Ask the device whether it is awake, and charge nothing. */
  checkOnly: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = TerminalInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, facility_id, client_id, amount_due, amount_paid, status")
    .eq("ref", parsed.data.bookingRef)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  if (!holds(await myPermissions(), "financial_take_payment")) {
    return NextResponse.json(
      { error: "You are not allowed to take payments at this facility." },
      { status: 403 },
    );
  }

  // ── Just asking whether the terminal is awake ────────────────────────────
  if (parsed.data.checkOnly) {
    const state = await deviceState(
      booking.facility_id,
      parsed.data.deviceSerial,
    );
    return NextResponse.json({
      ready: state.kind === "ready",
      state: state.kind,
      detail: state.kind === "ready" ? "The terminal is ready." : state.detail,
    });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "That booking was cancelled." },
      { status: 409 },
    );
  }

  const owedCents = Math.round(
    (Number(booking.amount_due ?? 0) - Number(booking.amount_paid ?? 0)) * 100,
  );
  if (owedCents <= 0) {
    return NextResponse.json(
      { error: "That booking is already paid." },
      { status: 409 },
    );
  }

  const outcome = await chargeOnTerminal({
    facilityId: booking.facility_id,
    bookingId: booking.id,
    clientId: booking.client_id,
    subtotalCents: owedCents,
    tipCents: parsed.data.tipCents,
    deviceSerial: parsed.data.deviceSerial,
    createdBy: viewer.userId,
    authorName: viewer.email ?? "Terminal payment",
  });

  if (!outcome.ok) {
    // A decline and a cancellation are the customer's; a sleeping terminal or a
    // broken connection is ours. Collapsing them would send staff hunting for a
    // fault when somebody simply pressed cancel.
    const status =
      outcome.code === "declined"
        ? 402
        : outcome.code === "cancelled"
          ? 409
          : outcome.code === "not_connected" ||
              outcome.code === "unknown_currency" ||
              outcome.code === "no_token"
            ? 503
            : 500;
    return NextResponse.json(
      { error: outcome.message, code: outcome.code },
      { status },
    );
  }

  return NextResponse.json({
    paid: true,
    paymentId: outcome.paymentId,
    reference: outcome.processorPaymentId,
    amountCents: outcome.amountCents,
    currency: outcome.currency,
    cardBrand: outcome.cardBrand,
    cardLast4: outcome.cardLast4,
  });
}
