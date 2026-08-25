import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { getFacilityContext } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { chargeCard } from "@/lib/clover/charge";
import { chargeOnTerminal } from "@/lib/clover/terminal";

// ============================================================================
// Taking money over the shop counter.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// Two simulators, four call sites. `processFiservPayment` slept 500ms, rolled
// `Math.random() > 0.1` for the outcome and returned an invented
// `fiserv_<timestamp>` id; `processCloverPayment` in `clover-terminal-service.ts`
// did the same with a `clover_txn_` prefix. Neither contacted anything. A
// facility could ring up a $200 bag of food, watch the screen say approved, and
// have taken nothing — and one sale in ten was told it had been declined by a
// processor that does not exist.
//
// Now it is `lib/clover/charge.ts` and `lib/clover/terminal.ts`, the same two
// functions that charge a booking, against the same live merchant.
//
// ── A RETAIL SALE HAS NO BOOKING, AND THAT IS ALREADY SUPPORTED ───────────
//
// `payments.booking_id` is nullable and `open_payment_intent` takes a null
// booking, so a counter sale is an ordinary ledger row with a client and no
// booking. Nothing needed inventing: the ONLY reason this route exists rather
// than reusing `/api/payments/clover/charge` is the amount, below.
//
// ── THE AMOUNT COMES FROM THE REQUEST, WHICH IS A REAL WEAKENING ──────────
//
// Every other money route in this codebase derives what to charge server-side,
// and `/api/payments/clover/charge` says why in as many words: "a body that
// could name its own amount is a body that can pay a $200 boarding stay with
// one cent."
//
// Retail cannot do that yet. Products, prices and the cart are fixtures in
// `src/data/retail.ts` — there is no server-side row that knows what this sale
// is worth, so there is nothing to derive it from. The alternatives were to
// keep simulating money or to build the retail data layer first; taking the
// money for real, from a figure a member of staff with `financial_take_payment`
// typed at a till, was judged the better of the three.
//
// What that buys is bounded deliberately:
//
//   - `financial_take_payment` is required BEFORE Clover is called, not only
//     by the ledger policy afterwards.
//   - The facility comes from the SESSION. A body naming its own facility
//     would let a member of one business charge through another's merchant.
//   - The amount is capped, so a typo cannot become a five-figure charge.
//   - The cart travels to Clover as line items, so the merchant's own dashboard
//     shows what was sold rather than a bare total.
//
// When retail sales become rows, this route should derive the total from them
// and the cap below should go. Until then the limit is stated rather than
// hidden.
// ============================================================================

export const dynamic = "force-dynamic";
// Card-present holds the request open while somebody finds their card; the
// booking terminal route uses the same figure for the same reason.
export const maxDuration = 150;

/** $5,000. A counter sale, not a wire transfer. */
const MAX_SALE_CENTS = 500_000;

const RetailCharge = z.object({
  subtotalCents: z.number().int().min(1).max(MAX_SALE_CENTS),
  taxCents: z.number().int().min(0).max(MAX_SALE_CENTS).default(0),
  tipCents: z.number().int().min(0).max(100_000).default(0),
  /** Who bought it, when the till knows. A walk-in has nobody. */
  clientRef: z.number().int().positive().nullable().default(null),
  /** The `clv_` token from the hosted fields — card-not-present. */
  source: z.string().min(8).max(200).optional(),
  /** The terminal's SERIAL — card-present. Exactly one of these two. */
  deviceSerial: z.string().min(3).max(64).optional(),
  /** What was sold, so Clover's dashboard is not a row of bare totals. */
  lines: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        unitPriceCents: z.number().int().min(0).max(MAX_SALE_CENTS),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .max(200)
    .default([]),
  note: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = RetailCharge.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // One tender or the other, never both and never neither. "Both" is a request
  // that has not decided what it is, and guessing would charge the wrong way.
  if (Boolean(input.source) === Boolean(input.deviceSerial)) {
    return NextResponse.json(
      { error: "Name either a card token or a terminal, not both." },
      { status: 400 },
    );
  }

  if (input.source && !input.source.startsWith("clv_")) {
    // The same refusal the booking charge route makes, for the same reason: a
    // raw card number forwarded from here would put the PAN in our logs and
    // this server inside PCI scope, which is what the hosted iframe exists to
    // prevent.
    return NextResponse.json(
      { error: "That is not a payment token." },
      { status: 400 },
    );
  }

  // facility-from-request-ok: taken from the SESSION below, never the body.
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  if (!holds(await myPermissions(), "financial_take_payment")) {
    return NextResponse.json(
      { error: "You are not allowed to take payments at this facility." },
      { status: 403 },
    );
  }

  // The buyer, when there is one. Read with the CALLER'S client so a client ref
  // from another facility resolves to nothing rather than to somebody else's
  // customer — `clients_read` is the boundary, not this lookup.
  let clientId: string | null = null;
  if (input.clientRef !== null) {
    const supabase = await createServerClient();
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", input.clientRef)
      .maybeSingle();
    if (!client) {
      return NextResponse.json(
        { error: "That customer could not be found." },
        { status: 404 },
      );
    }
    clientId = client.id;
  }

  const orderLines = input.lines.map((line) => ({
    name: line.name,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
  }));

  const shared = {
    facilityId: context.facilityId,
    // The whole point: a counter sale belongs to no booking.
    bookingId: null,
    clientId,
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    tipCents: input.tipCents,
    createdBy: viewer.userId,
    authorName: viewer.fullName ?? viewer.email ?? "Counter sale",
    orderLines,
    orderNote: input.note ?? "Retail sale",
  };

  const outcome = input.deviceSerial
    ? await chargeOnTerminal({ ...shared, deviceSerial: input.deviceSerial })
    : await chargeCard({ ...shared, source: input.source! });

  if (!outcome.ok) {
    // The same status vocabulary the booking routes use, so one client-side
    // handler can read either: 402 is the card saying no, 503 is the
    // integration being unusable, 502 is everything else.
    const status =
      outcome.code === "card_declined" || outcome.code === "declined"
        ? 402
        : outcome.code === "not_connected" ||
            outcome.code === "unknown_currency" ||
            outcome.code === "not_configured"
          ? 503
          : 502;
    return NextResponse.json(
      { error: outcome.message, code: outcome.code },
      { status },
    );
  }

  return NextResponse.json(
    {
      paymentId: outcome.paymentId,
      processorPaymentId: outcome.processorPaymentId,
      amountCents: outcome.amountCents,
      cardBrand: outcome.cardBrand,
      cardLast4: outcome.cardLast4,
    },
    { status: 201 },
  );
}
