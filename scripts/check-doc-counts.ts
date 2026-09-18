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
    // Reworded when the suite was split: the sentence used to be "It is 59
    // specs, not 10", which stopped being true of what CI runs on a push.
    pattern: /because (\d+) specs is ~45\s+minutes/,
    label: "specs in test:e2e:ci",
    actual: ciSpecCount(),
  },
  {
    file: "CLAUDE.md",
    pattern: /the (\d+)-spec gate on a push/,
    label: "specs in test:e2e:gate",
    actual: gateSpecCount(),
  },
  {
    // The deploy sequence quotes the gate size too, and said 14 from the day the
    // suite was split until 2026-09-01 — no pattern here matched that sentence,
    // so nothing contradicted it while the two beside it were checked every run.
    file: "AGENTS.md",
    pattern: /CI runs the (\d+)-spec gate, the SQL tests/,
    label: "specs in test:e2e:gate (deploy sequence)",
    actual: gateSpecCount(),
  },
  {
    // The checks job counting itself. See checkScriptCount().
    file: ".github/workflows/ci.yml",
    pattern: /# (\d+) `check:\*` scripts run here/,
    label: "check:* scripts in the checks job",
    actual: checkScriptCount(),
  },
  // ── ci.yml's OWN prose about the split, which drifted twice unnoticed ────
  //
  // Added 2026-09-17. The e2e job's comments and the two lines it ECHOES into
  // every run's log said 12, then 27, then 47, then 83 — none of them true.
  // The log line is the worst of them, because it is what a person reads when
  // they open a run to see what was covered: it announced "Gate (27 specs)"
  // while the command beneath it listed 33, and "The full suite runs nightly"
  // for hours after the nightly had been switched off.
  //
  // None of the patterns above matched those sentences, which is the very
  // failure this script's header describes — a count nothing derives is a
  // count that goes stale, and sitting inside the CI file buys no immunity.
  {
    file: ".github/workflows/ci.yml",
    pattern: /# So this job now runs the (\d+) specs that guard/,
    label: "specs in test:e2e:gate (e2e job comment)",
    actual: gateSpecCount(),
  },
  {
    file: ".github/workflows/ci.yml",
    pattern: /money\. The other (\d+) still run,/,
    label: "full-suite specs NOT in the gate (e2e job comment)",
    actual: ciSpecCount() - gateSpecCount(),
  },
  {
    file: ".github/workflows/ci.yml",
    pattern: /# A push or a PR runs the (\d+)-spec gate/,
    label: "specs in test:e2e:gate (suite-choice comment)",
    actual: gateSpecCount(),
  },
  {
    file: ".github/workflows/ci.yml",
    pattern: /# A manual workflow_dispatch runs all (\d+)\./,
    label: "specs in test:e2e:ci (suite-choice comment)",
    actual: ciSpecCount(),
  },
  {
    // The two lines CI prints into the log of every single run.
    file: ".github/workflows/ci.yml",
    pattern: /echo "Full suite \((\d+) specs\)\."/,
    label: "specs in test:e2e:ci (the log line CI prints)",
    actual: ciSpecCount(),
  },
  {
    file: ".github/workflows/ci.yml",
    pattern: /echo "Gate \((\d+) specs: access & money\)/,
    label: "specs in test:e2e:gate (the log line CI prints)",
    actual: gateSpecCount(),
  },
  // ── the control-heights ratchet's total ─────────────────────────────────
  //
  // Added 2026-09-17. AGENTS.md said "625 across 235 files" while the
  // baseline in check-control-heights.ts summed to 537 across 199: every
  // per-file entry that came DOWN left this sentence behind, because nothing
  // derived it. A ratchet's headline number is exactly the kind that only
  // ever moves by hand, which is why it goes stale.
  {
    file: "AGENTS.md",
    pattern: /Ratcheted PER FILE at (\d+) across \d+ files/,
    label: "check:control-heights baseline total",
    actual: controlHeightsBaseline().total,
  },
  {
    file: "AGENTS.md",
    pattern: /Ratcheted PER FILE at \d+ across (\d+) files/,
    label: "check:control-heights baselined files",
    actual: controlHeightsBaseline().files,
  },
];

/**
 * How many `check:*` scripts the checks job actually runs, read out of its own
 * loop in ci.yml.
 *
 * The job's header comment counts them in prose, and said "Fourteen" from the
 * day it was written until 2026-09-02, by which point there were 22 — inside
 * the file that runs THIS script, which exists because counts written by hand
 * go stale. Deriving it costs four lines.
 *
 * Read from the `for script in \` list rather than from package.json on
 * purpose: a script registered in package.json but never added here would be
 * invisible to CI, and counting package.json would hide exactly that.
 */
function checkScriptCount(): number {
  const ci = readFileSync(join(".github", "workflows", "ci.yml"), "utf8");
  const loop = ci.match(/for script in \\\n([\s\S]*?)\n\s*do\n/);
  if (!loop) return 0;
  return loop[1]
    .split("\n")
    .map((line) => line.replace(/\\/g, "").trim())
    .filter(Boolean).length;
}

/**
 * The control-heights ratchet, summed out of its own BASELINE entries.
 *
 * Read from the script rather than by running it: the headline in AGENTS.md
 * describes the baseline, not today's hits, and the two differ by exactly the
 * wins nobody has recorded yet.
 */
function controlHeightsBaseline(): { total: number; files: number } {
  const src = readFileSync(join("scripts", "check-control-heights.ts"), "utf8");
  const entries = [...src.matchAll(/\["[^"]+\.tsx?\",\s*(\d+)\]/g)];
  return {
    total: entries.reduce((sum, m) => sum + Number(m[1]), 0),
    files: entries.length,
  };
}

/**
 * The jobs that gate a deploy, read out of `image`'s `needs:` in ci.yml.
 *
 * This is a LIST, not a count, and it is the one CI fact that decides whether
 * code reaches production: `image` builds only when every job named there has
 * passed, and `deploy` needs `image`. Both docs describe that list in prose and
 * both got it wrong the same way — they named six jobs and omitted `unit`, from
 * the day the sequence was written until 2026-09-01.
 *
 * It is deliberately NOT the branch-protection required-check set. That reads
 * five, lives in GitHub's settings rather than the repository, and needs an
 * admin token to enumerate — and a check that silently skips when the token is
 * missing is the appearance of a gate rather than a gate. What decides the
 * deploy is in the repo, so that is what gets checked here.
 */
function deployGateJobs(): string[] {
  const ci = readFileSync(join(".github", "workflows", "ci.yml"), "utf8");
  const needs = ci.match(/^\s{4}needs:\s*\[([^\]]+)\]/m);
  if (!needs) return [];
  return needs[1]
    .split(",")
    .map((job) => job.trim())
    .filter(Boolean);
}

/**
 * Both docs write the list as prose — backticked in AGENTS.md, bare in
 * CLAUDE.md — so the comparison is on the job NAMES in order, not on the
 * punctuation around them.
 */
function jobsNamedIn(text: string, pattern: RegExp): string[] | null {
  const found = text.match(pattern);
  if (!found) return null;
  return found[1]
    .split(/,|\band\b/)
    .map((job) => job.replace(/[`\s]/g, ""))
    .filter(Boolean);
}

const GATE_LIST_CLAIMS: { file: string; pattern: RegExp; label: string }[] = [
  {
    file: "AGENTS.md",
    pattern: /built only once ([^.]+?) have passed/,
    label: "deploy-gating jobs (prose)",
  },
  {
    file: "CLAUDE.md",
    pattern: /image is built only once ([^.]+?) have passed/,
    label: "deploy-gating jobs (prose)",
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

const gateJobs = deployGateJobs();

if (gateJobs.length === 0) {
  missing.push(
    "ci.yml: could not read `image`'s needs: — the deploy-gating job list cannot be checked",
  );
}

for (const claim of GATE_LIST_CLAIMS) {
  const named = jobsNamedIn(readFileSync(claim.file, "utf8"), claim.pattern);

  if (!named) {
    missing.push(
      `${claim.file}: ${claim.label} — pattern no longer matches; update the pattern in this script or remove the claim`,
    );
    continue;
  }

  if (gateJobs.length > 0 && named.join(",") !== gateJobs.join(",")) {
    wrong.push(
      `${claim.file}: ${claim.label} says [${named.join(", ")}], ci.yml says [${gateJobs.join(", ")}]`,
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
