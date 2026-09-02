/**
 * Guards against a fixture-era location hash deciding something about a real row.
 *
 *   bun run check:derived-location
 *
 * `deriveLocationId` (src/data/locations.ts) is `trailingDigits % 3` into one of
 * three hard-coded slugs — "loc-dv-main", "loc-dv-ouest", "loc-dv-laval". It was
 * written when locations were a fixture array and nothing carried a real one.
 *
 * `public.locations` is real now, and its ids are uuids. So a slug compared to a
 * real location id matches NOTHING, and the failure is silent in a particular
 * way: the comparison does not throw, it just answers no, and the screen shows
 * an empty list or a dead button that looks like an ordinary state.
 *
 * It has been found three times, and it got worse each time:
 *
 *   bookings           a branch selection emptied the table       (268797cb)
 *   calling            the Call Log filter, then its twin in
 *                      CallMetricsOverview over the same array    (c409e062, 80d9b0ae)
 *   gift cards         every card refused at the till, silently,
 *                      because the hash meant "bought elsewhere"  (80d9b0ae)
 *
 * The last one was money, and nothing on screen said why.
 *
 * ── WHAT THIS FLAGS: EVERY CALL, AND WHY IT IS NOT CLEVERER THAN THAT ─────
 *
 * The first version of this gate flagged a call only in a file that ALSO
 * fetched real data — an `@/lib/api/` import, a `useQuery`, a `fetch(`. That
 * is the shape the gift-cards and bookings bugs had, and it read as the
 * precise rule.
 *
 * It was tested by putting both of the day's bugs back. It caught one.
 * `CallMetricsOverview` takes its rows as a PROP, so the file has no fetch in
 * it at all — the real data arrives from a parent, and a rule that reads one
 * file cannot see that.
 *
 * So the rule is the blunt one: `deriveLocationId` is deprecated and its call
 * sites are frozen. Every existing one is listed below with what makes it
 * safe, and a new one fails. That is a claim a person re-checks when they edit
 * one of those files, rather than a heuristic that quietly has a blind spot.
 *
 * The list should only ever shrink.
 *
 * ── WHAT TO DO WHEN IT FIRES ──────────────────────────────────────────────
 *
 * Read the real column. `bookings`, `incidents` and `call_record` all have
 * `location_id`; `clients`, `gift_cards` and `staff` do not. When there is no
 * column, the answer is not a better guess — it is `null`, and whatever
 * consumes it must treat "unknown origin" as "do not filter, do not refuse".
 *
 * Exits 0 clean, 1 with the file, the line, and which signal made it real.
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
/** Where the function is declared. The fixture layer may use its own hash. */
const FIXTURE_LAYER = join("src", "data");

/**
 * Files that mix real data with the hash on purpose, and why that is safe.
 *
 * Each entry is a claim somebody has to re-check when they edit that file.
 * Keep it short: an allowlist that grows is a gate that has stopped working.
 */
const ALLOWED = new Map<string, string>([
  [
    "src/app/facility/dashboard/inventory/InventoryClient.tsx",
    "Inventory has no table — there is no `inventory_items` in Postgres, so " +
      "every row here is the fixture's and the hash is meaningless rather " +
      "than wrong. Delete this entry the day inventory is converted.",
  ],
  [
    "src/components/incidents/PetIncidentSafetyAlert.tsx",
    "Reads `incidents` from src/data and keys on a NUMERIC petId, so nothing " +
      "here is a real row. Note that `public.incidents` DOES have location_id " +
      "— when this component is converted, read that column, do not keep the " +
      "hash.",
  ],
  [
    "src/hooks/use-unified-bookings.tsx",
    "The hash is applied ONLY to `custom` bookings, which are still the " +
      "fixture's; boarding, daycare, grooming and training come from Postgres " +
      "and are excluded from the filter by name. Verify that list still " +
      "excludes every real source before adding a fifth.",
  ],
]);

/** Source with comments removed, so prose about the bug is not the bug. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
}

const findings: Finding[] = [];
const allowedHits: string[] = [];

for (const file of walk(ROOT)) {
  if (file.startsWith(FIXTURE_LAYER)) continue;

  const source = stripComments(readFileSync(file, "utf8"));
  // The CALL, not the import and not the word. A file may name it in a comment
  // saying it no longer uses it — four do, as of this being written.
  const pattern = /\bderiveLocationId\s*\(/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const posix = file.replace(/\\/g, "/");
    if (ALLOWED.has(posix)) {
      if (!allowedHits.includes(posix)) allowedHits.push(posix);
      continue;
    }
    findings.push({
      file: posix,
      line: source.slice(0, match.index).split("\n").length,
    });
  }
}

console.log(
  `${ANSI.bold}Derived location${ANSI.reset} ` +
    `${ANSI.dim}(${ROOT}, comments stripped, ${FIXTURE_LAYER.replace(/\\/g, "/")} excluded)${ANSI.reset}`,
);

for (const file of allowedHits) {
  console.log(`  ${ANSI.yellow}allowed${ANSI.reset} ${file}`);
  console.log(`    ${ANSI.dim}${ALLOWED.get(file)}${ANSI.reset}`);
}

if (findings.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no location hash decides anything about a real row${ANSI.reset}`,
  );
  process.exit(0);
}

console.log(
  `\n${ANSI.red}✗ ${findings.length} new call(s) to deriveLocationId${ANSI.reset}\n`,
);
for (const finding of findings) {
  console.log(`  ${finding.file}:${finding.line}`);
}
console.log(
  `\n  ${ANSI.bold}deriveLocationId returns a fixture slug${ANSI.reset} — "loc-dv-main" and two others.`,
);
console.log(
  `  A real location id is a uuid, so the comparison matches nothing and says so silently.`,
);
console.log(
  `  Read the row's own location_id (bookings, incidents, call_record have one).`,
);
console.log(
  `  Where no column exists (clients, gift_cards, staff), the answer is null —`,
);
console.log(
  `  and the consumer must treat an unknown origin as "do not filter, do not refuse".`,
);
process.exit(1);
