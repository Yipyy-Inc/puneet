import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { chargeCard } from "@/lib/clover/charge";

// ============================================================================
// Charging a card against a booking.
//
// ── RLS IS THE AUTHORISATION, NOT A ROLE CHECK ────────────────────────────
//
// Two completely different people legitimately pay for a booking: a member of
// staff at the counter, and the customer themselves online. Enumerating that
// here would mean re-deriving, in TypeScript, a rule the database already
// states — and getting it subtly different.
//
// So the booking is read with the CALLER'S own client. `bookings_read` admits
// a platform admin, the client the booking belongs to, or someone with
// view_bookings at that facility. If the row comes back, the caller is one of
// those. If it does not, they are not, and there is nothing further to decide.
//
// ── THE AMOUNT IS NEVER IN THE REQUEST ────────────────────────────────────
//
// It is amount_due minus amount_paid, off the row we just read. A body that
// could name its own amount is a body that can pay a $200 boarding stay with
// one cent, and no amount of validation elsewhere recovers from that.
//
// The tip IS taken from the request, because a tip is genuinely the payer's
// decision. It is bounded in chargeCard.
//
// ── TAX IS NOT SPLIT OUT, BECAUSE NOTHING RECORDS IT ──────────────────────
//
// `bookings` has base_price, discount, extras_total and amount_due. There is no
// tax column, so the whole balance is passed as subtotal and the ledger's tax
// reads 0. That is truthful — inventing a split would put a number in a tax
// column that nobody calculated.
// ============================================================================

export const dynamic = "force-dynamic";

const ChargeInput = z.object({
  bookingId: z.uuid(),
  /** The `clv_` token from the browser. A card number here would be a bug. */
  source: z.string().min(8).max(200),
  tipCents: z.number().int().min(0).max(100_000).default(0),
});

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = ChargeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  if (parsed.data.source.startsWith("clv_") === false) {
    // Refused loudly rather than forwarded. If a raw PAN ever reaches this
    // route, sending it to Clover would put the card number in our logs and
    // this server inside PCI scope — the one thing the hosted iframe exists to
    // prevent.
    return NextResponse.json(
      { error: "That is not a payment token." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, facility_id, client_id, amount_due, amount_paid, status")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  if (!booking) {
    // Deliberately the same answer whether the booking does not exist or the
    // caller may not see it. The difference is not theirs to learn.
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
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

  const outcome = await chargeCard({
    facilityId: booking.facility_id,
    bookingId: booking.id,
    clientId: booking.client_id,
    subtotalCents: owedCents,
    tipCents: parsed.data.tipCents,
    source: parsed.data.source,
    createdBy: viewer.userId,
    authorName: viewer.email ?? "Online payment",
  });

  if (!outcome.ok) {
    // A declined card is the customer's problem to solve and gets a 402; a
    // broken connection is ours and gets a 5xx. Collapsing them would send a
    // customer to their bank over our outage.
    const status =
      outcome.code === "declined"
        ? 402
        : outcome.code === "not_connected" ||
            outcome.code === "unknown_currency"
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
    amountCents: outcome.amountCents,
    currency: outcome.currency,
    cardBrand: outcome.cardBrand,
    cardLast4: outcome.cardLast4,
  });
}
