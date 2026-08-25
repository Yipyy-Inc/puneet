/**
 * ============================================================================
 * A number written in prose is a number that goes stale.
 *
 *   bun run check:doc-counts
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * AGENTS.md and CLAUDE.md quote three counts — how many Playwright specs
 * exist, how many of them CI runs, and how many SQL test files there are — and
 * every one of them has been wrong at some point:
 *
 *   "No automated tests exist"   in the architecture overview, for weeks after
 *                                51 spec files existed
 *   "It is 48 specs, not 10"     when it was 50
 *   "It is 50 specs, not 10"     when it was 52, within an HOUR of the 48 -> 50
 *                                correction, because another session added a
 *                                spec in the meantime
 *
 * AGENTS.md already tells the reader not to trust the number and to count the
 * list themselves. That is the right advice and it is not a fix: the prose
 * still asserts a figure, and a reader who does not follow the instruction
 * believes it. Four corrections in one file is the point at which the answer
 * stops being "be more careful" and starts being "make it fail the build".
 *
 * ── WHY THE NUMBERS ARE WORTH KEEPING AT ALL ──────────────────────────────
 *
 * Deleting them was the obvious alternative and it is worse. The counts are
 * load-bearing: "run the 52 specs CI runs" is a different instruction from
 * "run the suite", and somebody deciding whether they have time to run it
 * locally needs to know the scale. A number that is guaranteed correct is more
 * useful than no number and far more useful than a stale one.
 *
 * ── IT COUNTS FILES ON DISK, INCLUDING UNCOMMITTED ONES ───────────────────
 *
 * Deliberate, and it surprised its own author within the hour: this repo is
 * sometimes worked by two sessions in one tree, and the gate went red on a
 * colleague's machine because of a test file THEY had not committed yet. That
 * is the correct answer — the count really was 46 on that disk — and the fix is
 * always "commit the file", never "edit the number down" and never "ignore
 * untracked files".
 *
 * Ignoring them would defeat the point twice over: the number would be right
 * about the repository and wrong about the working tree the reader is looking
 * at, and somebody adding a spec would see green until the moment they
 * committed, which is the least useful moment to be told.
 *
 * ── WHAT IT DOES NOT CHECK ────────────────────────────────────────────────
 *
 * Only these three counts, and only where they are written in the form the
 * patterns below expect. It is not a general prose-accuracy gate; there is no
 * such thing. Every other claim in those files is still on the honour system,
 * which is why the debt map asks for the measurement behind an assertion
 * rather than the assertion alone.
 *
 * Exits 0 clean, 1 with the exact edit to make.
 * ============================================================================
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

/** Spec files on disk, which is what `bun run test:e2e` walks. */
function specFileCount(): number {
  return readdirSync(join("tests", "e2e")).filter((f) => f.endsWith(".spec.ts"))
    .length;
}

/** SQL test files, which is what `bun run test:sql` walks. */
function sqlFileCount(): number {
  return readdirSync(join("supabase", "tests")).filter((f) =>
    f.endsWith(".sql"),
  ).length;
}

/**
 * Specs named on the `test:e2e:ci` command line.
 *
 * The script is `playwright test a b c ...`, so the count is the token count
 * less the two leading words. Derived rather than hardcoded for the same
 * reason this file exists at all.
 */
function specCountOf(scriptName: string): number {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const script = pkg.scripts[scriptName];
  if (!script) throw new Error(`package.json has no ${scriptName} script.`);
  return script.trim().split(/\s+/).length - 2;
}

/** The full suite — nightly, and by hand before anything that matters. */
const ciSpecCount = () => specCountOf("test:e2e:ci");

/**
 * The subset that runs on every push.
 *
 * Split out on 2026-08-25: 59 specs is ~45 minutes, GitHub holds one pending
 * run per branch, and two people pushing meant each new push cancelled the
 * previously queued run — so nothing ever finished and commits went unverified.
 * The prose has to say which number is which, or "the specs CI runs" becomes
 * ambiguous in exactly the way this file exists to prevent.
 */
const gateSpecCount = () => specCountOf("test:e2e:gate");

interface Claim {
  file: string;
  /** Must capture the number in group 1. */
  pattern: RegExp;
  label: string;
  actual: number;
}

const CLAIMS: Claim[] = [
  {
    file: "AGENTS.md",
    pattern: /Playwright, (\d+) spec files under/,
    label: "spec files (prose)",
    actual: specFileCount(),
  },
  {
    file: "AGENTS.md",
    pattern: /The whole Playwright suite \((\d+) files/,
    label: "spec files (command table)",
    actual: specFileCount(),
  },
  {
    file: "AGENTS.md",
    pattern: /The (\d+) specs CI runs on every push/,
    label: "specs in test:e2e:gate (command table)",
    actual: gateSpecCount(),
  },
  {
    file: "AGENTS.md",
    pattern: /the gate is \*\*(\d+)\*\* specs/,
    label: "specs in test:e2e:gate (prose)",
    actual: gateSpecCount(),
  },
  {
    file: "AGENTS.md",
    pattern: /the full suite is \*\*(\d+)\*\* specs/,
    label: "specs in test:e2e:ci (prose)",
    actual: ciSpecCount(),
  },
  {
    file: "AGENTS.md",
    pattern: /The (\d+) SQL files/,
    label: "SQL test files (command table)",
    actual: sqlFileCount(),
  },
  {
    file: "AGENTS.md",
    pattern: /It is (\d+) files and ~90 seconds/,
    label: "SQL test files (prose)",
    actual: sqlFileCount(),
  },
  {
    file: "CLAUDE.md",
    pattern: /It is (\d+) specs, not 10/,
    label: "specs in test:e2e:ci",
    actual: ciSpecCount(),
  },
];

console.log(`${ANSI.bold}Doc-count guard${ANSI.reset}`);

const wrong: string[] = [];
const missing: string[] = [];

for (const claim of CLAIMS) {
  const text = readFileSync(claim.file, "utf8");
  const found = text.match(claim.pattern);

  if (!found) {
    // The sentence was reworded. That is allowed — but the guard can no longer
    // see the number, so it says so rather than passing vacuously, which is
    // how `rpc-session-required.sql` failed unread for weeks.
    missing.push(
      `${claim.file}: ${claim.label} — pattern no longer matches; update the pattern in this script or remove the claim`,
    );
    continue;
  }

  const claimed = Number(found[1]);
  if (claimed !== claim.actual) {
    wrong.push(
      `${claim.file}: ${claim.label} says ${claimed}, actual is ${claim.actual}`,
    );
  }
}

if (wrong.length === 0 && missing.length === 0) {
  console.log(
    `  ${ANSI.dim}${specFileCount()} spec files · ${ciSpecCount()} in CI · ${sqlFileCount()} SQL files${ANSI.reset}\n`,
  );
  console.log(
    `${ANSI.green}${ANSI.bold}✓ every counted claim in AGENTS.md and CLAUDE.md is true${ANSI.reset}`,
  );
  process.exit(0);
}

console.log();
for (const line of wrong) console.log(`  ${ANSI.red}✗${ANSI.reset} ${line}`);
for (const line of missing) console.log(`  ${ANSI.red}?${ANSI.reset} ${line}`);
console.log(
  `\n${ANSI.dim}Added or removed a spec? Update the number in the same commit — that is the whole job.${ANSI.reset}`,
);
process.exit(1);
