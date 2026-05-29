/**
 * One-shot script that runs the grooming pricing-consistency checks and
 * reports pass/fail. Designed to be run with bun (which resolves the `@/`
 * tsconfig path alias natively) so we don't need a test framework.
 *
 *   bun run check:pricing
 *
 * Exits with code 0 when every scenario passes, code 1 otherwise — so the
 * script can be plugged into CI later without further changes.
 */

import { runPricingConsistencyChecks } from "@/lib/grooming/pricing-consistency-check";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const report = runPricingConsistencyChecks();
const total = report.results.length;
const passed = report.results.filter((r) => r.ok).length;
const failed = total - passed;

console.log(
  `${ANSI.bold}Grooming pricing consistency · ${total} scenario${total === 1 ? "" : "s"}${ANSI.reset}`,
);
console.log();

for (const r of report.results) {
  const mark = r.ok
    ? `${ANSI.green}PASS${ANSI.reset}`
    : `${ANSI.red}FAIL${ANSI.reset}`;
  console.log(`  ${mark}  ${r.name}`);
  if (!r.ok) {
    console.log(
      `        ${ANSI.red}expected $${r.expected.toFixed(2)} · got $${r.actual.toFixed(2)}${ANSI.reset}`,
    );
    console.log(`        ${ANSI.dim}${r.detail}${ANSI.reset}`);
  } else {
    console.log(
      `        ${ANSI.dim}$${r.actual.toFixed(2)} · ${r.detail}${ANSI.reset}`,
    );
  }
}

console.log();
if (report.ok) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ All ${total} scenarios passed${ANSI.reset}`,
  );
  process.exit(0);
} else {
  console.log(
    `${ANSI.red}${ANSI.bold}✗ ${failed} of ${total} scenarios failed${ANSI.reset}`,
  );
  console.log(
    `${ANSI.yellow}Pricing engine has regressed. See above for the diverging scenario.${ANSI.reset}`,
  );
  process.exit(1);
}
