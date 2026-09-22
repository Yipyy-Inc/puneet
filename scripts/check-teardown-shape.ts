/**
 * ============================================================================
 * A teardown must check the shape of what it parsed before it walks it.
 *
 *   bun run check:teardown-shape
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * There is one Postgres and CI writes to it, so `AGENTS.md` requires every
 * spec to clean up after itself. A teardown that THROWS satisfies neither the
 * rule nor the reader: Playwright reports the test, the cleanup does nothing,
 * and the rows stay.
 *
 * It happened three times on 2026-09-21, in one run:
 *
 *   booking-payment-ledger   `for (const b of bookings ?? [])`  ->
 *                            "object is not iterable"
 *   daycare-attendance       `for (const b of all)`             ->
 *                            "all is not iterable"
 *   (and booking-payment-screens had already been fixed, with a comment
 *    explaining this exact failure, which nobody propagated)
 *
 * The cause is always the same: `await res.json()` is typed by a CAST, and a
 * cast is a claim rather than a check. A 500 answers `{error}`, a route that
 * paginates answers `{rows, total}`, and `?? []` guards neither — it guards
 * null. `for...of` on an object throws, inside `afterAll`, where the only sign
 * is a TypeError in output nobody reads.
 *
 * ── WHAT IT MEASURES ──────────────────────────────────────────────────────
 *
 * Every `test.afterAll` / `test.afterEach` block, walked by BRACE DEPTH rather
 * than by a line window, because these run to two hundred lines. A block is
 * flagged when it parses JSON and then iterates or array-methods something,
 * with no `Array.isArray` anywhere in it.
 *
 * Deliberately not flagged, because the shape is already known:
 *
 *   * the Supabase client's `{ data }` — typed `T[] | null` by the library,
 *     so `data ?? []` is sound;
 *   * a destructured property off a documented envelope (`const { shifts } =`),
 *     where the route's contract is the thing being read.
 *
 * ── AN UPPER BOUND, NOT A DEFECT COUNT ────────────────────────────────────
 *
 * A flagged block is one that COULD throw, not one that does. That is the
 * right thing to hold: the three that threw were indistinguishable from the
 * rest until the day they ran against a slow database.
 *
 * ── A RATCHET, PER FILE, WITH NO WRITER ───────────────────────────────────
 *
 * ~30 of these exist and they are not one change. The baseline is a count per
 * file in `scripts/check-teardown-shape.baseline.json`, and there is
 * deliberately NO command that writes it — the only direction it moves by hand
 * is down, the same decision `check:ui-french` and `check:customer-fixtures`
 * made for the same reason. A file not in the baseline must have none.
 * ============================================================================
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const ROOT = "tests/e2e";
const BASELINE_PATH = "scripts/check-teardown-shape.baseline.json";

const TEARDOWN = /test\.(afterAll|afterEach)\s*\(/;
const PARSES_JSON = /\.json\(\)/;
const GUARDED = /Array\.isArray/;
/** Walking a collection: the step that throws when the shape is wrong. */
const WALKS =
  /for\s*\(\s*const\s+[^)]*\sof\s|\.forEach\(|\.map\(|\.filter\(|\.find\(|\.flatMap\(|\.some\(|\.every\(/;
/** The Supabase client hands back `T[] | null`, so `data ?? []` is sound. */
const SUPABASE_DATA =
  /\bdata\s*[:}]|\bdata\s*\?\?|=\s*await\s+db\b|\bfrom\(["'`]/;

interface Finding {
  file: string;
  line: number;
  kind: "afterAll" | "afterEach";
}

/** The teardown block starting at `start`, delimited by brace depth. */
function blockAt(lines: string[], start: number): string[] {
  let depth = 0;
  let opened = false;
  const out: string[] = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);
    for (const ch of line) {
      if (ch === "{") {
        depth++;
        opened = true;
      } else if (ch === "}") {
        depth--;
      }
    }
    if (opened && depth <= 0) break;
  }
  return out;
}

/** Comments are blanked so a described bug is not read as one. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const findings: Finding[] = [];

for (const name of readdirSync(ROOT).filter((f) => f.endsWith(".spec.ts"))) {
  const source = withoutComments(readFileSync(join(ROOT, name), "utf8"));
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const opener = TEARDOWN.exec(lines[i]);
    if (!opener) continue;

    const body = blockAt(lines, i).join("\n");
    if (!PARSES_JSON.test(body)) continue;
    if (GUARDED.test(body)) continue;
    if (!WALKS.test(body)) continue;
    // A block whose only collection came off the Supabase client is typed.
    if (SUPABASE_DATA.test(body) && !/\.json\(\)\)?\s*as\s/.test(body))
      continue;

    findings.push({
      file: `${ROOT}/${name}`,
      line: i + 1,
      kind: opener[1] as Finding["kind"],
    });
  }
}

const counts = new Map<string, number>();
for (const f of findings) {
  counts.set(f.file, (counts.get(f.file) ?? 0) + 1);
}

let baseline: Record<string, number> = {};
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<
    string,
    number
  >;
} catch {
  baseline = {};
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

console.log(
  `${ANSI.bold}Teardown shape${ANSI.reset} ${ANSI.dim}(${ROOT})${ANSI.reset}`,
);
console.log(
  `${ANSI.dim}${findings.length} teardown(s) in ${counts.size} file(s) parse JSON and walk it ` +
    `with no Array.isArray.${ANSI.reset}\n`,
);

if (regressions.length > 0) {
  console.log(
    `${ANSI.bold}These files have more unguarded teardowns than their baseline:${ANSI.reset}`,
  );
  console.log(regressions.join("\n"));
  console.log(
    `\n${ANSI.red}${ANSI.bold}✗ ${regressions.length} file(s) above baseline.${ANSI.reset}`,
  );
  console.log(
    `${ANSI.dim}Check the shape before walking it:\n\n` +
      `  const res = await page.request.get("/api/...");\n` +
      `  const body = res.ok() ? await res.json().catch(() => null) : null;\n` +
      `  const rows: T[] = Array.isArray(body) ? body : [];\n` +
      `  if (!Array.isArray(body)) console.log("cleanup: NOTHING was cleaned up");\n\n` +
      `A cast is a claim. A 500 answers {error}, and for...of on that throws\n` +
      `inside afterAll — so the cleanup does nothing and the rows stay on the\n` +
      `shared database.${ANSI.reset}`,
  );
  process.exit(1);
}

const stale = Object.keys(baseline).filter((file) => !counts.has(file));
if (stale.length > 0) {
  console.log(
    `${ANSI.yellow}Fixed, and still in the baseline — take these lines out:${ANSI.reset}`,
  );
  for (const file of stale.sort())
    console.log(`  ${ANSI.dim}${file}${ANSI.reset}`);
  console.log("");
}

console.log(
  `${ANSI.green}${ANSI.bold}✓ no spec walks a parsed body in teardown more than it did${ANSI.reset}`,
);
