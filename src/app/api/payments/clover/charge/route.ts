import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargeCard } from "@/lib/clover/charge";
import { facilityTaxConfig, taxToAddCents } from "@/lib/payments/booking-tax";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEPOSIT_ROW_SELECT,
  planDeposit,
  requestRows,
  type DepositRow,
} from "@/lib/payments/booking-deposit-server";

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
// ── TAX IS CHARGED, AND RECORDED APART ─────────────────────────────────────
//
// This said "tax is not split out, because nothing records it". Something
// does: `payments.tax` has held the terminal's tax since 2026-08-27, and the
// balance (`amount_due - amount_paid`) is the pre-tax SUPPLY. So this route
// charged a taxed facility's customers no tax at all. The facility's tax is
// added now, from the same helper the pay page uses to show it
// (lib/payments/booking-tax), and `chargeCard` records it in its own column.
// ============================================================================

export const dynamic = "force-dynamic";

// ── A CARD, OR A CARD THEY ALREADY GAVE US ────────────────────────────────
//
// Exactly one of the two. `source` is a fresh `clv_` token from the hosted
// fields; `savedCardId` names a row in `saved_cards` the customer consented to
// earlier. Modelled as a union rather than two optional fields so "neither" and
// "both" are rejected by the schema instead of by a branch somebody has to
// remember to write.
const ChargeInput = z.union([
  z.object({
    bookingId: z.uuid(),
    /** The `clv_` token from the browser. A card number here would be a bug. */
    source: z.string().min(8).max(200),
    savedCardId: z.undefined().optional(),
    tipCents: z.number().int().min(0).max(100_000).default(0),
    /** A deposit link (/pay/{ref}?deposit=1): the share, not the balance. */
    purpose: z.literal("deposit").optional(),
  }),
  z.object({
    bookingId: z.uuid(),
    source: z.undefined().optional(),
    savedCardId: z.uuid(),
    tipCents: z.number().int().min(0).max(100_000).default(0),
    purpose: z.literal("deposit").optional(),
  }),
]);

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

  if (
    parsed.data.source !== undefined &&
    !parsed.data.source.startsWith("clv_")
  ) {
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
    .select(
      "id, facility_id, client_id, amount_due, amount_paid, total_cost, extras_total, taxable_extras_total, taxable, status",
    )
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

  // ── A DEPOSIT IS ITS SHARE, WORKED OUT HERE ─────────────────────────────
  //
  // The deposit link (the booking wizard, 2026-10-02) names no amount: this
  // booking's share of the deposit its request owes, by the facility's rule,
  // from the rows — the same arithmetic as the wizard and the cash path. No
  // tip rides on a deposit.
  let subtotalCents = owedCents;
  let tipCents = parsed.data.tipCents;
  if (parsed.data.purpose === "deposit") {
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: full } = await admin
      .from("bookings")
      .select(DEPOSIT_ROW_SELECT)
      .eq("id", booking.id)
      .maybeSingle();
    const rows = full
      ? await requestRows(admin, full as unknown as DepositRow)
      : [];
    const share = (await planDeposit(admin, rows)).shares.find(
      (s) => s.bookingId === booking.id,
    );
    if (!share) {
      return NextResponse.json(
        { error: "No deposit is due on this booking." },
        { status: 409 },
      );
    }
    subtotalCents = Math.min(owedCents, Math.round(share.amount * 100));
    tipCents = 0;
  }

  // ── A STORED CARD IS RESOLVED HERE, AS THE CALLER ───────────────────────
  //
  // Read with the caller's own client, so `saved_cards_read` decides whether
  // they may use it: its owner, or staff trusted with money at that facility.
  // Enumerating that in TypeScript would restate a rule the database already
  // holds, and eventually restate it differently.
  let source: string | null = parsed.data.source ?? null;
  let storedCard: Parameters<typeof chargeCard>[0]["storedCard"];

  if (parsed.data.savedCardId) {
    const { data: card } = await supabase
      .from("saved_cards")
      .select("id, processor_customer_id, consent_at, revoked_at, facility_id")
      .eq("id", parsed.data.savedCardId)
      .eq("facility_id", booking.facility_id)
      .is("revoked_at", null)
      .maybeSingle();

    if (!card) {
      return NextResponse.json(
        { error: "That saved card is not available." },
        { status: 404 },
      );
    }

    // Consent is checked HERE, not trusted from the screen that stored it.
    // Clover requires explicit cardholder agreement before a stored credential
    // is charged, and a card whose consent was never recorded has none.
    if (!card.consent_at) {
      return NextResponse.json(
        {
          error:
            "That card was saved without the cardholder's consent to charge it again.",
        },
        { status: 409 },
      );
    }

    // Clover takes the CUSTOMER id as the source for a card-on-file charge.
    source = card.processor_customer_id;
    storedCard = {
      // The customer is on the screen choosing this card, so the charge is
      // cardholder-initiated and not scheduled. A recurring charge would say
      // `merchant` and `scheduled: true`, and nothing here does that yet.
      initiator: "cardholder",
      scheduled: false,
      savedCardId: card.id,
    };
  }

  if (!source) {
    // Unreachable through the schema, which requires one of the two. Asserted
    // rather than forced with `!`, because the thing being asserted is what
    // Clover is about to be told to charge.
    return NextResponse.json(
      { error: "No card was supplied." },
      { status: 400 },
    );
  }

  // The facility's tax, read with the admin client: a customer paying by link
  // cannot read `facility_settings` under RLS, and the booking itself was
  // already established above through the caller's own client.
  const taxCents = taxToAddCents(
    await facilityTaxConfig(createAdminClient(), booking.facility_id),
    subtotalCents,
    booking,
  );

  const outcome = await chargeCard({
    facilityId: booking.facility_id,
    bookingId: booking.id,
    clientId: booking.client_id,
    subtotalCents,
    taxCents,
    tipCents,
    source,
    storedCard,
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
    // Clover's id for the charge, not ours. It is what their dashboard is
    // searched by, so it is the only reference worth putting in front of
    // somebody who may have to ask about this payment later.
    reference: outcome.processorPaymentId,
    amountCents: outcome.amountCents,
    currency: outcome.currency,
    cardBrand: outcome.cardBrand,
    cardLast4: outcome.cardLast4,
  });
}
