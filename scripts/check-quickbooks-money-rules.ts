/**
 * Runs the QuickBooks money-rule scenarios and reports pass/fail.
 *
 *   bun run check:quickbooks
 *
 * These are the invariants a single document can't prove: RULE 5E's "deposits
 * net to zero and the full service price reaches income", and the package rule
 * that revenue is recognised once, at the sale, however many passes are burned.
 *
 * Exits 0 when every scenario passes, 1 otherwise, so it can be plugged into CI
 * alongside check:pricing.
 */

import { runQuickBooksMoneyRuleChecks } from "@/lib/quickbooks/documents/money-rules-check";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const report = runQuickBooksMoneyRuleChecks();
const total = report.results.length;
const failed = report.results.filter((r) => !r.ok).length;

console.log(
  `${ANSI.bold}QuickBooks money rules · ${total} scenario${total === 1 ? "" : "s"}${ANSI.reset}`,
);
console.log();

for (const r of report.results) {
  const mark = r.ok
    ? `${ANSI.green}PASS${ANSI.reset}`
    : `${ANSI.red}FAIL${ANSI.reset}`;
  console.log(`  ${mark}  ${r.name}`);
  console.log(`        ${r.ok ? ANSI.dim : ANSI.red}${r.detail}${ANSI.reset}`);
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
    `${ANSI.yellow}A document builder has regressed — money is landing in the wrong account.${ANSI.reset}`,
  );
  process.exit(1);
}
