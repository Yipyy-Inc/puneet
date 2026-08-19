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

/**
 * Break a long value across lines instead of cutting it.
 *
 * `row()` truncates a LABEL because the amount beside it must stay on the same
 * line. Free text has no such constraint, and an address or a payment reference
 * loses its meaning when the tail is dropped.
 */
function wrap(text: string): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word.slice(0, WIDTH);
    } else if (current.length + 1 + word.length <= WIDTH) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word.slice(0, WIDTH);
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function centredWrap(text: string): string[] {
  return wrap(text).map(centred);
}

/**
 * A stored FRACTION as a percentage: 0.09975 -> "9.975%".
 *
 * The rate is a fraction everywhere in this app (see lib/settings/tax.ts), and
 * printing it raw would put "0.05%" beside a 5% tax on paper a customer keeps.
 */
function formatRate(rate: number): string {
  return `${Number((rate * 100).toFixed(4))}%`;
}

const RULE = "-".repeat(WIDTH);

export interface ReceiptLine {
  label: string;
  amountCents: number;
}

/** Who the receipt is FROM. Every field is the facility's own, never a fixture. */
export interface ReceiptFacility {
  name: string;
  /** One line, already assembled: "3824 Saint Patrick St, Montreal, QC H4E 1A4". */
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** "GST: RT 123456789 · QST: QT 987654321", when the facility shows them. */
  taxRegistrations: string | null;
  /**
   * A public URL for the facility's logo.
   *
   * Used by the email copy directly, and by the thermal copy through a separate
   * image print — `/device/print/text` cannot carry it (lib/clover/print.ts).
   */
  logoUrl: string | null;
}

export interface ReceiptTaxLine {
  name: string;
  rate: number;
  amountCents: number;
}

export interface ReceiptInput {
  facility: ReceiptFacility;
  /** The booking's own ref — what Yipyy is asked to trace this sale by. */
  bookingRef: number | null;
  /** "Booking #1234" — whatever names this sale on paper. */
  reference: string | null;
  clientName: string | null;
  petNames: string[];
  /** The service, the added items, the fees — in the order they should read. */
  lines: ReceiptLine[];
  discountCents: number;
  /** Net of discount, before tax and tip. */
  subtotalCents: number;
  taxLines: ReceiptTaxLine[];
  taxTotalCents: number;
  tipCents: number;
  totalCents: number;
  /** "Terminal", "Cash", "Card on file" — how it was actually paid. */
  paymentMethod: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  /** "Contactless", "Chip", "Swiped" — a card-brand receipt names the entry. */
  entryMethod: string | null;
  /** The acquirer's approval code. */
  authCode: string | null;
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

  // ── WHO THIS IS FROM ────────────────────────────────────────────────────
  //
  // Name, address, phone, email. A receipt that says only "Pawradise" is not
  // something a customer can act on: they cannot phone about it, and in most
  // jurisdictions a supplier's address is what makes it a receipt rather than a
  // note. Each is skipped when the facility has not set it, rather than
  // printing a blank line or a fixture's.
  out.push(...centredWrap(input.facility.name));
  if (input.facility.address) out.push(...centredWrap(input.facility.address));
  // Phone and email on their OWN lines rather than joined with a separator:
  // at 32 columns the pair almost always wraps, and it wraps mid-separator —
  // "514 690 8911 ·" sitting alone above the address looks like a fault.
  if (input.facility.phone) out.push(...centredWrap(input.facility.phone));
  if (input.facility.email) out.push(...centredWrap(input.facility.email));
  if (input.facility.taxRegistrations) {
    out.push(...centredWrap(input.facility.taxRegistrations));
  }
  out.push("");

  // ── WHAT IT IS FOR ──────────────────────────────────────────────────────
  //
  // The booking ref first, and deliberately: it is what Yipyy is asked to trace
  // a printed receipt by when a customer brings one back to a counter.
  if (input.reference) out.push(input.reference);
  if (input.clientName) out.push(...wrap(input.clientName));
  if (input.petNames.length > 0) {
    out.push(...wrap(`Pet: ${input.petNames.join(", ")}`));
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
  for (const tax of input.taxLines) {
    out.push(row(`${tax.name} ${formatRate(tax.rate)}`, tax.amountCents));
  }
  if (input.tipCents > 0) out.push(row("Tip", input.tipCents));
  out.push(row("TOTAL", input.totalCents));
  out.push(RULE);

  // ── HOW IT WAS PAID ─────────────────────────────────────────────────────
  //
  // Brand, masked pan, entry method and approval code. These are the fields a
  // card-brand-compliant receipt is expected to carry, and the payments row
  // already stores every one of them — printing a total and a last-4 while
  // `auth_code` and `entry_method` sat unused was leaving the compliant version
  // of this receipt one join away.
  const card = [
    input.cardBrand,
    input.cardLast4 ? `••${input.cardLast4}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  out.push(row(input.paymentMethod ?? "Paid", input.totalCents));
  if (card) out.push(card);
  if (input.entryMethod) out.push(`Entry: ${input.entryMethod}`);
  if (input.authCode) out.push(`Auth: ${input.authCode}`);
  if (input.processorPaymentId) {
    out.push(...wrap(`Ref: ${input.processorPaymentId}`));
  }

  out.push("");
  out.push(centred("Thank you"));
  out.push("");

  return out;
}
// ============================================================================
// The same receipt, for a screen instead of a roll.
//
// ── WHY THESE LIVE BESIDE buildReceiptLines ───────────────────────────────
//
// A customer who chooses Email and a customer who chooses Print are owed the
// same figures. Rendering the email from a different function, reading the
// booking a second time, is how the paper copy and the emailed copy end up
// disagreeing about a discount — and the customer holding both is the one who
// notices. So all three renderers take the SAME ReceiptInput, built once by
// the caller from one read.
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The receipt as an email body.
 *
 * Deliberately a `<pre>` of the very lines that go to the printer rather than a
 * hand-built table: the two cannot drift, because there is only one layout. It
 * reads as a receipt, which is what it is.
 */
export function buildReceiptHtml(input: ReceiptInput): string {
  const body = buildReceiptLines(input).map(escapeHtml).join("\n");
  const contact = [
    input.facility.address,
    [input.facility.phone, input.facility.email].filter(Boolean).join(" · "),
  ].filter((line): line is string => Boolean(line));
  return [
    '<div style="background:#f6f6f7;padding:24px;font-family:system-ui,sans-serif">',
    '<div style="max-width:440px;margin:0 auto;background:#fff;border-radius:12px;padding:24px">',
    // The logo above the name, not instead of it: an image that fails to load
    // in a mail client must not leave the receipt anonymous.
    ...(input.facility.logoUrl
      ? [
          `<img src="${escapeHtml(input.facility.logoUrl)}" alt="${escapeHtml(input.facility.name)}" style="max-width:120px;max-height:60px;margin:0 0 8px;display:block" />`,
        ]
      : []),
    `<h1 style="margin:0;font-size:18px">${escapeHtml(input.facility.name)}</h1>`,
    ...contact.map(
      (line) =>
        `<p style="margin:2px 0 0;color:#6b7280;font-size:12px">${escapeHtml(line)}</p>`,
    ),
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />',
    '<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.45;white-space:pre;overflow-x:auto;margin:0">',
    body,
    "</pre>",
    '<p style="margin:16px 0 0;color:#6b7280;font-size:12px">Thank you for your business.</p>',
    "</div></div>",
  ].join("\n");
}

/**
 * The receipt as a text message.
 *
 * NOT the 32-column layout: padded columns wrap raggedly in a chat bubble and
 * turn a tidy receipt into nonsense. Same figures, same order, no padding — and
 * short, because every 153 characters is another segment the facility pays for.
 */
export function buildReceiptSmsText(input: ReceiptInput): string {
  const out: string[] = [];
  out.push(
    `${input.facility.name}${input.reference ? ` — ${input.reference}` : ""}`,
  );
  for (const line of input.lines) {
    out.push(`${line.label}: ${money(line.amountCents)}`);
  }
  if (input.discountCents > 0) {
    out.push(`Discount: ${money(-input.discountCents)}`);
  }
  out.push(`Subtotal: ${money(input.subtotalCents)}`);
  for (const tax of input.taxLines) {
    out.push(`${tax.name}: ${money(tax.amountCents)}`);
  }
  if (input.tipCents > 0) out.push(`Tip: ${money(input.tipCents)}`);
  out.push(`TOTAL: ${money(input.totalCents)}`);
  const card = [
    input.cardBrand,
    input.cardLast4 ? `••${input.cardLast4}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  if (card) out.push(card);
  if (input.facility.phone) out.push(input.facility.phone);
  return out.join("\n");
}
