/**
 * Guards against a badge that says what it means in colour alone.
 *
 *   bun run check:badge-glyph
 *
 * docs/design-system/design-system.md §3, in the chip anatomy table, under
 * "Glyph": **"Mandatory. Colour is never the only channel — 1 in 12 men cannot
 * separate the green from the orange."**
 *
 * That is not a style preference. A badge whose entire meaning is carried by
 * being green rather than amber conveys nothing at all to a reader with the
 * common form of colour blindness, and nothing to a printed page either —
 * rule 17 drops every colour on paper except the mark, so a colour-only chip
 * prints as a grey word in a grey outline.
 *
 * ── WHAT COUNTS, AND WHAT DELIBERATELY DOES NOT ───────────────────────────
 *
 * Only a badge that is COLOUR-CODED needs a glyph. Of the ~1,950 `<Badge>`
 * elements in this repo, about two thirds carry no status colour at all —
 * a service tag, a count, an overflow "+2". Colour is not their channel, so
 * §3's rule does not bite and this script ignores them.
 *
 * A badge is treated as colour-coded when it carries either:
 *   - a palette utility (bg-/text-/border- on one of the status hues), or
 *   - one of badge.tsx's four SOLID status variants
 *     (success / warning / info / destructive).
 *
 * The six §3 chip variants added in stage 4 — confirmed, checkedIn, inService,
 * pending, overdue, cancelled — are reached through `StatusBadge`, which
 * supplies a glyph for every value it can render, so they never appear here.
 *
 * ── WHY THIS IS A RATCHET AND NOT A CLEANUP ───────────────────────────────
 *
 * Measured at stage 4: 374 colour-coded badges have no glyph, spread across
 * 224 files, most of which hold exactly ONE. There is no mechanical transform
 * — choosing the right glyph means knowing what the badge means, and §5b1
 * allows exactly one glyph per meaning, so a wrong pick is worse than the
 * omission it replaces. That is 374 judgements, not one edit.
 *
 * So today's number is frozen below. A new colour-only badge fails. Fixing
 * some and dropping under the baseline also reports, with an instruction to
 * lower it, so the number can only ever shrink. Same shape as
 * `check:inert-permissions` and `check:no-dark-mode`, and for the same
 * reason: a defect nobody counts is a defect that only grows.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  reset: "[0m",
  bold: "[1m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
};

/**
 * The count on the day the rule got a gate (stage 4, 2026-09-03). Lower it
 * whenever the real number drops — the script tells you to.
 */
const BASELINE = 374;

/** A palette utility on one of the status hues. */
const COLOUR_UTILITY =
  /\b(?:bg|text|border)-(?:emerald|green|teal|red|rose|amber|orange|yellow|blue|sky|indigo|violet|purple|slate|gray|zinc)-\d{2,3}\b/;

/** badge.tsx's four solid status variants — legal fills, but still statuses. */
const STATUS_VARIANT = /variant=["'](?:success|warning|info|destructive)["']/;

/**
 * A glyph among the CHILDREN: a capitalised component (every lucide icon and
 * every Yipyy icon is one), a raw <svg>, or something named *Icon.
 *
 * ── THIS IS TESTED ON THE CHILDREN ONLY, AND THAT IS THE WHOLE TRICK ──────
 *
 * The first version ran it over the entire element, opening tag included, and
 * `<[A-Z][A-Za-z0-9]*\s*className` matched `<Badge className` — the badge's own
 * tag. So every colour-coded badge that set a className counted as ALREADY
 * HAVING a glyph, which is every badge coloured by a utility class. The gate
 * reported a tidy 280 and passed a deliberately planted violation on its first
 * trial run. Caught only because the probe was run; a gate nobody has watched
 * fail is the appearance of a gate, which is the exact lesson `test:sql`
 * taught this repo on 2026-08-22.
 */
const GLYPH = /<[A-Z][A-Za-z0-9]*[\s/>]|<svg|Icon\b/;

/**
 * Walks the opening tag from `<Badge` to the `>` that actually closes it,
 * counting brace depth so a `>` inside an expression — `onClick={() => x}`,
 * `{a > b ? …}` — is not mistaken for the end of the tag. A plain
 * `/<Badge[^>]*>/` splits those elements in the wrong place and silently
 * mis-reads the attributes.
 *
 * Returns the attribute text and where the tag ends, or null if unterminated.
 */
function readOpeningTag(
  source: string,
  start: number,
): { attrs: string; end: number; selfClosing: boolean } | null {
  let depth = 0;
  let quote: string | null = null;

  for (let i = start; i < source.length; i += 1) {
    const c = source[i]!;

    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) {
      const selfClosing = source[i - 1] === "/";
      return {
        attrs: source.slice(start, selfClosing ? i - 1 : i),
        end: i + 1,
        selfClosing,
      };
    }
  }
  return null;
}

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") tsxFiles(path, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(path);
    }
  }
  return out;
}

const perFile: { file: string; n: number }[] = [];
let count = 0;

for (const file of tsxFiles("src")) {
  const source = readFileSync(file, "utf8");
  let inFile = 0;

  for (const match of source.matchAll(/<Badge\b/g)) {
    const tag = readOpeningTag(source, match.index + "<Badge".length);
    if (!tag) continue;

    // Only a badge that says something in COLOUR has to say it again in a
    // glyph. A plain tag, a count, an overflow "+2" is not a status.
    if (!COLOUR_UTILITY.test(tag.attrs) && !STATUS_VARIANT.test(tag.attrs)) {
      continue;
    }

    // Self-closing means no children at all, so no glyph by construction.
    if (!tag.selfClosing) {
      const close = source.indexOf("</Badge>", tag.end);
      const children = close === -1 ? "" : source.slice(tag.end, close);
      if (GLYPH.test(children)) continue;
    }

    inFile += 1;
  }

  if (inFile > 0) {
    perFile.push({ file, n: inFile });
    count += inFile;
  }
}

perFile.sort((a, b) => b.n - a.n);

console.log(
  `${ANSI.bold}Badge glyphs${ANSI.reset} ${ANSI.dim}(${count} colour-only badges in ${perFile.length} files, baseline ${BASELINE})${ANSI.reset}`,
);

if (count > BASELINE) {
  console.log(
    `\n${ANSI.red}✗ ${count - BASELINE} new colour-only badge(s)${ANSI.reset}\n`,
  );
  console.log(
    `  §3: a status chip is white, a 1px hairline in its ink, the ink as the\n` +
      `  label — and a glyph. Colour is never the only channel.\n\n` +
      `  Use ${ANSI.bold}<StatusBadge>${ANSI.reset}, which picks both the chip and its glyph, or\n` +
      `  give the badge a lucide glyph from docs/design-system/icon-map.json.\n\n` +
      `  Heaviest files:\n` +
      perFile
        .slice(0, 10)
        .map((w) => `    ${String(w.n).padStart(3)}  ${w.file}`)
        .join("\n"),
  );
  process.exit(1);
}

if (count < BASELINE) {
  console.log(
    `${ANSI.yellow}note${ANSI.reset} ${count} is below the baseline — lower BASELINE in ${ANSI.dim}scripts/check-badge-glyph.ts${ANSI.reset} to ${count} so the ratchet keeps its grip.`,
  );
}

console.log(
  `${ANSI.green}✓ no badge has started relying on colour alone${ANSI.reset}`,
);
process.exit(0);
