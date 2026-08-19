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
// ── AND THE FONT IS SHIPPED, NOT BORROWED ─────────────────────────────────
//
// The first version of this file left the font to the runtime and guarded
// against a BLANK render. Vercel's serverless runtime has no system fonts, and
// a missing font does not render blank — librsvg draws the missing-glyph box
// for every character, which is plenty of ink. The guard passed and a Clover
// Flex printed rows of empty rectangles.
//
// So the font ships with the code, and the guard tests the right property: see
// FONT_DIR and glyphsRender() below.
// ============================================================================

import { join } from "node:path";

/**
 * Dots across a Clover FLEX head. 384 is its full printable width.
 */
const WIDTH = 384;
const PADDING = 10;

/**
 * Body text. Everything else is expressed relative to it.
 *
 * Raised from 16/13/11 after the first clean print: legible, but small and
 * light on an 80mm roll read at arm's length across a counter.
 */
const FONT = 18;
const SMALL = 15;
const TINY = 13;

/**
 * A monospace advance is 0.6em — true of both JetBrains Mono and the Roboto
 * Mono it replaced. Used to decide where to wrap and truncate, nothing else.
 *
 * Derived PER SIZE, not once from the body size. The wrap widths used to be
 * hardcoded (34, 40, 44 columns) against a 16px body; at 18px those same
 * counts overflow 384 dots and the line would be clipped at the paper's edge.
 */
function colsAt(size: number): number {
  return Math.floor((WIDTH - PADDING * 2) / (size * 0.6));
}

const COLS = colsAt(FONT);

/**
 * The font is SHIPPED, not borrowed from the runtime.
 *
 * A receipt printed on 2026-08-19 came out as rows of empty rectangles: Vercel's
 * serverless runtime has no system fonts, so librsvg drew the missing-glyph box
 * for every character. The layout was correct; there was simply nothing to draw
 * with.
 *
 * Roboto Mono ships in `fonts/` beside this file (Latin subset, 22KB per
 * weight) and next.config.ts traces the directory into the function bundle.
 * FONTCONFIG_PATH points fontconfig at it before sharp is loaded.
 */
const FONT_DIR = join(process.cwd(), "src/lib/clover/fonts");

/**
 * JetBrains Mono, at MEDIUM rather than regular.
 *
 * It replaced Roboto Mono to make the print clearer: a taller x-height and
 * heavier stems survive a thermal head better, where a light weight prints
 * thin and breaks up on the thin strokes. 500 is the body weight and 700 the
 * emphasis, and both faces ship — asking for a weight the bundle does not
 * carry gets a synthesised approximation, which on 384 dots looks like smudge.
 */
const FAMILY = "JetBrains Mono, monospace";
const WEIGHT_BODY = 500;
const WEIGHT_BOLD = 700;

function applyBundledFonts(): void {
  process.env.FONTCONFIG_PATH = FONT_DIR;
  // Writable, and the only writable place on a serverless filesystem. Without
  // it fontconfig warns on every call and rebuilds its cache each time.
  process.env.XDG_CACHE_HOME = "/tmp";
}

type Row =
  | { kind: "centre"; text: string; size?: number; bold?: boolean }
  | { kind: "left"; text: string; size?: number; bold?: boolean }
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

/**
 * The receipt, as rows.
 *
 * ── ASCII ONLY, DELIBERATELY ──────────────────────────────────────────────
 *
 * The bundled font is a LATIN SUBSET. A bullet, a middot or an en-dash may not
 * be in it, and a character the font lacks is drawn as the same empty box that
 * made the last receipt unreadable. Nothing here uses a character outside
 * printable ASCII, so there is no glyph to be missing.
 *
 * ── AND KEPT SHORT ────────────────────────────────────────────────────────
 *
 * "clean minimalist layout", asked for after the first legible print ran to
 * 111mm. The second timestamp is gone (the service window already dates it),
 * the "Paid by card" row is gone (TOTAL is the same number, one line above),
 * and the card details are two short lines instead of four.
 */
/**
 * Wrap an address, breaking at a comma where one is available.
 *
 * Plain word-wrapping split "3824 Saint Patrick St, Montreal, QC H4E 1A4" as
 * "... QC H4E" / "1A4" once the body font grew — a postcode cut in half. An
 * address has natural seams and they are exactly where the commas are.
 *
 * Falls back to word-wrapping any segment too long to stand on its own line.
 */
function wrapAddress(text: string, cols: number): string[] {
  const segments = text.split(", ");
  const out: string[] = [];
  let line = "";

  for (const [index, segment] of segments.entries()) {
    const piece = index < segments.length - 1 ? `${segment},` : segment;
    if (!line) {
      line = piece;
    } else if (line.length + 1 + piece.length <= cols) {
      line += ` ${piece}`;
    } else {
      out.push(line);
      line = piece;
    }
    if (line.length > cols) {
      out.push(...wrap(line, cols));
      line = "";
    }
  }
  if (line) out.push(line);
  return out.length > 0 ? out : [""];
}

function rowsFor(input: ReceiptInput): Row[] {
  const rows: Row[] = [];
  const f = input.facility;

  rows.push({ kind: "centre", text: f.name, size: 22, bold: true });
  if (f.address) {
    for (const line of wrapAddress(f.address, colsAt(SMALL))) {
      rows.push({ kind: "centre", text: line, size: SMALL });
    }
  }
  if (f.phone) rows.push({ kind: "centre", text: f.phone, size: SMALL });
  if (f.taxRegistrations) {
    for (const line of wrap(f.taxRegistrations, colsAt(TINY))) {
      rows.push({ kind: "centre", text: line, size: TINY });
    }
  }

  rows.push({ kind: "gap", height: 12 });
  if (input.reference) {
    rows.push({ kind: "left", text: input.reference, bold: true });
  }
  if (input.clientName) {
    for (const line of wrap(input.clientName))
      rows.push({ kind: "left", text: line });
  }
  if (input.petNames.length > 0) {
    for (const line of wrap(input.petNames.join(", "), colsAt(SMALL))) {
      rows.push({ kind: "left", text: line, size: SMALL });
    }
  }
  if (input.serviceWindow) {
    for (const line of wrap(input.serviceWindow, colsAt(SMALL))) {
      rows.push({ kind: "left", text: line, size: SMALL });
    }
  }
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
      size: SMALL,
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
    size: 20,
  });
  rows.push({ kind: "rule" });

  // Card, entry method and approval code on two lines rather than four.
  const card = [
    input.cardBrand,
    input.cardLast4 ? `****${input.cardLast4}` : null,
    input.entryMethod ? input.entryMethod.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join("  ");
  if (card) rows.push({ kind: "left", text: card, size: SMALL });
  // The TRANSACTION's time, restored. Minimising took it out on the grounds
  // that the service window already dated the receipt — but that dates the
  // BOOKING. A receipt is a record of a payment, and when the payment happened
  // is one of the things a card-brand receipt is expected to carry.
  const trace = [
    input.printedAt,
    input.authCode ? `Auth ${input.authCode}` : null,
    input.processorPaymentId ? `Ref ${input.processorPaymentId}` : null,
  ]
    .filter(Boolean)
    .join("  ");
  if (trace) {
    for (const line of wrap(trace, colsAt(TINY))) {
      rows.push({ kind: "left", text: line, size: TINY });
    }
  }

  rows.push({ kind: "gap", height: 14 });
  rows.push({ kind: "centre", text: "Thank you", size: SMALL });
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
        `<text x="${WIDTH / 2}" y="${y}" text-anchor="middle" font-size="${size}"${row.bold ? ` font-weight="${WEIGHT_BOLD}"` : ""}>${escapeXml(row.text)}</text>`,
      );
    } else if (row.kind === "left") {
      parts.push(
        `<text x="${PADDING}" y="${y}" font-size="${size}"${row.bold ? ` font-weight="${WEIGHT_BOLD}"` : ""}>${escapeXml(row.text)}</text>`,
      );
    } else {
      // THE POINT OF THIS FILE. The amount is anchored to the right edge, so
      // every amount lands on the same vertical line whatever its label.
      const room = COLS - row.amount.length - 1;
      const label =
        row.label.length > room
          ? `${row.label.slice(0, room - 2)}..`
          : row.label;
      const weight = row.bold ? ` font-weight="${WEIGHT_BOLD}"` : "";
      parts.push(
        `<text x="${PADDING}" y="${y}" font-size="${size}"${weight}>${escapeXml(label)}</text>`,
        `<text x="${WIDTH - PADDING}" y="${y}" text-anchor="end" font-size="${size}"${weight}>${escapeXml(row.amount)}</text>`,
      );
    }
    y += 4;
  }

  const height = y + PADDING;
  return {
    height,
    // Family, weight and colour on the ROOT so every line inherits them —
    // one place to change the face, and a much smaller document than
    // repeating the family on forty text elements.
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" font-family="${FAMILY}" font-weight="${WEIGHT_BODY}" fill="#000"><rect width="${WIDTH}" height="${height}" fill="#fff"/>${parts.join("")}</svg>`,
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
/**
 * Are the glyphs real, or is every one of them the missing-glyph box?
 *
 * ── WHY INK COVERAGE WAS THE WRONG TEST ───────────────────────────────────
 *
 * The first guard assumed a missing font renders BLANK, and fell back to text
 * printing under 1% ink. It does not. librsvg draws a hollow rectangle for
 * every character it cannot find, which is plenty of ink — so the guard passed
 * and a Clover Flex printed a receipt of empty boxes.
 *
 * The property that actually distinguishes them: with a real font "iiii" and
 * "WWWW" produce different pixels; with no font both are four identical boxes.
 * So render one of each and compare. Cheap, and it cannot be fooled by a font
 * that merely looks wrong.
 */
async function glyphsRender(sharp: typeof import("sharp")): Promise<boolean> {
  const probe = (text: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="30"><rect width="120" height="30" fill="#fff"/><text x="2" y="22" font-family="${FAMILY}" font-weight="${WEIGHT_BODY}" font-size="20" fill="#000">${text}</text></svg>`;

  try {
    const [a, b] = await Promise.all([
      sharp(Buffer.from(probe("iiii")))
        .greyscale()
        .raw()
        .toBuffer(),
      sharp(Buffer.from(probe("WWWW")))
        .greyscale()
        .raw()
        .toBuffer(),
    ]);
    if (a.length !== b.length) return true;
    return !a.equals(b);
  } catch {
    return false;
  }
}

/**
 * Render the receipt to a black-and-white PNG the device can print.
 *
 * @returns base64 PNG, or null when it could not be rendered legibly — the
 *   caller falls back to text printing. Both failure modes are covered: a page
 *   with no ink, and a page of missing-glyph boxes.
 */
export async function renderReceiptPng(
  input: ReceiptInput,
  logo?: { dataUri: string; width: number; height: number },
): Promise<{ image: string; ink: number } | null> {
  try {
    // Before sharp is loaded, so fontconfig reads it on first use.
    applyBundledFonts();
    const { default: sharp } = await import("sharp");

    if (!(await glyphsRender(sharp))) {
      console.warn(
        "[clover-print] no usable font — every glyph would print as a box",
      );
      return null;
    }

    const { svg } = buildReceiptSvg(input, logo);
    const png = await sharp(Buffer.from(svg))
      .flatten({ background: "#ffffff" })
      .greyscale()
      // One ink, no greys - the head fires a dot or it does not. High, because
      // anti-aliased text is mostly mid-grey at the edges and a low threshold
      // eats the strokes.
      .threshold(200)
      .png({ colours: 2 })
      .toBuffer();

    const raw = await sharp(png).greyscale().raw().toBuffer();
    let dark = 0;
    for (const value of raw) if (value < 128) dark += 1;
    const ink = dark / Math.max(1, raw.length);
    if (ink < 0.005) return null;

    return { image: png.toString("base64"), ink };
  } catch (error) {
    console.warn("[clover-print] receipt image failed:", error);
    return null;
  }
}
