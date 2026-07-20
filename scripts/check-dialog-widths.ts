/**
 * Guards against non-responsive dialog widths.
 *
 *   bun run check:dialog-widths
 *
 * Using a *minimum* width on a dialog (`min-w-5xl`, `min-w-[900px]`, …) forces
 * the dialog wider than the viewport on phones and tablets: a `min-w-5xl`
 * dialog renders 1024px wide on a 390px phone, overflowing ~317px off BOTH
 * sides, and it also defeats the `max-w-[calc(100%-2rem)]` guard baked into
 * `DialogContent`. This was a real, repo-wide bug (68 occurrences across 39
 * files) that broke essentially every wide modal on mobile.
 *
 * Use a responsive *maximum* instead, so small screens fall back to the base
 * `max-w-[calc(100%-2rem)]`:
 *
 *   <DialogContent className="min-w-5xl">        ❌ 1024px floor, always
 *   <DialogContent className="sm:max-w-5xl">     ✅ wide on sm+, fits phones
 *
 * Viewport-relative minimums (`min-w-[90vw]`) scale with the screen and are
 * allowed. Breakpoint-prefixed minimums (`lg:min-w-[1024px]`) only apply above
 * that breakpoint and are allowed too.
 *
 * Exits 0 when clean, 1 on any violation — safe to plug into CI.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Overlay containers whose width must stay responsive. */
const DIALOG_TOKENS = [
  "DialogContent",
  "SheetContent",
  "AlertDialogContent",
  "DrawerContent",
];

/**
 * A fixed (non-viewport-relative) min-width, NOT prefixed by a breakpoint.
 * Matches: min-w-5xl, min-w-lg, min-w-[900px], min-w-[72rem]
 * Skips:   lg:min-w-[1024px] (breakpoint-gated), min-w-[90vw] (viewport-rel),
 *          min-w-0, min-w-full, min-w-fit, min-w-min, min-w-max
 */
const BAD_MIN_W =
  /(?<![a-z0-9:-])min-w-(?:(?:\d?xl|sm|md|lg)\b|\[\s*\d+(?:\.\d+)?(?:px|rem|em)\s*\])/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
  }
  return out;
}

interface Violation {
  file: string;
  line: number;
  cls: string;
  text: string;
}

const violations: Violation[] = [];

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  if (!DIALOG_TOKENS.some((t) => src.includes(t))) continue;

  const lines = src.split(/\r?\n/);
  // The shared Modal size map feeds straight into DialogContent, so its size
  // classes are held to the same rule even though the token isn't on the line.
  const isSharedModal = file.endsWith(`ui${sep}modal.tsx`);

  lines.forEach((line, i) => {
    const onDialogLine = DIALOG_TOKENS.some((t) => line.includes(t));
    const inSizeMap = isSharedModal && /^\s*\w+:\s*"/.test(line);
    if (!onDialogLine && !inSizeMap) return;

    for (const m of line.matchAll(BAD_MIN_W)) {
      violations.push({
        file: relative(ROOT, file),
        line: i + 1,
        cls: m[0],
        text: line.trim().slice(0, 100),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Rule 2: a custom full-screen dialog shell must provide a scroll container.
//
// `<div role="dialog" className="fixed inset-0 flex flex-col">` pins the shell
// to the viewport height. Without `overflow-y-auto` on the body, content taller
// than the screen is simply unreachable — on a 390px phone the Add Facility and
// Data Import wizards hid their lower fields AND the Next button, dead-ending
// the flow. (Dialogs built on `DialogContent` are safe: the shared component
// already ships `max-h-[calc(100vh-2rem)] overflow-y-auto`.)
// ---------------------------------------------------------------------------
const shellViolations: { file: string; line: number }[] = [];

for (const file of walk(SRC)) {
  if (file.includes(`ui${sep}`)) continue; // shared primitives handle their own
  const src = readFileSync(file, "utf8");
  if (!src.includes('role="dialog"')) continue;
  if (!/fixed inset-0/.test(src)) continue;
  // Strip comments first — an explanatory comment mentioning `overflow-y-auto`
  // must not satisfy the rule (this exact false-negative slipped through once).
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  if (/overflow-y-auto|overflow-auto|overflow-y-scroll/.test(code)) continue;

  const line =
    src.split(/\r?\n/).findIndex((l) => l.includes('role="dialog"')) + 1;
  shellViolations.push({ file: relative(ROOT, file), line });
}

if (violations.length === 0 && shellViolations.length === 0) {
  console.log(
    `${ANSI.green}✓${ANSI.reset} check:dialog-widths — dialogs are responsive (no fixed min-widths, full-screen shells scroll)`,
  );
  process.exit(0);
}

if (shellViolations.length > 0) {
  console.error(
    `${ANSI.red}${ANSI.bold}✗ check:dialog-widths — ${shellViolations.length} full-screen dialog shell(s) with no scroll container${ANSI.reset}\n`,
  );
  for (const v of shellViolations) {
    console.error(`  ${ANSI.bold}${v.file}:${v.line}${ANSI.reset}`);
    console.error(
      `    ${ANSI.dim}role="dialog" + fixed inset-0, but nothing scrolls — tall content is unreachable on short screens.${ANSI.reset}`,
    );
  }
  console.error(
    `\n  Fix: wrap the body in ${ANSI.green}<div className="min-h-0 flex-1 overflow-y-auto">${ANSI.reset}\n`,
  );
  if (violations.length === 0) process.exit(1);
}

console.error(
  `${ANSI.red}${ANSI.bold}✗ check:dialog-widths — ${violations.length} non-responsive dialog width(s)${ANSI.reset}\n`,
);
for (const v of violations) {
  console.error(
    `  ${ANSI.bold}${v.file}:${v.line}${ANSI.reset}  ${ANSI.red}${v.cls}${ANSI.reset}`,
  );
  console.error(`    ${ANSI.dim}${v.text}${ANSI.reset}`);
}
console.error(
  `\n  Fix: use a responsive max-width instead, e.g. ${ANSI.green}sm:max-w-5xl${ANSI.reset} ` +
    `${ANSI.dim}(phones then fall back to the base max-w-[calc(100%-2rem)])${ANSI.reset}\n`,
);
process.exit(1);
