import "server-only";

// ============================================================================
// The itemised receipt, as lines of text for the terminal's own printer.
//
// ── WHY TEXT AND NOT AN ORDER ─────────────────────────────────────────────
//
// Reported from the running app: "when we print the receipt from the terminal,
// it needs to have all the detailed breakdown on it like we should see in the
// portal". The obvious route is Clover's order model — create an order, add
// line items, take the payment against it, and let Clover print what it knows.
//
// That route is closed for this integration. The terminal here speaks the REST
// Pay Display API (`/connect/v1/payments`), which Clover documents as a
// payment-only interface that "does not support passing an order ID or item ID
// directly". Orders belong to the v3 REST API and the Developer Pay endpoint,
// neither of which drives a semi-integrated terminal.
//
// What the same API DOES offer is a printer: `/connect/v1/device/print` takes
// `{ printDeviceId, text: [...] }` and prints those lines on the device's own
// roll. So the breakdown is composed here, from the same figures the booking
// page renders, and printed as a second act.
//
// ── AND THAT IS WHY THE PAYMENT CALL IS UNTOUCHED ─────────────────────────
//
// Printing happens AFTER an approved sale, in its own request. Nothing about
// how money is taken changes — which matters, because the terminal leg is the
// one part of this integration never exercised in production. A print that
// fails must leave a completed payment completed.
//
// ── 32 CHARACTERS ─────────────────────────────────────────────────────────
//
// Clover's built-in printers are 80mm and render this text monospaced at 32
// columns. Lines longer than that wrap, which turns a tidy right-aligned total
// into two ragged lines, so amounts are laid out against that width here rather
// than discovered on paper.
// ============================================================================

/** The printable width of a Clover receipt, in monospace characters. */
const WIDTH = 32;

function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/**
 * "Bag of food              $24.00" — label left, amount hard right.
 *
 * A label too long to leave room is truncated with an ellipsis rather than
 * allowed to wrap: a wrapped line puts the amount on a row of its own, under
 * the wrong label.
 */
function row(label: string, cents: number): string {
  const amount = money(cents);
  const room = WIDTH - amount.length - 1;
  const left = label.length > room ? `${label.slice(0, room - 1)}…` : label;
  return `${left}${" ".repeat(Math.max(1, WIDTH - left.length - amount.length))}${amount}`;
}

function centred(text: string): string {
  if (text.length >= WIDTH) return text.slice(0, WIDTH);
  const pad = Math.floor((WIDTH - text.length) / 2);
  return `${" ".repeat(pad)}${text}`;
}

const RULE = "-".repeat(WIDTH);

export interface ReceiptLine {
  label: string;
  amountCents: number;
}

export interface ReceiptInput {
  facilityName: string;
  /** "Booking #1234" — whatever names this sale on paper. */
  reference: string | null;
  clientName: string | null;
  petNames: string[];
  /** The service, the added items, the fees — in the order they should read. */
  lines: ReceiptLine[];
  discountCents: number;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
  /** Clover's own payment id, so a paper receipt maps to a transaction. */
  processorPaymentId: string | null;
  /** Rendered as-is; the caller owns the timezone. */
  printedAt: string;
}

/**
 * The receipt, as the array `/connect/v1/device/print` wants.
 *
 * Pure: no clock, no locale lookup, nothing that can throw. The caller supplies
 * `printedAt` already formatted, because the facility's timezone is a property
 * of the facility and not of this process.
 */
export function buildReceiptLines(input: ReceiptInput): string[] {
  const out: string[] = [];

  out.push(centred(input.facilityName.slice(0, WIDTH)));
  out.push("");
  if (input.reference) out.push(input.reference);
  if (input.clientName) out.push(input.clientName);
  if (input.petNames.length > 0) {
    // One line however many pets; a stay for three dogs should not push the
    // total off the bottom of a short roll.
    out.push(`Pet: ${input.petNames.join(", ")}`.slice(0, WIDTH));
  }
  out.push(input.printedAt);
  out.push(RULE);

  for (const line of input.lines) {
    out.push(row(line.label, line.amountCents));
  }

  if (input.discountCents > 0) {
    out.push(row("Discount", -input.discountCents));
  }

  out.push(RULE);
  out.push(row("Subtotal", input.subtotalCents));
  if (input.tipCents > 0) out.push(row("Tip", input.tipCents));
  out.push(row("TOTAL", input.totalCents));
  out.push(RULE);

  const card = [
    input.cardBrand,
    input.cardLast4 ? `••${input.cardLast4}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  if (card) out.push(row("Paid by card", input.totalCents));
  if (card) out.push(card);
  if (input.processorPaymentId) {
    out.push(`Ref: ${input.processorPaymentId}`.slice(0, WIDTH));
  }

  out.push("");
  out.push(centred("Thank you"));
  out.push("");

  return out;
}
