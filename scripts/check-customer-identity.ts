/**
 * ============================================================================
 * No new screen may decide for itself who the customer is.
 *
 *   bun run check:customer-identity
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * `const MOCK_CUSTOMER_ID = 15` — Alice Johnson — was declared in 34 customer
 * portal files. Every signed-in pet owner was shown her bookings, her pets and
 * her household, on a live site, while Clerk knew exactly who was asking. It
 * spread that far because nothing objected: each file was locally reasonable
 * and the defect only exists in aggregate.
 *
 * The seam is `useCurrentCustomer()` (src/lib/api/current-customer.ts), which
 * resolves the caller's own client record from the session. There is no reason
 * for a screen to name a customer id again.
 *
 * ── THE RATCHET REACHED ZERO ──────────────────────────────────────────────
 *
 * It started at 34 baselined files and the list is now empty, so this is a
 * plain rule again: no file may hardcode a customer id. The BASELINE set is
 * kept — empty — because the mechanism is what made getting here possible, and
 * a future bulk migration will want it rather than a cliff.
 *
 * A stale entry also fails, so the set cannot quietly re-permit a fixed file.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

/**
 * Files that still hardcode the customer. Shrinking list — delete an entry when
 * the file moves onto useCurrentCustomer(). DO NOT ADD.
 */
const BASELINE = new Set<string>([]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

/**
 * A declaration, not a mention. The migration notes in current-customer.ts and
 * the converted screens quote the old constant by name, and flagging a file for
 * explaining what it stopped doing would be the wrong lesson entirely.
 */
function declaresMockCustomer(source: string): boolean {
  return source.split("\n").some((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return false;
    return /\bconst\s+MOCK_CUSTOMER_ID\b/.test(line);
  });
}

const offenders = walk("src")
  .filter((file) => declaresMockCustomer(readFileSync(file, "utf8")))
  .sort();

const introduced = offenders.filter((f) => !BASELINE.has(f));
const fixed = [...BASELINE].filter((f) => !offenders.includes(f)).sort();

console.log(
  `${ANSI.bold}Customer identity guard${ANSI.reset} ${ANSI.dim}(${offenders.length} file(s) still hardcode the customer)${ANSI.reset}\n`,
);

for (const file of introduced) {
  console.log(`  ${ANSI.red}NEW${ANSI.reset}  ${file}`);
  console.log(
    `        ${ANSI.dim}hardcodes a customer id. Use useCurrentCustomer() — the session already knows who is asking.${ANSI.reset}`,
  );
}

if (fixed.length > 0) {
  console.log(
    `${ANSI.yellow}${fixed.length} baselined file(s) no longer hardcode it — remove them from BASELINE in this script:${ANSI.reset}`,
  );
  for (const file of fixed) console.log(`  ${ANSI.dim}${file}${ANSI.reset}`);
  console.log();
}

if (introduced.length === 0 && fixed.length === 0) {
  const note =
    offenders.length > 0
      ? ` ${ANSI.yellow}(${offenders.length} baselined, still to convert)${ANSI.reset}`
      : "";
  console.log(
    `${ANSI.green}${ANSI.bold}✓ No new hardcoded customer${ANSI.reset}${note}`,
  );
  process.exit(0);
}

// A stale baseline is also a failure: left alone it silently re-permits a file
// that was already fixed.
process.exit(1);
