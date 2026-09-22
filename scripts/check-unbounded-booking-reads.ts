/**
 * Guards against a spec reading EVERY booking to find one.
 *
 *   bun run check:unbounded-booking-reads
 *
 * `GET /api/bookings` with no narrowing param answers with the facility's whole
 * booking history. Measured 2026-09-17 against the e2e facility: 1,499 rows and
 * 16,215-20,484 ms, in TWO sequential PostgREST round trips because the route
 * pages at 1000. The same read as `?ref=<n>` is 1,194-1,367 ms. Fifteen times.
 *
 * ── WHY THIS IS A GATE AND NOT A STYLE NOTE ───────────────────────────────
 *
 * It became a billing problem. The organisation went 302% over Supabase's 5 GB
 * egress quota and into a grace period, and measured by `x_client_info` over
 * fourteen hours the suite was 79% of all database traffic while the
 * production VPS was 0.5% - 239 requests an hour, flat. The tests, not the
 * product, were the bill.
 *
 * It is also a correctness problem waiting to happen. `?clientRef=15` already
 * returns `500 canceling statement due to statement timeout`: that client
 * carries 1,073 bookings, 1,060 of them cancelled e2e debris, and the number
 * grows with every run because teardown CANCELS rather than deletes and the
 * append-only payment ledger pins the rows in place. An unbounded read is a
 * spec that gets slower every night until it fails for a reason that has
 * nothing to do with what it asserts.
 *
 * ── WHAT COUNTS AS NARROWED ───────────────────────────────────────────────
 *
 * Any of the params `src/lib/api/booking-list-params.ts` defines: `ref`,
 * `refs`, `clientRef`, `from`, `to`, `statuses`, `limit` - or a call to
 * `bookingListSearch(...)`, which is the typed way to build them and the one
 * to prefer. A hand-written `?bookingRef=` is NOT narrowing: the route ignores
 * an unknown param, so the spec still reads all 1,499 rows and still passes,
 * which is exactly the failure this gate exists to make visible.
 *
 * Exits 0 when no file exceeds its baseline, 1 otherwise. BASELINE carries the
 * reads that predate the gate, PER FILE, because a gate that fails on the day
 * it is written is a gate somebody deletes. There is deliberately no command
 * that rewrites it: the only direction it moves by hand is DOWN.
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const DIR = "tests/e2e";

/**
 * Unbounded reads that existed when this gate was written, per file.
 *
 * Most are marker-based teardown sweeps that must see CANCELLED rows too, in
 * order to refund a booking the run paid for - so they cannot be narrowed by
 * status the way the others were, and `?clientRef=` is the read that times out
 * for the client they use. They are waiting on the debris being cleared, not on
 * somebody noticing them. See docs/quality/debt-map.md, 2026-09-17.
 */
const BASELINE: Record<string, number> = {
  "booking-detail-redirect.spec.ts": 1,
  "booking-line-items.spec.ts": 1,
  "booking-payment-ledger.spec.ts": 1,
  "booking-presence.spec.ts": 1,
  "booking-tip-split.spec.ts": 1,
  "booking-write-integrity.spec.ts": 2,
  "bookings-list.spec.ts": 2,
  "client-balance.spec.ts": 1,
  "client-pet-write-path.spec.ts": 1,
  "daily-care-board.spec.ts": 1,
  "dashboard-live-board.spec.ts": 1,
  "daycare-attendance.spec.ts": 1,
  "grooming-ready-estimate.spec.ts": 1,
  "operations-calendar.spec.ts": 1,
  "training-attendance.spec.ts": 1,
};

/** Params the route actually applies, plus the typed builder. */
const NARROWING =
  /(bookingListSearch|[?&](ref|refs|clientRef|from|to|statuses|limit)=)/;

/** Blank comments so prose ABOUT an unbounded read is not counted as one. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([^\n]*?)\/\/[^\n]*$/gm, (_m, before: string) => before);
}

interface Finding {
  file: string;
  line: number;
  text: string;
}

const findings: Finding[] = [];

for (const file of readdirSync(DIR)
  .filter((f) => f.endsWith(".ts"))
  .sort()) {
  const lines = withoutComments(readFileSync(join(DIR, file), "utf8")).split(
    "\n",
  );

  lines.forEach((line, index) => {
    // The LIST endpoint only: `/api/bookings/<id>` is a single-row route.
    const literal = line.match(
      /["'`](?:[^"'`]*)?\/api\/bookings(\?[^"'`]*)?["'`]/,
    );
    if (!literal) return;
    if (NARROWING.test(line)) return;

    // A write uses the same path. `.get(` sits on the same line as the literal
    // in every read shape here, so this needs no fragile look-back.
    const previous = index > 0 ? lines[index - 1] : "";
    const isGet = /\.get\s*\(/.test(line) || /\.get\s*\(\s*$/.test(previous);
    if (!isGet) return;

    findings.push({ file, line: index + 1, text: line.trim() });
  });
}

const counts = new Map<string, Finding[]>();
for (const f of findings) {
  if (!counts.has(f.file)) counts.set(f.file, []);
  counts.get(f.file)!.push(f);
}

console.log(`${ANSI.bold}Unbounded booking-list reads${ANSI.reset}`);
console.log(
  `  ${ANSI.dim}${findings.length} read(s) in ${counts.size} file(s) under ${DIR}${ANSI.reset}`,
);

const over: string[] = [];
for (const [file, hits] of [...counts].sort()) {
  const allowed = BASELINE[file] ?? 0;
  if (hits.length > allowed) {
    over.push(file);
    console.log(
      `\n  ${ANSI.red}✗${ANSI.reset} ${ANSI.bold}${file}${ANSI.reset} has ${hits.length}, baseline allows ${allowed}`,
    );
    for (const h of hits)
      console.log(
        `      ${ANSI.dim}L${h.line}  ${h.text.slice(0, 96)}${ANSI.reset}`,
      );
  }
}

// A baseline entry whose file improved must come DOWN, or the win leaks back.
const stale = Object.keys(BASELINE)
  .filter((file) => (counts.get(file)?.length ?? 0) < BASELINE[file])
  .map(
    (file) => `${file}: ${counts.get(file)?.length ?? 0} < ${BASELINE[file]}`,
  );

if (over.length > 0) {
  console.log(
    `\n${ANSI.dim}Name the slice the read needs - bookingListSearch({ ref }) for one` +
      `\nbooking, { statuses } for a sweep, { clientRef } for one client's rows.` +
      `\nsrc/lib/api/booking-list-params.ts is the whole list.${ANSI.reset}\n`,
  );
  process.exit(1);
}

if (stale.length > 0) {
  console.log(
    `\n  ${ANSI.red}✗${ANSI.reset} the baseline is stale - lower these by hand:`,
  );
  for (const s of stale) console.log(`      ${ANSI.dim}${s}${ANSI.reset}`);
  console.log(
    `\n${ANSI.dim}An unrecorded win leaks back: the next unbounded read in that file` +
      `\nwould pass. Edit BASELINE in this script.${ANSI.reset}\n`,
  );
  process.exit(1);
}

console.log(
  `\n${ANSI.green}${ANSI.bold}✓ no new unbounded booking-list read${ANSI.reset}` +
    ` ${ANSI.dim}(${findings.length} baselined)${ANSI.reset}`,
);
