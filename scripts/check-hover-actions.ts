/**
 * Guards against an affordance that only exists while a mouse is over it.
 *
 *   bun run check:hover-actions
 *
 * docs/design-system/design-system.md §6 rule 11 — the rule stage 7 built the
 * persistent row action to satisfy, and the one the reference page states
 * with its reason attached:
 *
 *   "There is no hover on the tablet or the phone, and those are two of the
 *   three contexts this product runs in. A row action revealed on hover does
 *   not exist for two thirds of the product. Make it persistent, or put it
 *   behind a visible overflow button — never behind the mouse."
 *
 * This is not a preference about discoverability. Floor staff run this
 * product standing up on a tablet, holding an animal. A control they cannot
 * reveal is a control they do not have.
 *
 * ── WHAT COUNTS ───────────────────────────────────────────────────────────
 *
 * The pattern is mechanical: an element parked at `opacity-0` that becomes
 * visible under `group-hover:opacity-100` (or `hover:opacity-100`). Both
 * halves must be present — `group-hover:opacity-100` on something already
 * visible is a no-op, not a hidden control, and `opacity-0` alone is usually
 * an animation's starting frame.
 *
 * `focus-within:opacity-100` / `focus:opacity-100` does NOT rescue it. That
 * makes the control keyboard-reachable, which is a different requirement
 * (§5k) and a good thing — but a tablet has no keyboard focus to give it
 * either, so the control is still absent in the context the rule is about.
 *
 * ── WHY A RATCHET AND NOT A SWEEP ─────────────────────────────────────────
 *
 * Measured at stage 7: 61 of these across 50 files. Each one is a judgement
 * — make it persistent, move it into an overflow menu, or decide the whole
 * affordance was decoration and delete it — and the right answer depends on
 * how crowded the row already is. That is 61 decisions, not one edit, and
 * the wrong bulk answer (making all 61 permanently visible) would produce
 * rows nobody can read.
 *
 * So the number is frozen. A new one fails. Fixing some and dropping below
 * the baseline reports too, with an instruction to lower it, so the count
 * can only shrink. Same shape as `check:badge-glyph`, and for the same
 * reason: a defect nobody counts is a defect that only grows.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
};

/**
 * The count on the day the rule got a gate (stage 7, 2026-09-03). Lower it
 * whenever the real number drops — the script tells you to.
 */
const BASELINE = 58;

/** The reveal half: something becomes opaque because a pointer is near it. */
const REVEAL = /\b(?:group-hover(?:\/[a-z0-9-]+)?|hover):opacity-100\b/;

/** The hide half, on the same element. */
const HIDDEN = /\bopacity-0\b/;

/**
 * className is read one attribute at a time rather than one file at a time:
 * a file that hides element A and reveals element B is not this defect, and
 * matching across the whole file would report it as one.
 */
const CLASS_ATTR =
  /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;

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

  for (const match of source.matchAll(CLASS_ATTR)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (HIDDEN.test(value) && REVEAL.test(value)) inFile += 1;
  }

  if (inFile > 0) {
    perFile.push({ file, n: inFile });
    count += inFile;
  }
}

perFile.sort((a, b) => b.n - a.n);

console.log(
  `${ANSI.bold}Hover-revealed actions${ANSI.reset} ${ANSI.dim}(${count} in ${perFile.length} files, baseline ${BASELINE})${ANSI.reset}`,
);

if (count > BASELINE) {
  console.log(
    `\n${ANSI.red}✗ ${count - BASELINE} new hover-revealed affordance(s)${ANSI.reset}\n`,
  );
  console.log(
    `  §6 rule 11: hover is not an affordance. Two of this product's three\n` +
      `  contexts have no pointer, so a control revealed on hover does not\n` +
      `  exist for two thirds of it.\n\n` +
      `  Make it persistent — DataTable's ${ANSI.bold}actions${ANSI.reset} render prop puts controls\n` +
      `  in the row and leaves them there — or put it behind a visible\n` +
      `  overflow button.\n\n` +
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
    `${ANSI.yellow}note${ANSI.reset} ${count} is below the baseline — lower BASELINE in ${ANSI.dim}scripts/check-hover-actions.ts${ANSI.reset} to ${count} so the ratchet keeps its grip.`,
  );
}

console.log(
  `${ANSI.green}✓ no new control has gone behind the mouse${ANSI.reset}`,
);
process.exit(0);
