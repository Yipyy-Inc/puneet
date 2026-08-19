import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";
import { chargeOnTerminal, deviceState } from "@/lib/clover/terminal";
import {
  deliverStandardReceipt,
  devicePrinters,
  endTransactionScreen,
  printTextOnDevice,
  readTipOnDevice,
  receiptOptionsOnDevice,
} from "@/lib/clover/print";
import { buildReceiptLines, type ReceiptInput } from "@/lib/clover/receipt";
import {
  emailItemisedReceipt,
  smsItemisedReceipt,
} from "@/lib/clover/receipt-delivery";

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
  /**
   * Ask the CUSTOMER for the tip on the terminal instead of taking `tipCents`
   * from the screen behind the counter. When this is set, `tipCents` is ignored
   * entirely rather than used as a fallback — a tip the payer declined must not
   * reappear because a staff button was left on a percentage.
   */
  tipOnDevice: z.boolean().default(false),
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
    .select(
      "id, ref, facility_id, client_id, amount_due, amount_paid, status, service, service_type, base_price, discount, tip_amount, facilities ( name, timezone ), clients ( name ), booking_pets ( pets ( name ) )",
    )
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
    // And whether it can PRINT. A terminal that takes the payment but has no
    // printer produces a charge with no receipt, and the person finds out after
    // the customer has paid. Asking here costs one read and charges nothing.
    //
    // Only when the device is awake: a sleeping terminal answers this the same
    // way it answers everything else, and a second 15-second timeout on the
    // readiness check is what this branch was written to avoid.
    const printers =
      state.kind === "ready"
        ? await devicePrinters(booking.facility_id, parsed.data.deviceSerial)
        : [];
    return NextResponse.json({
      ready: state.kind === "ready",
      state: state.kind,
      detail: state.kind === "ready" ? "The terminal is ready." : state.detail,
      canPrint: printers.length > 0,
      printers: printers.map((p) => ({ id: p.id, name: p.name })),
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

  // ── THE TIP, ASKED OF THE PERSON PAYING ─────────────────────────────────
  //
  // BEFORE the card is presented, because the alternative — authorise, then
  // tip-adjust — needs a pre-authorisation and Canadian merchants cannot take
  // those. `owedCents` is what the tip is calculated on, so the device shows
  // "Tip based on" the subtotal rather than on a figure that already includes
  // somebody else's tip.
  //
  // A null answer is "no tip", never an error: the customer may have declined,
  // and a counter that cannot take money because a tip screen timed out is a
  // worse product than one that takes the money without a tip. `tipPrompted`
  // goes back on the response so staff are told which happened.
  let tipCents = parsed.data.tipCents;
  let tipPrompted = false;
  if (parsed.data.tipOnDevice) {
    const chosen = await readTipOnDevice(
      booking.facility_id,
      parsed.data.deviceSerial,
      owedCents,
    );
    tipPrompted = chosen !== null;
    tipCents = chosen ?? 0;
  }

  const outcome = await chargeOnTerminal({
    facilityId: booking.facility_id,
    bookingId: booking.id,
    clientId: booking.client_id,
    subtotalCents: owedCents,
    tipCents,
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
    // Hand the device back. Without this it spins forever (see below); and a
    // customer who just declined or cancelled should not be thanked, so this
    // arm gets the neutral welcome screen rather than the thank-you one.
    await endTransactionScreen(
      booking.facility_id,
      parsed.data.deviceSerial,
      "welcome",
    );
    return NextResponse.json(
      { error: outcome.message, code: outcome.code },
      { status },
    );
  }

  // ── THE ITEMISED RECEIPT ────────────────────────────────────────────────
  //
  // AFTER the sale, in its own request, and its result is reported but never
  // allowed to change the payment's. The facility asked for the printed receipt
  // to carry the same breakdown as the portal; Clover's REST Pay Display API is
  // payment-only and takes no order or item id, so the breakdown is composed as
  // text and sent to the device's own printer (lib/clover/receipt.ts).
  //
  // A sale that succeeded and a receipt that did not print is a nuisance. A
  // sale reported as failed because a printer jammed is a double charge, so
  // this cannot throw and its failure is a log line and a flag on the response.
  // ── THE CUSTOMER CHOOSES ────────────────────────────────────────────────
  //
  // Clover's own Sale app ends with Print / Email / Text, and a semi-integrated
  // sale that simply stops looks broken beside it. So ask, then deliver.
  //
  // A null answer means they were never asked — an unreachable device, a
  // timeout — which is NOT the same as declining, so it falls back to printing.
  // The one thing this must never do is leave a paying customer with nothing
  // because a dialog failed to open.
  const choice = await receiptOptionsOnDevice(
    booking.facility_id,
    parsed.data.deviceSerial,
  );
  const wantsPrint = !choice || choice.method === "PRINT";

  // Composed ONCE, whichever way it goes out, so the paper copy and the emailed
  // copy cannot disagree.
  const receipt =
    choice?.method === "NO_RECEIPT"
      ? null
      : await receiptInputFor(
          booking as unknown as BookingForReceipt,
          supabase,
          outcome,
        );

  let printed: { printed: boolean; detail?: string } = {
    printed: false,
    detail: choice ? `customer chose ${choice.method}` : undefined,
  };
  let delivered: { delivered: boolean; detail?: string } = { delivered: false };
  // Whether what reached the customer carried the BREAKDOWN. Clover's fallback
  // receipt does not, and staff should not have to guess which one went out.
  let itemised = false;

  if (wantsPrint) {
    if (receipt) {
      printed = await printTextOnDevice(
        booking.facility_id,
        parsed.data.deviceSerial,
        buildReceiptLines(receipt),
      );
      itemised = printed.printed;
    }
    // AND Clover's own, which is the card-brand-compliant one. The docs put
    // that squarely on us for custom receipts — "You are responsible to ensure
    // the receipts printed by your app comply with all card brand" rules — and
    // ours is a breakdown, not a compliant payment record. Two prints off one
    // roll is a cheap way to owe nobody an argument.
    if (outcome.processorPaymentId) {
      delivered = await deliverStandardReceipt(
        booking.facility_id,
        parsed.data.deviceSerial,
        outcome.processorPaymentId,
        "PRINT",
      );
    }
  } else if (choice.method === "EMAIL" || choice.method === "SMS") {
    // ── OURS FIRST, CLOVER'S AS A FLOOR ───────────────────────────────────
    //
    // Clover will happily email a receipt, but it emails CLOVER's receipt, and
    // that one has no line items — there is no Clover order behind this
    // payment. Sending it would answer "the breakdown must be on the receipt"
    // with the old behaviour plus extra steps.
    //
    // So we send ours when we can. When we cannot — no mail service configured
    // on this deployment, a typo'd address — Clover's unitemised copy is still
    // better than the customer walking away with nothing, and `itemised` says
    // which of the two they got.
    const address = choice.additionalData?.trim();
    const ours =
      !address || !receipt
        ? {
            sent: false,
            detail: !address
              ? "the device returned no address"
              : "the receipt could not be composed",
          }
        : choice.method === "EMAIL"
          ? await emailItemisedReceipt(address, receipt)
          : await smsItemisedReceipt(address, receipt);

    if (ours.sent) {
      delivered = { delivered: true };
      itemised = true;
    } else if (outcome.processorPaymentId) {
      delivered = await deliverStandardReceipt(
        booking.facility_id,
        parsed.data.deviceSerial,
        outcome.processorPaymentId,
        choice.method,
        address,
      );
      delivered.detail = delivered.delivered
        ? `sent without the breakdown (${ours.detail})`
        : (delivered.detail ?? ours.detail);
    } else {
      delivered = { delivered: false, detail: ours.detail };
    }
  }

  // ── HAND THE DEVICE BACK ────────────────────────────────────────────────
  //
  // Reported from the running app: after an approved sale "the clover terminal
  // screen keeps loading". Not a hang, and not our timeout — REST Pay Display
  // gives the POS the device for the whole transaction and takes it back only
  // when told. Clover's own words: "End your customer transactions with a call
  // to the Welcome or Thank You screen; otherwise, the spinning icon remains on
  // the screen until another action is taken."
  //
  // We took the money and never told it, so EVERY sale left the terminal
  // spinning until somebody reset it by hand.
  //
  // Last, after the receipt, so the paper is already coming out when the screen
  // clears. Cosmetic, so — like the printer — it may fail without touching the
  // payment.
  const screen = await endTransactionScreen(
    booking.facility_id,
    parsed.data.deviceSerial,
    "thank-you",
  );

  return NextResponse.json({
    paid: true,
    paymentId: outcome.paymentId,
    reference: outcome.processorPaymentId,
    amountCents: outcome.amountCents,
    currency: outcome.currency,
    cardBrand: outcome.cardBrand,
    cardLast4: outcome.cardLast4,
    receiptPrinted: printed.printed,
    receiptDetail: printed.detail,
    receiptMethod: choice?.method ?? "PRINT",
    receiptDelivered: delivered.delivered,
    receiptDeliveryDetail: delivered.detail,
    receiptItemised: itemised,
    tipCents,
    tipPrompted,
    screenCleared: screen.shown,
  });
}

interface BookingForReceipt {
  id: string;
  ref: number;
  facility_id: string;
  service: string;
  service_type: string | null;
  base_price: number | string;
  discount: number | string | null;
  tip_amount: number | string | null;
  facilities: { name: string; timezone: string | null } | null;
  clients: { name: string } | null;
  booking_pets: { pets: { name: string } | null }[] | null;
}

/**
 * Compose and print the itemised receipt. Never throws.
 *
 * The lines are read HERE rather than passed from the client: a receipt is a
 * record of what was charged, and a caller that could name its own line items
 * could print a receipt that disagrees with the payment.
 */
/**
 * Compose the receipt, once, from the booking.
 *
 * Split out from printing because the customer may now ask for it by email or
 * by text instead, and all three must say the same thing. Rendering the emailed
 * copy from a second read is how a paper receipt and an emailed one end up
 * disagreeing about a discount — and the customer holding both is the one who
 * notices.
 *
 * The lines are read HERE rather than passed from the client: a receipt is a
 * record of what was charged, and a caller that could name its own line items
 * could produce one that disagrees with the payment.
 */
async function receiptInputFor(
  booking: BookingForReceipt,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  outcome: Extract<Awaited<ReturnType<typeof chargeOnTerminal>>, { ok: true }>,
): Promise<ReceiptInput | null> {
  try {
    const { data: rows } = await supabase
      .from("booking_line_items")
      .select("name, price, unit_price, quantity")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true });

    const cents = (v: number | string | null | undefined) =>
      Math.round(Number(v ?? 0) * 100);

    const lines = [
      {
        label: booking.service_type || booking.service,
        amountCents: cents(booking.base_price),
      },
      ...(
        (rows ?? []) as {
          name: string;
          price: number | string | null;
          unit_price: number | string;
          quantity: number;
        }[]
      ).map((r) => ({
        label: r.quantity > 1 ? `${r.name} x${r.quantity}` : r.name,
        amountCents:
          r.price === null
            ? cents(Number(r.unit_price) * r.quantity)
            : cents(r.price),
      })),
    ];

    const discountCents = cents(booking.discount);
    const subtotalCents =
      lines.reduce((sum, l) => sum + l.amountCents, 0) - discountCents;
    const tipCents = Math.max(0, outcome.amountCents - subtotalCents);

    return {
      facilityName: booking.facilities?.name ?? "Yipyy",
      reference: `Booking #${booking.ref}`,
      clientName: booking.clients?.name ?? null,
      petNames: (booking.booking_pets ?? [])
        .map((bp) => bp.pets?.name)
        .filter((n): n is string => Boolean(n)),
      lines,
      discountCents,
      subtotalCents,
      tipCents,
      totalCents: outcome.amountCents,
      cardBrand: outcome.cardBrand,
      cardLast4: outcome.cardLast4,
      processorPaymentId: outcome.processorPaymentId,
      // The FACILITY's clock, not the server's. A receipt handed over a counter
      // in Montreal saying 09:00 UTC is wrong on paper nobody can correct.
      printedAt: new Date().toLocaleString("en-CA", {
        timeZone: booking.facilities?.timezone ?? "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }),
    };
  } catch (error) {
    console.warn("[terminal] receipt could not be composed:", error);
    return null;
  }
}
