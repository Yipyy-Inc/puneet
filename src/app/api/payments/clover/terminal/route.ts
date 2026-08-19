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
  logoAsPrintablePng,
  printImageOnDevice,
  printTextOnDevice,
  readTipOnDevice,
  receiptOptionsOnDevice,
} from "@/lib/clover/print";
import { buildReceiptLines, type ReceiptInput } from "@/lib/clover/receipt";
import { renderReceiptPng } from "@/lib/clover/receipt-image";
import {
  computeTax,
  NO_TAX,
  taxConfigSchema,
  type ComputedTax,
  type TaxConfig,
} from "@/lib/settings/tax";
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
      // The facility's OWN identity travels with the booking: a receipt naming
      // the business, its address and how to reach it is the difference between
      // a record and a note. These columns exist on `facilities`
      // (20260809120000) and were simply never read here.
      "id, ref, facility_id, client_id, amount_due, amount_paid, status, service, service_type, base_price, discount, tip_amount, start_at, end_at, facilities ( name, timezone, phone, email, website, address, logo_url ), clients ( name ), booking_pets ( pets ( name ) )",
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

  // ── TAX IS CHARGED, NOT JUST PRINTED ────────────────────────
  //
  // `amount_due` is a generated column: total_cost + extras_total. There is no
  // tax in it. So a facility that configures GST and QST and then takes a
  // payment was charging the pre-tax figure while the receipt claimed
  // otherwise — Subtotal $49.01, GST $2.45, QST $4.89, TOTAL $49.01, which does
  // not add up and is the sort of thing a customer photographs.
  //
  // Computed HERE, before the card is presented, and added to what is charged.
  // The same numbers then go on the receipt, so paper and ledger cannot
  // disagree — computing tax again at print time is how the two drift apart.
  //
  // A `pricesIncludeTax` facility is unaffected: the tax is already inside the
  // marked price, so nothing is added and the receipt only says how much of the
  // total was tax.
  const bill = await billFor(booking as unknown as BookingForReceipt, supabase);
  const taxOnCharge = computeTax(owedCents, bill.taxConfig);
  const chargeableCents = bill.taxConfig.pricesIncludeTax
    ? owedCents
    : owedCents + taxOnCharge.totalCents;

  // ── THE TIP, ASKED OF THE PERSON PAYING ─────────────────────────────────
  //
  // BEFORE the card is presented, because the alternative — authorise, then
  // tip-adjust — needs a pre-authorisation and Canadian merchants cannot take
  // those. The tip is calculated on the PRE-TAX amount, which is the
  // convention here and the one that favours the customer — a gratuity on top
  // of sales tax is not what "20%" means to the person pressing it.
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
    subtotalCents: chargeableCents,
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
      : receiptInputFor(
          booking as unknown as BookingForReceipt,
          bill,
          taxOnCharge,
          owedCents,
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
      // ── PRINTED AS AN IMAGE, LOGO INCLUDED ────────────────────────────
      //
      // `/print/text` renders in a proportional font, so padding to a column
      // width put every amount at a different place down the right-hand side
      // (lib/clover/receipt-image.ts). One image gives a straight column, and
      // carries the logo in the same job rather than a second call that can
      // half-fail — which is what left 48mm of blank roll above the last one.
      printed = await printReceiptAsImage(
        booking.facility_id,
        parsed.data.deviceSerial,
        receipt,
      );
      // FALLBACK. SVG text needs a font in the runtime; without one the render
      // is valid and entirely blank. Ragged columns beat blank paper.
      if (!printed.printed) {
        printed = await printTextOnDevice(
          booking.facility_id,
          parsed.data.deviceSerial,
          buildReceiptLines(receipt),
        );
      }
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
  start_at: string | null;
  end_at: string | null;
  facilities: {
    name: string;
    timezone: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    } | null;
  } | null;
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
interface Bill {
  lines: { label: string; amountCents: number }[];
  discountCents: number;
  taxConfig: TaxConfig;
}

/**
 * What this booking is made of, and what the facility taxes.
 *
 * Read ONCE per request, before the card is presented, because the figures it
 * produces decide both what is charged and what is printed. Reading them twice
 * is how a receipt comes to disagree with a ledger.
 *
 * The lines are read HERE rather than passed from the client: a receipt is a
 * record of what was charged, and a caller that could name its own line items
 * could produce one that disagrees with the payment.
 */
async function billFor(
  booking: BookingForReceipt,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<Bill> {
  const cents = (v: number | string | null | undefined) =>
    Math.round(Number(v ?? 0) * 100);

  try {
    const [{ data: rows }, { data: settingRow }] = await Promise.all([
      supabase
        .from("booking_line_items")
        .select("name, price, unit_price, quantity")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true }),
      // The FACILITY's tax, not a fixture's. Nothing is added when they have
      // not configured any — see the banner in lib/settings/tax.ts.
      supabase
        .from("facility_settings")
        .select("value")
        .eq("facility_id", booking.facility_id)
        .eq("domain", "tax_config")
        .maybeSingle(),
    ]);

    return {
      lines: [
        {
          label:
            humaniseService(booking.service_type || booking.service) ??
            "Service",
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
      ],
      discountCents: cents(booking.discount),
      taxConfig: parseTaxConfig(settingRow?.value),
    };
  } catch (error) {
    // A bill that cannot be read must not stop a payment: the amount owed comes
    // off the booking row, which is already in hand. The receipt degrades to a
    // single line rather than the sale failing at the counter.
    console.warn("[terminal] bill could not be read:", error);
    return {
      lines: [
        {
          label:
            humaniseService(booking.service_type || booking.service) ??
            "Service",
          amountCents: cents(booking.base_price),
        },
      ],
      discountCents: cents(booking.discount),
      taxConfig: NO_TAX,
    };
  }
}

/**
 * The receipt, from figures already decided.
 *
 * Pure, and takes the SAME tax the card was charged, so the arithmetic on the
 * paper is the arithmetic in the ledger.
 *
 * @param owedCents what was owed before tax — the receipt's Subtotal.
 */
function receiptInputFor(
  booking: BookingForReceipt,
  bill: Bill,
  tax: { lines: ComputedTax[]; totalCents: number },
  owedCents: number,
  outcome: Extract<Awaited<ReturnType<typeof chargeOnTerminal>>, { ok: true }>,
): ReceiptInput {
  const lineTotal =
    bill.lines.reduce((sum, l) => sum + l.amountCents, 0) - bill.discountCents;

  // A part-paid booking's line items describe the WHOLE stay while only the
  // balance is being collected. Without this the printed lines would not sum to
  // the subtotal beneath them, so the difference is shown rather than hidden.
  const lines =
    lineTotal !== owedCents
      ? [
          ...bill.lines,
          { label: "Already paid", amountCents: owedCents - lineTotal },
        ]
      : bill.lines;

  // The terminal reports one number: what the customer actually paid. Subtotal
  // and tax are both known, so the tip is what is left — worked out AFTER tax,
  // or a taxed sale reports its tax as gratuity.
  const tipCents = Math.max(
    0,
    outcome.amountCents - owedCents - tax.totalCents,
  );

  const zone = booking.facilities?.timezone ?? "UTC";
  const registrations = bill.taxConfig.showRegistrationOnInvoice
    ? bill.taxConfig.taxes
        .filter((t) => t.enabled && t.registrationNumber)
        .map((t) => `${t.name}: ${t.registrationNumber}`)
        .join(" · ")
    : "";

  return {
    facility: {
      name: booking.facilities?.name ?? "Yipyy",
      address: formatAddress(booking.facilities?.address ?? null),
      phone: booking.facilities?.phone ?? null,
      email: booking.facilities?.email ?? null,
      website: booking.facilities?.website ?? null,
      taxRegistrations: registrations || null,
      logoUrl: booking.facilities?.logo_url || null,
    },
    bookingRef: booking.ref,
    reference: `Booking #${booking.ref}`,
    clientName: booking.clients?.name ?? null,
    petNames: (booking.booking_pets ?? [])
      .map((bp) => bp.pets?.name)
      .filter((n): n is string => Boolean(n)),
    serviceWindow: formatWindow(booking.start_at, booking.end_at, zone),
    lines,
    discountCents: bill.discountCents,
    // For a tax-inclusive facility the tax is already inside what was owed, so
    // the subtotal has to come out from under it or Subtotal + tax would double
    // count and the total would not match the card.
    subtotalCents: bill.taxConfig.pricesIncludeTax
      ? owedCents - tax.totalCents
      : owedCents,
    taxLines: tax.lines.map((t) => ({
      name: t.name,
      rate: t.rate,
      amountCents: t.amountCents,
    })),
    taxTotalCents: tax.totalCents,
    tipCents,
    totalCents: outcome.amountCents,
    paymentMethod: "Paid by card",
    cardBrand: outcome.cardBrand,
    cardLast4: outcome.cardLast4,
    entryMethod: humaniseService(outcome.entryMethod ?? ""),
    authCode: outcome.authCode ?? null,
    processorPaymentId: outcome.processorPaymentId,
    // The FACILITY's clock, not the server's. A receipt handed over a counter
    // in Montreal saying 09:00 UTC is wrong on paper nobody can correct.
    printedAt: new Date().toLocaleString("en-CA", {
      timeZone: zone,
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };
}

/** "full_groom" -> "Full groom". The column stores a key; paper wants a word. */
function humaniseService(raw: string): string | null {
  if (!raw) return null;
  const words = raw.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

/** The address jsonb as one line, or null when the facility has not set one. */
function formatAddress(
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null,
): string | null {
  if (!address) return null;
  const line = [
    address.street,
    address.city,
    [address.state, address.zipCode].filter(Boolean).join(" "),
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

/**
 * "19 Aug 2026, 8:00 a.m. - 6:00 p.m." for a same-day service, or the two dates
 * in full for a stay.
 *
 * A receipt for a day of daycare that does not say WHICH day is not a record of
 * anything, and a boarding receipt that shows only the drop-off hides half of
 * what was bought.
 */
function formatWindow(
  startAt: string | null,
  endAt: string | null,
  zone: string,
): string | null {
  if (!startAt) return null;
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return null;
  const date = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: zone, dateStyle: "medium" });
  const time = (d: Date) =>
    d.toLocaleTimeString("en-CA", { timeZone: zone, timeStyle: "short" });

  if (!endAt) return `${date(start)} ${time(start)}`;
  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return `${date(start)} ${time(start)}`;

  return date(start) === date(end)
    ? `${date(start)}, ${time(start)} - ${time(end)}`
    : `${date(start)} ${time(start)} - ${date(end)} ${time(end)}`;
}

/**
 * The stored tax setting, or none.
 *
 * Parsed rather than cast: `facility_settings.value` is jsonb and a row written
 * by an older shape would otherwise reach the arithmetic. A receipt is the
 * wrong place to discover that a config is malformed, so a bad row means no tax
 * line rather than a thrown request.
 */
function parseTaxConfig(value: unknown): TaxConfig {
  const parsed = taxConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : NO_TAX;
}

/**
 * Print the receipt as one image — logo, lines and a straight column of
 * amounts.
 *
 * Returns `printed: false` when the render came back blank, so the caller can
 * fall back to text rather than hand somebody an empty receipt.
 */
async function printReceiptAsImage(
  facilityId: string,
  deviceSerial: string,
  receipt: ReceiptInput,
): Promise<{ printed: boolean; detail?: string }> {
  const logo = receipt.facility.logoUrl
    ? await logoAsPrintablePng(receipt.facility.logoUrl)
    : null;

  const rendered = await renderReceiptPng(
    receipt,
    logo
      ? {
          dataUri: `data:image/png;base64,${logo.image}`,
          width: logo.width,
          height: logo.height,
        }
      : undefined,
  );
  if (!rendered)
    return { printed: false, detail: "receipt could not be rendered" };

  // A receipt this size is comfortably over 1% ink. Anything under it means the
  // glyphs did not render — a runtime with no font produces a blank page rather
  // than an error.
  if (rendered.ink < 0.01) {
    return {
      printed: false,
      detail: "rendered blank — no font in the runtime",
    };
  }

  return printImageOnDevice(facilityId, deviceSerial, rendered.image);
}
