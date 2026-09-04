/**
 * Guards against an accent line pinned to one edge.
 *
 *   bun run check:edge-accents
 *
 * docs/design-system/design-system.md §6 rule 1, which states the ban and its
 * reason in one breath:
 *
 *   "`border-left`, `border-bottom`, `border-top` and `border-right` accents
 *   are one mistake wearing four hats: a stripe pinned to one side of a
 *   rounded container squares off two corners, flips side in RTL, and reads
 *   as a progress bar that never fills. Applies to rows, cards, tiles, list
 *   items, calendar blocks and every selected state."
 *
 * Signal state the three sanctioned ways instead: a full 2px ring
 * (`inset 0 0 0 2px var(--primary)`), a solid fill, or weight plus a step of
 * ink. A ring is the whole container, so it survives reflow and reorder.
 *
 * ── WHAT COUNTS, AND WHAT DELIBERATELY DOES NOT ───────────────────────────
 *
 * The rule bans an ACCENT, not every one-sided border, and the difference is
 * most of the codebase. Measured when this gate was written: 1,169 one-sided
 * border utilities across 514 files, of which only 152 were accents. The other
 * ~800 are 1px neutral hairlines — a divider under a table header, a rule
 * above a card footer — which rule 1 never mentions and rule 10 actively
 * REQUIRES on paper ("a table gets one hairline under its header and no
 * zebra"). A gate that flagged those would be telling somebody to delete the
 * thing the spec asks for.
 *
 * So an edge is an accent when either half is true:
 *
 *   THICK — a width above 1px (`border-l-4`, `border-b-2`). Nothing structural
 *     needs to be 2px; a divider is a hairline.
 *   HUED  — 1px, but carrying a colour that is not one of the neutral line
 *     tokens. `border-l border-emerald-500` is a stripe whatever its width.
 *
 * ── THE THREE EXCLUSIONS, EACH FOR ITS OWN REASON ─────────────────────────
 *
 * 1. THE TAB STRIP is rule 1's single named exception, and the spec gives the
 *    mechanical test: "if the thing has a radius or a background, it is not a
 *    tab strip and the ban applies." An open rail with no radius, no fill and
 *    no border box cannot commit any of the three failures — no corner to
 *    square, nothing to mistake for an unfilled bar, and the line is centred
 *    on its own label rather than pinned to a side, so it does not flip in
 *    RTL. Recognised by `isTabStrip()` below, from the classes rather than
 *    from a filename — see the note there for why that distinction mattered.
 *
 * 2. PAPER, but only horizontally. On print, §6 rule 10 says every colour
 *    drops out except the mark and the header hairline is how a table is read
 *    at all — so black IS the neutral there, and a `border-t`/`border-b` of
 *    any colour is allowed. `border-l`/`border-r` are NOT: a left stripe on
 *    paper is the same mistake it is on screen, and it costs toner.
 *
 * 3. EMAIL. `src/components/estimates/emails/` renders in somebody's mail
 *    client, not in this design system. Outlook supports almost nothing else,
 *    and a left bar is one of the few structures that survives everywhere.
 *    The design system governs the app; it does not govern the inbox.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
};

/**
 * Zero from the day the gate landed. There was no ratchet phase: unlike the
 * badge-glyph and hardcoded-locale counts, every one of these had the same
 * three answers available (ring, fill, weight), so there was nothing to defer.
 */
const BASELINE = 0;

/** `border-l-4`, `border-b-2` — a width above a hairline is always an accent. */
const THICK = /\bborder-([lrtb])-(\d+)\b/g;

/** Any one-sided border at hairline width. */
const SIDE = /\bborder-([lrtb])\b/;

/**
 * Achromatic — a divider, not a stripe.
 *
 * Two groups, and the second is the one worth explaining. The line TOKENS are
 * obvious. The rest are colours with no hue at all: `white`, `black`, and the
 * five grey ramps. `border-b border-white/10` on the dark camera panel is a
 * divider drawn the only way that reads on `#0E3A5C`; `border-b border-black`
 * on a print sheet is rule 10's header hairline. Neither is an accent, because
 * an accent is a thing that says "this row is different" and a grey says
 * nothing at all.
 *
 * `slate-*` and `gray-*` ARE off-palette and should become `--line` — but that
 * is the leftover-palette grep's job (CLAUDE.md § "The guardrail greps"), not
 * rule 1's. A gate that conflated the two would report a divider as a stripe
 * and send somebody to delete it.
 */
const NEUTRAL =
  /\bborder-(border|line|sidebar-border|muted|input|transparent|card|white|black|gray-\d+|grey-\d+|slate-\d+|zinc-\d+|neutral-\d+|stone-\d+)(\/\d+)?\b/;

/**
 * A border COLOUR utility — anything after `border-` that is not a side, a
 * width, a style keyword or a neutral token.
 */
const HUED =
  /\bborder-(?!l\b|r\b|t\b|b\b|x\b|y\b|s\b|e\b|\d|border\b|line\b|sidebar-border\b|muted\b|input\b|transparent\b|card\b|collapse\b|separate\b|solid\b|dashed\b|dotted\b|double\b|hidden\b|none\b|spacing\b)[a-z][a-z0-9-]*(?:\/\d+)?\b/;

const CLASS_ATTR =
  /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;

/**
 * Rule 1's single named exception, applied as the spec's OWN mechanical test
 * rather than as a filename.
 *
 *   "The exception is a tab strip — an open rail with no radius, no fill and
 *   no border box, where the 2px line sits directly under the label it belongs
 *   to. […] The test is mechanical: if the thing has a radius or a background,
 *   it is not a tab strip and the ban applies."
 *
 * So: a bottom rule that rests TRANSPARENT (which is what makes it a rail and
 * not a divider), on something with no radius and no fill. This was written as
 * an allowlist of `saved-views.tsx` first, and that version missed
 * `OperationsCalendarEventDrawer` — a second, entirely legitimate tab strip.
 * A filename cannot tell you whether the three conditions hold; the classes
 * can.
 */
function isTabStrip(cls: string): boolean {
  const bottomRule = /\bborder-b-[2-9]\b/.test(cls);
  const restsTransparent = /\bborder-(b-)?transparent\b/.test(cls);
  const hasRadius = /\brounded(-|\b)/.test(cls);
  const hasFill = /\bbg-(?!transparent\b)[a-z]/.test(cls);
  return bottomRule && restsTransparent && !hasRadius && !hasFill;
}

/** Paper. Horizontal hairlines only; see note 2. */
const PRINT = /print|Print/;

/** Somebody else's mail client; see note 3. */
const EMAIL = /components[\\/]estimates[\\/]emails[\\/]/;

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

const findings: { file: string; line: number; why: string; cls: string }[] = [];

for (const file of tsxFiles("src")) {
  if (EMAIL.test(file)) continue;
  const onPaper = PRINT.test(file);
  const source = readFileSync(file, "utf8");

  for (const match of source.matchAll(CLASS_ATTR)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (!SIDE.test(value) && !/\bborder-[lrtb]-\d/.test(value)) continue;

    // A CSS spinner is a FULL border with one side knocked out —
    // `border-4 border-primary border-t-transparent`, spun by `animate-spin`.
    // The one-sided utility there is the hole, not a stripe, and the shape is
    // a circle so there is no corner to square. Same for any
    // `border-<side>-transparent`: an edge you cannot see is not an accent.
    if (/\banimate-spin\b/.test(value)) continue;
    if (isTabStrip(value)) continue;
    const visible = value.replace(/\bborder-[lrtb]-transparent\b/g, "");
    if (!SIDE.test(visible) && !/\bborder-[lrtb]-\d/.test(visible)) continue;

    const thick = [...value.matchAll(THICK)].filter(([, , w]) => Number(w) > 1);
    const sides = thick.map(([, s]) => s);
    const hairlineSides = (value.match(/\bborder-([lrtb])\b/g) ?? []).map((s) =>
      s.slice(-1),
    );

    const offending: string[] = [];
    // Thickness is an accent on paper too. Rule 10 asks for ONE hairline
    // under a header, not a 2px bar, so these are thinned rather than
    // excused — which is why `onPaper` does not appear in this loop.
    for (const s of sides) {
      offending.push(`border-${s}-* above 1px`);
    }
    if (HUED.test(value) && !NEUTRAL.test(value)) {
      for (const s of hairlineSides) {
        if (onPaper && (s === "t" || s === "b")) continue;
        offending.push(`border-${s} carrying a colour`);
      }
    }

    if (!offending.length) continue;
    const line = source.slice(0, match.index!).split("\n").length;
    findings.push({
      file,
      line,
      why: offending[0]!,
      cls: value.replace(/\s+/g, " ").slice(0, 400),
    });
  }
}

console.log(
  `${ANSI.bold}Edge accents${ANSI.reset} ${ANSI.dim}(${findings.length} in ${new Set(findings.map((f) => f.file)).size} files, baseline ${BASELINE})${ANSI.reset}`,
);

if (findings.length > BASELINE) {
  console.log(
    `\n${ANSI.red}✗ ${findings.length - BASELINE} accent line(s) on an edge${ANSI.reset}\n`,
  );
  console.log(
    `  §6 rule 1: a stripe pinned to one side squares off two corners of a\n` +
      `  rounded container, flips side in RTL, and reads as a progress bar\n` +
      `  that never fills.\n\n` +
      `  Signal it one of the three sanctioned ways instead:\n` +
      `    a full ring   ${ANSI.bold}shadow-[inset_0_0_0_2px_var(--primary)]${ANSI.reset}\n` +
      `    a solid fill  the status ink at full strength\n` +
      `    weight + ink  ${ANSI.bold}font-bold${ANSI.reset} and a step from --ink-tertiary\n\n` +
      `  A 1px NEUTRAL hairline is not this — a divider under a table header\n` +
      `  is rule 10 and stays.\n`,
  );
  // `--all` prints every one, for the pass that clears them. The default cap
  // keeps a failing CI log readable.
  const all = process.argv.includes("--all");
  const shown = all ? findings : findings.slice(0, 30);
  for (const f of shown) {
    console.log(
      `    ${f.file}:${f.line}\n      ${f.why}  ${ANSI.dim}${f.cls}${ANSI.reset}`,
    );
  }
  if (!all && findings.length > 30) {
    console.log(
      `    … and ${findings.length - 30} more — ${ANSI.bold}bun scripts/check-edge-accents.ts --all${ANSI.reset}`,
    );
  }
  process.exit(1);
}

console.log(`${ANSI.green}✓ no accent line on any edge${ANSI.reset}`);
process.exit(0);
