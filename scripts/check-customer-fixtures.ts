/**
 * ============================================================================
 * A customer screen must not decide anything from a fixture keyed by an id.
 *
 *   bun run check:customer-fixtures
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * Real client refs start at 15 and run straight through the fixture id range,
 * so `row.clientId === customer.id` matches CONSTANTLY: fixture client 15 and
 * the real Alice Johnson are the same number. The same is true of pet ids.
 *
 * The only thing keeping most of these rows off a real customer's screen is an
 * accident — `useCustomerFacility` defaults to fixture facility 1 while the
 * mapper stamps real rows 11, so a predicate that ALSO checks `facilityId`
 * matches nothing. That accident is written down in `use-customer-facility.tsx`
 * as "an accident, not a design, so it is written down rather than relied on
 * quietly", and `tests/unit/customer-fixture-isolation.test.ts` measures it for
 * the four money arrays.
 *
 * A fixture with NO facility field was never protected by any of that, and
 * three of them reached real people before anyone looked:
 *
 *   * loyalty — points, tier and progress, from `clientId: 15`;
 *   * vaccinations — "missing" for every required vaccine, for every pet,
 *     because fixture pet ids are 1, 2, 3, 5, 13, 14 and a real pet is none;
 *   * payment methods — a saved Visa ending 4242 in the name "Alice Johnson",
 *     on a real customer's billing page.
 *
 * Each was found by reading. This counts them instead.
 *
 * ── WHAT IT MEASURES ──────────────────────────────────────────────────────
 *
 * A VALUE import from `@/data/*` in the customer portal, whose binding is then
 * filtered by an identity (`clientId`, `petId`, `customerId`, `ownerId`).
 * `import type` is ignored — a type is erased and decides nothing.
 *
 * Reads whose predicate ALSO names a facility are marked `guarded`: they are
 * live only because of the id mismatch above, so they are counted, but the
 * EXPOSED ones are what to fix first and the report says which.
 *
 * ── A RATCHET, PER FILE, WITH NO WRITER ───────────────────────────────────
 *
 * 38 of these exist today and they are not one change. The baseline is a count
 * per file in `scripts/check-customer-fixtures.baseline.json`, and there is
 * deliberately NO command that writes it — the only direction it moves by hand
 * is down, which is the same decision `check:ui-french` made for the same
 * reason. A file not in the baseline may have none.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const ROOTS = [
  "src/app/customer",
  "src/app/pay",
  "src/app/book",
  "src/components/customer",
];

const BASELINE_PATH = "scripts/check-customer-fixtures.baseline.json";

/** The id fields that collide with a real ref. */
const IDENTITY = /\b(clientId|petId|customerId|ownerId|client_id|pet_id)\b/;
/** A predicate that also names a facility is live only by the id mismatch. */
const FACILITY = /\bfacilityId\b|\bfacility_id\b/;
/** How far past the call to look for the predicate's body. */
const PREDICATE_WINDOW = 400;

interface Finding {
  file: string;
  line: number;
  binding: string;
  exposed: boolean;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path.split("\\").join("/"));
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

/** The value bindings a file imports from `@/data/*`. Types are skipped. */
function fixtureBindings(source: string): string[] {
  const names: string[] = [];
  const importRe =
    /import\s+(?!type\b)\{([^}]+)\}\s+from\s+["']@\/data\/[^"']+["']/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source))) {
    for (const raw of match[1].split(",")) {
      const spec = raw.trim();
      if (spec === "" || spec.startsWith("type ")) continue;
      const name = spec.split(" as ").pop()!.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

const findings: Finding[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = blankComments(readFileSync(file, "utf8"));
    const bindings = fixtureBindings(source);
    if (bindings.length === 0) continue;

    for (const binding of bindings) {
      const useRe = new RegExp(
        `\\b${binding}\\s*\\.\\s*(filter|find|some|findIndex)\\s*\\(`,
        "g",
      );
      let use: RegExpExecArray | null;
      while ((use = useRe.exec(source))) {
        const predicate = source.slice(use.index, use.index + PREDICATE_WINDOW);
        if (!IDENTITY.test(predicate)) continue;
        findings.push({
          file,
          line: source.slice(0, use.index).split("\n").length,
          binding,
          exposed: !FACILITY.test(predicate),
        });
      }
    }
  }
}

const counts = new Map<string, number>();
for (const f of findings) counts.set(f.file, (counts.get(f.file) ?? 0) + 1);

let baseline: Record<string, number> = {};
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<
    string,
    number
  >;
} catch {
  console.log(
    `${ANSI.yellow}No baseline at ${BASELINE_PATH} — every finding is new.${ANSI.reset}\n`,
  );
}

const regressions: string[] = [];
for (const [file, count] of [...counts].sort()) {
  const allowed = baseline[file] ?? 0;
  if (count > allowed) {
    regressions.push(
      `  ${file}  ${ANSI.red}${count}${ANSI.reset} (baseline ${allowed})`,
    );
  }
}

const exposed = findings.filter((f) => f.exposed);

console.log(
  `${ANSI.bold}Customer fixtures${ANSI.reset} ${ANSI.dim}(${ROOTS.join(", ")})${ANSI.reset}`,
);
console.log(
  `${ANSI.dim}${findings.length} identity-filtered fixture read(s) in ${counts.size} file(s); ` +
    `${exposed.length} with no facility guard at all.${ANSI.reset}\n`,
);

if (regressions.length > 0) {
  console.log(
    `${ANSI.bold}These files read more fixture rows by identity than their baseline:${ANSI.reset}`,
  );
  console.log(regressions.join("\n"));
  console.log(
    `\n${ANSI.red}${ANSI.bold}✗ ${regressions.length} file(s) above baseline.${ANSI.reset}`,
  );
  console.log(
    `${ANSI.dim}Read the customer's own data through an /api/customer/* route.\n` +
      `A real client ref runs straight through the fixture id range, so the\n` +
      `predicate matches a stranger's row rather than nothing.${ANSI.reset}`,
  );
  process.exit(1);
}

if (exposed.length > 0) {
  console.log(
    `${ANSI.yellow}Nothing but the client id stands between these and a real customer:${ANSI.reset}`,
  );
  for (const f of exposed.sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`  ${ANSI.dim}${f.file}:${f.line}${ANSI.reset}  ${f.binding}`);
  }
  console.log("");
}

console.log(
  `${ANSI.green}${ANSI.bold}✓ no customer screen reads more fixture rows by identity than it did${ANSI.reset}`,
);
