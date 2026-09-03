/**
 * Dark mode is off, and the thing keeping it off is not what you would guess.
 *
 *   bun run check:no-dark-mode
 *
 * ── THE TRAP ──────────────────────────────────────────────────────────────
 *
 * This app has **3,780 `dark:` utilities across 505 files** and no way to turn
 * dark mode on: there is no `next-themes`, no ThemeProvider, no
 * `documentElement.classList` call, and nothing in `src` that ever adds the
 * string `"dark"` as a class. The product owner confirmed on 2026-09-03 that it
 * will never be used, and the design system has no dark palette — every ratio
 * in it is measured on white.
 *
 * So all 3,780 are dead. What makes them dead is ONE LINE in
 * `src/app/globals.css`:
 *
 *   @custom-variant dark (&:is(.dark *));
 *
 * That line looks like leftover configuration for a feature nobody uses, which
 * is exactly why somebody will delete it. **It is load-bearing, and deleting it
 * turns dark mode ON for a large share of users.** Tailwind v4's built-in `dark`
 * variant is `@media (prefers-color-scheme: dark)`; the line above OVERRIDES
 * that with a class-based selector that nothing ever satisfies. Take it away and
 * the built-in comes back, so every one of those 3,780 utilities activates for
 * anyone whose operating system is set to dark — layering the old sky/slate/
 * amber dark styling over a light-only redesign.
 *
 * Measured, not inferred (2026-09-03): compiling `@import "tailwindcss"` against
 * this repo with no `@custom-variant` line emitted
 * `@media (prefers-color-scheme: dark)` containing this app's own
 * `.dark\:divide-slate-800` and `.dark\:border-amber-400\/30` rules.
 *
 * ── WHY A GATE AND NOT A COMMENT ──────────────────────────────────────────
 *
 * The comment is there too. But the failure is invisible in review — a diff
 * deleting a `@custom-variant` line for an unused feature reads as cleanup —
 * and invisible in CI, because every gate this repo has runs on a machine with
 * no colour scheme preference. It would appear for the first time on a
 * customer's laptop.
 *
 * ── TWO RULES ─────────────────────────────────────────────────────────────
 *
 * 1. The class-based `dark` variant must be declared in `globals.css`.
 * 2. The `dark:` count may only SHRINK. Same shape as the inert-permissions
 *    ratchet: the baseline is recorded here, a new `dark:` utility fails the
 *    build, and removing them lets you lower the number. Nobody should be
 *    writing dark styling for a product that has no dark mode.
 *
 * Exits 0 clean, 1 on either.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const ROOT = "src";
const GLOBALS = join("src", "app", "globals.css");

/**
 * What the declaration has to be: a variant driven by a CLASS, not by the
 * media query. Matched loosely on the two things that matter — the variant name
 * and a `.dark` class selector — so reformatting it is allowed and changing
 * what it keys off is not.
 */
const CLASS_BASED_DARK = /@custom-variant\s+dark\s*\([^)]*\.dark[^)]*\)/;

/**
 * Occurrences of `dark:` in src, measured 2026-09-03 across 505 files.
 *
 * THIS NUMBER MAY ONLY GO DOWN. If you removed some, lower it and say so in the
 * commit. If a change raises it, the change is writing dark styling for a
 * product that will never render it.
 */
const BASELINE = 3780;

/**
 * `.ts` and `.tsx` only — utilities are authored in components, never in CSS.
 *
 * Counting `.css` too made this check fail on its OWN documentation: the
 * comment in globals.css explaining the trap quotes
 * `.dark\:divide-slate-800` as evidence, and the naive count read that as a
 * 3,781st utility. A gate that fires on the sentence describing it is a gate
 * nobody keeps.
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const problems: string[] = [];

// ── Rule 1 ──────────────────────────────────────────────────────────────────
const globals = readFileSync(GLOBALS, "utf8");
if (!CLASS_BASED_DARK.test(globals)) {
  problems.push(
    `${GLOBALS.replace(/\\/g, "/")} no longer declares a CLASS-BASED dark variant.\n` +
      `    Without it, Tailwind v4 falls back to @media (prefers-color-scheme: dark)\n` +
      `    and all ${BASELINE} dark: utilities activate for every user whose OS is dark.\n` +
      `    Restore:  @custom-variant dark (&:is(.dark *));`,
  );
}

// ── Rule 2 ──────────────────────────────────────────────────────────────────
let count = 0;
const perFile: { file: string; n: number }[] = [];
for (const file of walk(ROOT)) {
  const n = (readFileSync(file, "utf8").match(/dark:/g) ?? []).length;
  if (n > 0) {
    count += n;
    perFile.push({ file: file.replace(/\\/g, "/"), n });
  }
}

if (count > BASELINE) {
  const worst = perFile.sort((a, b) => b.n - a.n).slice(0, 5);
  problems.push(
    `the dark: count went UP: ${count} against a baseline of ${BASELINE} (+${count - BASELINE}).\n` +
      `    Dark mode is never rendered (product owner, 2026-09-03), so new dark:\n` +
      `    styling is dead code that also has to be maintained.\n` +
      `    Heaviest files:\n` +
      worst.map((w) => `      ${w.file}  ${w.n}`).join("\n"),
  );
}

console.log(
  `${ANSI.bold}Dark mode${ANSI.reset} ${ANSI.dim}(${count} dark: utilities in ${perFile.length} files, baseline ${BASELINE})${ANSI.reset}`,
);

if (problems.length === 0) {
  if (count < BASELINE) {
    console.log(
      `${ANSI.yellow}note${ANSI.reset} ${count} is below the baseline — lower BASELINE in ${ANSI.dim}scripts/check-no-dark-mode.ts${ANSI.reset} to ${count} so the ratchet keeps its grip.`,
    );
  }
  console.log(
    `${ANSI.green}✓ the class-based dark variant is declared, and the count has not grown${ANSI.reset}`,
  );
  process.exit(0);
}

console.log(`\n${ANSI.red}✗ ${problems.length} problem(s)${ANSI.reset}\n`);
for (const problem of problems) console.log(`  ${problem}\n`);
process.exit(1);
