import "server-only";

import type { ReceiptInput } from "@/lib/clover/receipt";

// ============================================================================
// The receipt as an IMAGE, because text printing cannot align a column.
//
// ── WHAT THE PAPER SHOWED ─────────────────────────────────────────────────
//
// Reported from the running app, with a photograph: "its not organized, the
// alignment and spaces — all the amounts in one straight line".
//
// `/device/print/text` renders in a PROPORTIONAL font. The receipt was laid out
// by padding to 32 characters, which only aligns in a monospace one, so:
//
//   Full day        $45.00              <- 8 + 18 spaces + 6 = 32 chars
//   Daycare add-on: nail trim $15.00    <- 25 + 1 space + 6  = 32 chars
//
// are the same number of CHARACTERS and visibly different WIDTHS on paper,
// because a space is about half the width of a digit. Every amount landed at a
// different position down the right-hand side.
//
// No character-based padding can fix that: two labels of equal length still
// render at different pixel widths. The only way to put the amounts in one
// straight line is to control the pixels, which means printing an image.
//
// ── SO THE LOGO GOES IN THE SAME IMAGE ────────────────────────────────────
//
// It used to be its own print job before the text. One image means one job,
// guaranteed ordering, and no second call that can half-fail.
//
// ── AND THE CALLER KEEPS THE TEXT PATH ────────────────────────────────────
//
// SVG text needs a font in the runtime. If the deployment has none the render
// comes back blank, so `renderReceiptPng` reports its ink coverage and the
// caller falls back to text printing rather than handing somebody a blank
// receipt. Ragged columns beat no receipt.
// ============================================================================

/** Dots across. Full width of a 58mm head, half of an 80mm one — safe on both. */
const WIDTH = 384;
const PADDING = 8;
const FONT = 17;
/** Monospace advance is ~0.6em; used only to decide where to wrap and truncate. */
const CHAR = FONT * 0.6;
const COLS = Math.floor((WIDTH - PADDING * 2) / CHAR);
const FAMILY =
  "DejaVu Sans Mono, Liberation Mono, Menlo, Consolas, Courier New, monospace";

type Row =
  | { kind: "centre"; text: string; size?: number; bold?: boolean }
  | { kind: "left"; text: string; size?: number }
  | {
      kind: "pair";
      label: string;
      amount: string;
      bold?: boolean;
      size?: number;
    }
  | { kind: "rule" }
  | { kind: "gap"; height: number };

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/** Break on words so an address never loses its tail. */
function wrap(text: string, cols = COLS): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (!line) line = word.slice(0, cols);
    else if (line.length + 1 + word.length <= cols) line += ` ${word}`;
    else {
      out.push(line);
      line = word.slice(0, cols);
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

function rowsFor(input: ReceiptInput): Row[] {
  const rows: Row[] = [];
  const f = input.facility;

  rows.push({ kind: "centre", text: f.name, size: 22, bold: true });
  if (f.address) {
    for (const line of wrap(f.address))
      rows.push({ kind: "centre", text: line });
  }
  if (f.phone) rows.push({ kind: "centre", text: f.phone });
  if (f.email) rows.push({ kind: "centre", text: f.email });
  if (f.taxRegistrations) {
    for (const line of wrap(f.taxRegistrations, COLS + 6)) {
      rows.push({ kind: "centre", text: line, size: 14 });
    }
  }

  rows.push({ kind: "gap", height: 10 });
  if (input.reference) rows.push({ kind: "left", text: input.reference });
  if (input.clientName) {
    for (const line of wrap(input.clientName))
      rows.push({ kind: "left", text: line });
  }
  if (input.petNames.length > 0) {
    for (const line of wrap(`Pet: ${input.petNames.join(", ")}`)) {
      rows.push({ kind: "left", text: line });
    }
  }
  if (input.serviceWindow) {
    for (const line of wrap(input.serviceWindow))
      rows.push({ kind: "left", text: line });
  }
  rows.push({ kind: "left", text: input.printedAt, size: 14 });
  rows.push({ kind: "rule" });

  for (const line of input.lines) {
    rows.push({
      kind: "pair",
      label: line.label,
      amount: money(line.amountCents),
    });
  }
  if (input.discountCents > 0) {
    rows.push({
      kind: "pair",
      label: "Discount",
      amount: money(-input.discountCents),
    });
  }

  rows.push({ kind: "rule" });
  rows.push({
    kind: "pair",
    label: "Subtotal",
    amount: money(input.subtotalCents),
  });
  for (const tax of input.taxLines) {
    rows.push({
      kind: "pair",
      // The stored rate is a fraction; trailing zeros trimmed so Quebec's
      // 9.975% keeps its decimals and a flat 5% does not gain any.
      label: `${tax.name} ${Number((tax.rate * 100).toFixed(4))}%`,
      amount: money(tax.amountCents),
    });
  }
  if (input.tipCents > 0) {
    rows.push({ kind: "pair", label: "Tip", amount: money(input.tipCents) });
  }
  rows.push({
    kind: "pair",
    label: "TOTAL",
    amount: money(input.totalCents),
    bold: true,
  });
  rows.push({ kind: "rule" });

  rows.push({
    kind: "pair",
    label: input.paymentMethod ?? "Paid",
    amount: money(input.totalCents),
  });
  const card = [
    input.cardBrand,
    input.cardLast4 ? `••${input.cardLast4}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  if (card) rows.push({ kind: "left", text: card });
  if (input.entryMethod)
    rows.push({ kind: "left", text: `Entry: ${input.entryMethod}` });
  if (input.authCode)
    rows.push({ kind: "left", text: `Auth: ${input.authCode}` });
  if (input.processorPaymentId) {
    for (const line of wrap(`Ref: ${input.processorPaymentId}`)) {
      rows.push({ kind: "left", text: line });
    }
  }

  rows.push({ kind: "gap", height: 12 });
  rows.push({ kind: "centre", text: "Thank you" });
  return rows;
}

export interface ReceiptSvg {
  svg: string;
  height: number;
}

/**
 * Lay the receipt out as SVG.
 *
 * @param logo an already-converted logo as a data URI, composited at the top.
 *   Optional: a facility without one gets a receipt that starts at its name.
 */
export function buildReceiptSvg(
  input: ReceiptInput,
  logo?: { dataUri: string; width: number; height: number },
): ReceiptSvg {
  const rows = rowsFor(input);
  const logoBlock = logo ? logo.height + 12 : 0;

  let y = PADDING + logoBlock;
  const parts: string[] = [];

  if (logo) {
    const x = Math.round((WIDTH - logo.width) / 2);
    parts.push(
      `<image x="${x}" y="${PADDING}" width="${logo.width}" height="${logo.height}" href="${logo.dataUri}"/>`,
    );
  }

  for (const row of rows) {
    if (row.kind === "gap") {
      y += row.height;
      continue;
    }
    if (row.kind === "rule") {
      y += 6;
      parts.push(
        `<rect x="${PADDING}" y="${y}" width="${WIDTH - PADDING * 2}" height="2" fill="#000"/>`,
      );
      y += 12;
      continue;
    }

    const size = row.size ?? FONT;
    y += size + 4;

    if (row.kind === "centre") {
      parts.push(
        `<text x="${WIDTH / 2}" y="${y}" text-anchor="middle" font-family="${FAMILY}" font-size="${size}"${row.bold ? ' font-weight="bold"' : ""} fill="#000">${escapeXml(row.text)}</text>`,
      );
    } else if (row.kind === "left") {
      parts.push(
        `<text x="${PADDING}" y="${y}" font-family="${FAMILY}" font-size="${size}" fill="#000">${escapeXml(row.text)}</text>`,
      );
    } else {
      // THE POINT OF THIS FILE. The amount is anchored to the right edge, so
      // every amount lands on the same vertical line whatever its label.
      const room = COLS - row.amount.length - 1;
      const label =
        row.label.length > room
          ? `${row.label.slice(0, room - 1)}…`
          : row.label;
      const weight = row.bold ? ' font-weight="bold"' : "";
      parts.push(
        `<text x="${PADDING}" y="${y}" font-family="${FAMILY}" font-size="${size}"${weight} fill="#000">${escapeXml(label)}</text>`,
        `<text x="${WIDTH - PADDING}" y="${y}" text-anchor="end" font-family="${FAMILY}" font-size="${size}"${weight} fill="#000">${escapeXml(row.amount)}</text>`,
      );
    }
    y += 4;
  }

  const height = y + PADDING;
  return {
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}"><rect width="${WIDTH}" height="${height}" fill="#fff"/>${parts.join("")}</svg>`,
  };
}

/**
 * Render the receipt to a black-and-white PNG the device can print.
 *
 * @returns base64 PNG and the fraction of it that is ink. The caller uses the
 *   coverage to decide whether the render worked: a runtime with no font
 *   produces a page that is technically valid and entirely blank, and handing
 *   somebody that is worse than a ragged text receipt.
 */
export async function renderReceiptPng(
  input: ReceiptInput,
  logo?: { dataUri: string; width: number; height: number },
): Promise<{ image: string; ink: number } | null> {
  try {
    const { svg } = buildReceiptSvg(input, logo);
    // Imported here rather than at module scope: sharp is a native binary and
    // this route must not fail to load on a runtime where it is unavailable.
    const { default: sharp } = await import("sharp");

    const png = await sharp(Buffer.from(svg))
      .flatten({ background: "#ffffff" })
      .greyscale()
      // One ink, no greys — the head fires a dot or it does not. High, because
      // anti-aliased text is mostly mid-grey at the edges and a low threshold
      // eats the strokes.
      .threshold(200)
      .png({ colours: 2 })
      .toBuffer();

    const raw = await sharp(png).greyscale().raw().toBuffer();
    let dark = 0;
    for (const value of raw) if (value < 128) dark += 1;

    return {
      image: png.toString("base64"),
      ink: dark / Math.max(1, raw.length),
    };
  } catch (error) {
    console.warn("[clover-print] receipt image failed:", error);
    return null;
  }
}
