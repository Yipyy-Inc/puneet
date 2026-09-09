#!/usr/bin/env bun
/**
 * Every `check:*` script, in one command, exactly as CI runs them.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
 *
 * There are 34 of them and no way to run them all, so "run the checks" meant
 * "run the ones you happen to remember". On 2026-09-09 a push went red on
 * `check:success-claims` after a local sweep of six checks came back green:
 * converting a `toast.success("Task added")` to `toast.success(t("taskAdded"))`
 * dropped a baselined claim, the ratchet correctly demanded its entry be
 * removed, and nothing local had asked.
 *
 * That is the shape of every ratchet in this repo — an unrecorded win leaks
 * back — and the ratchets only work if the whole set is cheap to run.
 *
 * ── WHY IT DISCOVERS THEM RATHER THAN LISTING THEM ───────────────────────
 *
 * A hand-written list is a 35th thing to keep in step, and the doc-count guard
 * exists because four such lists went stale. This reads `package.json`, so a
 * check added tomorrow is run by this today.
 *
 * ── WHY IT DOES NOT STOP AT THE FIRST FAILURE ────────────────────────────
 *
 * CI's own step collects failures and reports them together, and so does this:
 * finding three problems in one run beats three round trips.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ANSI = {
  reset: "[0m",
  bold: "[1m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
};

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

// `check:all` itself is excluded, or this recurses forever.
const checks = Object.keys(pkg.scripts)
  .filter((s) => s.startsWith("check:") && s !== "check:all")
  .sort();

console.log(
  `${ANSI.bold}Every check${ANSI.reset} ${ANSI.dim}— ${checks.length} of them${ANSI.reset}\n`,
);

const failed: string[] = [];

for (const script of checks) {
  const name = script.slice("check:".length);
  // `spawnSync`, not `execSync`: a gate's whole job is to exit non-zero, and
  // `execSync` throws on that — which has bitten twice in this repo, both
  // times in a script written to READ another gate's result.
  const run = spawnSync("bun", ["run", script], {
    encoding: "utf8",
    shell: true,
  });
  const ok = run.status === 0;
  if (!ok) failed.push(name);
  console.log(
    `  ${ok ? `${ANSI.green}✓${ANSI.reset}` : `${ANSI.red}✗${ANSI.reset}`} ${name}`,
  );
  if (!ok) {
    // Only the failing output, and only its tail — the point is to say what
    // to fix, not to reprint 34 clean reports.
    const out = `${run.stdout ?? ""}${run.stderr ?? ""}`
      .split("\n")
      .filter((l) => l.trim() !== "")
      .slice(-12);
    for (const line of out)
      console.log(`      ${ANSI.dim}${line}${ANSI.reset}`);
  }
}

console.log();
if (failed.length > 0) {
  console.log(
    `${ANSI.red}${ANSI.bold}✗ ${failed.length} check(s) failed:${ANSI.reset} ${failed.join(", ")}`,
  );
  process.exit(1);
}
console.log(
  `${ANSI.green}${ANSI.bold}✓ all ${checks.length} checks pass${ANSI.reset}`,
);
