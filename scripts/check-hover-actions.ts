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
 * Stage 7 measured 61 raw grep hits; reading className one attribute at a
 * time, and excluding the two false-positive classes above, the honest
 * starting number was 58. On 2026-09-04 the ELEVEN action-group containers
 * — `flex … gap-N` wrappers holding edit/delete/copy buttons in a row — were
 * made persistent, taking it to 41.
 *
 * The rest are not one job. They are icon hints, captions and single
 * buttons, and each is a judgement: make it persistent, move it into an
 * overflow menu, or decide the affordance was decoration and delete it. The
 * right answer depends on how crowded the row already is, and the wrong bulk
 * answer — making all 41 permanently visible — would produce rows nobody can
 * read.
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
const BASELINE = 41;

/** The reveal half: something becomes opaque because a pointer is near it. */
const REVEAL = /\b(?:group-hover(?:\/[a-z0-9-]+)?|hover):opacity-100\b/;

/**
 * The hide half, on the same element — and NOT behind a breakpoint.
 *
 * `sm:opacity-0` is the CORRECT pattern, not a violation: it leaves the
 * control visible at small widths and hides it only where a pointer exists.
 * That is precisely what rule 11 asks for, so a gate that flags it is telling
 * somebody to un-fix working code. Measured when this exclusion was added:
 * one such site, `CustomServiceModuleCard`, which also carries `min-h-[44px]
 * min-w-[44px]` — it had clearly been thought about.
 */
const HIDDEN = /(?<![a-z0-9]:)\bopacity-0\b/;

/**
 * A decorative overlay is not an affordance. `pointer-events-none` means the
 * element cannot be clicked at all, so it is not a control being hidden — it
 * is a glow, a scrim or a gradient that appears on hover. Five of these were
 * inflating the count.
 *
 * This is checked on the same className, which is the same one-attribute
 * discipline the rest of the script uses.
 */
const NOT_A_CONTROL = /\bpointer-events-none\b/;

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
    if (NOT_A_CONTROL.test(value)) continue;
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
