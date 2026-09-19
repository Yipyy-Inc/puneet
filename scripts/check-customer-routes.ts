/**
 * ============================================================================
 * A customer's facility comes from their own client row, never the session.
 *
 *   bun run check:customer-routes
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * `getFacilityContext()` resolves the facility by MEMBERSHIP, and for a caller
 * with none — every customer — it falls back to the demo facility. It returns
 * a 200 and a plausible answer, so nothing fails; the customer is simply shown
 * another business. That is how the customer booking wizard priced every pet
 * owner with the demo facility's rules (fixed 2026-09-19 by
 * /api/customer/settings), how the pay page was nearly pointed at the wrong
 * merchant, and why /api/customer/facility carries a warning about invoices.
 *
 * So no code under the customer's own routes may call it, or read the staff
 * settings or profile routes that are built on it. The facility comes through
 * the caller's client row (RLS admits only their own) or through the booking
 * row being acted on.
 *
 * Scanned: src/app/api/customer, src/app/customer, src/app/pay, src/app/book.
 * Comments are blanked first, so a file may say what it stopped doing.
 *
 * `activeFacilityIdForStaff()` is NOT on the list, deliberately: it is null
 * for a customer, so it narrows nothing for them, and it pins a member of
 * staff browsing the portal to the facility on screen — which
 * check:facility-scoped-reads requires of a list read.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const ROOTS = [
  "src/app/api/customer",
  "src/app/customer",
  "src/app/pay",
  "src/app/book",
];

/** What a customer's code may not reach for, and why. */
const FORBIDDEN: Array<{ pattern: RegExp; why: string }> = [
  {
    pattern: /\bgetFacilityContext\s*\(/,
    why: "resolves by membership; a customer gets the demo facility",
  },
  {
    pattern: /["'`]\/api\/facility\/(settings|profile)["'`?]/,
    why: "the staff route answers a customer with the demo facility — use /api/customer/*",
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

/** Comments become spaces, so line numbers still point at the right line. */
function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:"'`])\/\/[^\n]*/g,
      (m, lead: string) => lead + " ".repeat(m.length - lead.length),
    );
}

const offences: string[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = blankComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      for (const { pattern, why } of FORBIDDEN) {
        if (pattern.test(line)) {
          offences.push(
            `  ${file}:${i + 1}  ${line.trim()}\n    ${ANSI.dim}${why}${ANSI.reset}`,
          );
        }
      }
    });
  }
}

console.log(
  `${ANSI.bold}Customer routes${ANSI.reset} ${ANSI.dim}(${ROOTS.join(", ")})${ANSI.reset}\n`,
);
if (offences.length > 0) {
  console.log(offences.join("\n"));
  console.log(
    `\n${ANSI.red}${ANSI.bold}✗ ${offences.length} place(s) resolve a customer's facility from the session.${ANSI.reset}`,
  );
  console.log(
    `${ANSI.dim}Read the facility from the caller's own client row, or from the booking row being acted on.${ANSI.reset}`,
  );
  process.exit(1);
}
console.log(
  `${ANSI.green}${ANSI.bold}✓ no customer route resolves the facility from the session${ANSI.reset}`,
);
