/**
 * ============================================================================
 * What every facility screen reads, whether it can persist, and what proves it.
 *
 *   bun run audit:facility            # the summary
 *   bun run audit:facility --full     # every route
 *   bun run audit:facility --risky    # only the ones that can lie
 *
 * ── WHY THIS IS A SCRIPT AND NOT A DOCUMENT ───────────────────────────────
 *
 * AGENTS.md opens with the most important fact about this repo: it is
 * half-converted, and you must establish which half a screen is in BEFORE
 * editing it. A hand-written list saying so would be wrong within a week —
 * every conversion invalidates a row, and nobody updates a table they did not
 * write. So this derives the answer from the import graph each time it runs.
 *
 * ── WHAT IT MEASURES ──────────────────────────────────────────────────────
 *
 * For each `page.tsx` under src/app/facility, it walks the transitive closure
 * of local imports and asks three questions:
 *
 *   reads    Does the closure import `src/data/*` (a fixture), reach
 *            `src/lib/api/*` or `fetch("/api/...")` (Postgres), or neither?
 *   writes   Is there anything that MUTATES — useMutation, or a fetch with a
 *            POST/PATCH/PUT/DELETE method?
 *   proved   Does an e2e spec mention this route path?
 *
 * ── THE COMBINATION THAT MATTERS ──────────────────────────────────────────
 *
 * `writes` without any route to Postgres is the dangerous cell: a screen with
 * a save button and nowhere for the save to go. That is the shape that shipped
 * a facility-creation wizard which created no facility, and the shape that made
 * booking check-in appear to work while the status never moved.
 *
 * `check:success-claims` catches the narrow version — a file that says the
 * words "success" while containing no request. This is broader and therefore
 * fuzzier: it will flag screens whose writes are DELIBERATELY local (a filter,
 * a draft, a preference), which is why it reports rather than fails.
 *
 * ── IT DOES NOT GATE THE BUILD, AND THAT IS DELIBERATE ────────────────────
 *
 * Two thirds of these screens are fixture-backed ON PURPOSE — that is the
 * state of the project, not a regression. A gate here would fail from the day
 * it was written and be disabled by the end of the week. It is an instrument,
 * and the `check:*` scripts remain the gates.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  blue: "[34m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const SRC = "src";
const PAGES_ROOT = "src/app/facility";
const SPECS_DIR = "tests/e2e";

const IMPORT = /from\s+["']([^"']+)["']/g;
/**
 * A file that talks to the app's own API.
 *
 * Two wrong versions before this one, and both wrong in the direction that
 * flatters or panics:
 *
 *   `fetch\("\/api\/` — missed the two commonest shapes here, a
 *   `json("/api/rooms")` helper and `fetch(url)` with the path built a few
 *   lines up. `use-rooms.tsx` does both, so the Rooms page — which
 *   rooms-admin.spec.ts PROVES writes to Postgres — was reported as having no
 *   backend, along with 16 others.
 *
 *   `["'\`]\/api\/` — matched a JSDoc line reading "read from `/api/staff`",
 *   so seventeen scheduling screens that save to localStorage were reported as
 *   backed. A comment about an endpoint is not a call to one.
 *
 * Hence `stripComments` below. Every pattern in this file runs against code
 * only, which is what they were all meant to mean.
 */
const FETCH_API = /["'`]\/api\//;
const MUTATION = /useMutation\s*[<(]/;
const WRITE_METHOD = /method:\s*["'](POST|PATCH|PUT|DELETE)["']/;
/**
 * The fixture-era way to "save": a localStorage-backed store.
 *
 * Counting only `useMutation` found two screens in the whole portal that mutate
 * with no backend, which flattered it enormously — a fixture screen never had a
 * mutation to find in the first place.
 */
const LOCAL_WRITE = /(?:local|session)Storage\.setItem/;

const files = new Map<string, string>();

/**
 * Source with its comments removed.
 *
 * This file's whole job is asking what code DOES, and every one of its patterns
 * — an `/api/` path, a `localStorage.setItem`, a `useMutation` — appears in the
 * comments of a codebase that explains itself this thoroughly. Scanning prose
 * is how the audit reported the opposite of the truth twice.
 *
 * Deliberately crude: no string-awareness, so a `"//"` inside a string literal
 * takes the rest of that line with it. That costs a false negative on a URL
 * written inline, and the alternative is a JavaScript parser.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

function read(path: string): string {
  let cached = files.get(path);
  if (cached === undefined) {
    try {
      cached = stripComments(readFileSync(path, "utf8"));
    } catch {
      cached = "";
    }
    files.set(path, cached);
  }
  return cached;
}

/**
 * Turn an import specifier into a file on disk.
 *
 * Only `@/` and relative specifiers resolve — a bare `react` or
 * `@tanstack/react-query` is a package, and following those would walk
 * node_modules forever for no answer.
 */
function resolve(spec: string, importer: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = join(importer, "..", spec);
  else return null;

  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate.replace(/\\/g, "/");
    }
  }
  return null;
}

function closure(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const source = read(current);
    // `matchAll` over a fresh regex each time: a /g/ regex carries lastIndex
    // between calls, and sharing one across files silently skips imports.
    for (const match of source.matchAll(new RegExp(IMPORT.source, "g"))) {
      const target = resolve(match[1]!, current);
      if (target && !seen.has(target)) stack.push(target);
    }
  }
  return seen;
}

/**
 * Every file under `dir` named `match`, or ending in it for a suffix
 * like ".spec.ts".
 *
 * The first version took an exact filename only and was called with "" to mean
 * "everything", which matched nothing — so the coverage column read 0 of 188
 * and looked like a finding rather than a bug in this file.
 */
function walk(dir: string, match: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, match, out);
    else if (entry === match || entry.endsWith(match))
      out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

type Reads = "postgres" | "fixture" | "mixed" | "static";

interface Screen {
  route: string;
  section: string;
  reads: Reads;
  writes: boolean;
  canPersist: boolean;
  proved: boolean;
  fixtures: string[];
}

// ── The specs, read once ──────────────────────────────────────────────────
//
// Coverage is matched by ROUTE STRING, which is deliberately generous: a spec
// that navigates to /facility/dashboard/clients counts for that page. It proves
// something visits the screen, not that it verified any particular behaviour.
// Read the number as an upper bound on what is covered.
const specText = existsSync(SPECS_DIR)
  ? walk(SPECS_DIR, ".spec.ts")
      .map((f) => read(f))
      .join("\n")
  : "";

function classify(page: string): Screen {
  const reachable = closure(page);

  const fixtures = [...reachable]
    .filter((f) => f.startsWith("src/data/"))
    .sort();
  const hasFactory = [...reachable].some((f) => f.startsWith("src/lib/api/"));
  const hasFetch = [...reachable].some((f) => FETCH_API.test(read(f)));
  const live = hasFactory || hasFetch;

  const writes = [...reachable].some((f) => {
    const source = read(f);
    return (
      MUTATION.test(source) ||
      WRITE_METHOD.test(source) ||
      LOCAL_WRITE.test(source)
    );
  });

  const reads: Reads = live
    ? fixtures.length
      ? "mixed"
      : "postgres"
    : fixtures.length
      ? "fixture"
      : "static";

  const route = page.slice("src/app".length, -"/page.tsx".length) || "/";
  const parts = route.replace(/^\//, "").split("/");
  // facility/dashboard/<area> is where the portal actually branches; anything
  // shallower lumps 81 service pages into one row and says nothing.
  const section =
    parts[1] === "dashboard" && parts.length > 2
      ? parts.slice(0, 3).join("/")
      : parts.slice(0, 2).join("/");

  return {
    route,
    section,
    reads,
    writes,
    canPersist: live,
    proved: specText.includes(route),
    fixtures,
  };
}

const screens = walk(PAGES_ROOT, "page.tsx").sort().map(classify);

// A screen that mutates with no path to Postgres. Not proof of a bug — a local
// draft or a filter looks identical from here — but it is the shortlist worth
// a human's time, and every confirmed instance of this shape so far has been
// a screen that lied.
const risky = screens.filter((s) => s.writes && !s.canPersist);

const argv = process.argv.slice(2);
const showFull = argv.includes("--full");
const showRisky = argv.includes("--risky");

const TINT: Record<Reads, string> = {
  postgres: ANSI.green,
  mixed: ANSI.yellow,
  fixture: ANSI.red,
  static: ANSI.dim,
};

function line(s: Screen): string {
  const mark = s.proved
    ? `${ANSI.green}✓${ANSI.reset}`
    : `${ANSI.dim}·${ANSI.reset}`;
  const write = s.writes
    ? s.canPersist
      ? `${ANSI.green}persists${ANSI.reset}`
      : `${ANSI.red}NO BACKEND${ANSI.reset}`
    : `${ANSI.dim}read-only${ANSI.reset}`;
  return `  ${mark} ${TINT[s.reads]}${s.reads.padEnd(8)}${ANSI.reset} ${write.padEnd(28)} ${s.route}`;
}

console.log(
  `\n${ANSI.bold}Facility surface${ANSI.reset} ${ANSI.dim}(${screens.length} pages under ${PAGES_ROOT})${ANSI.reset}\n`,
);

if (showRisky || showFull) {
  const shown = showRisky ? risky : screens;
  for (const s of shown) console.log(line(s));
  console.log("");
}

// ── The summary ───────────────────────────────────────────────────────────

const by = (r: Reads) => screens.filter((s) => s.reads === r).length;

console.log(`  ${ANSI.green}postgres${ANSI.reset}  ${by("postgres")}`);
console.log(
  `  ${ANSI.yellow}mixed${ANSI.reset}     ${by("mixed")}   ${ANSI.dim}reaches both — usually real chrome over a fixture body, or the reverse${ANSI.reset}`,
);
console.log(
  `  ${ANSI.red}fixture${ANSI.reset}   ${by("fixture")}   ${ANSI.dim}src/data only; nothing it does can outlive a refresh${ANSI.reset}`,
);
console.log(`  ${ANSI.dim}static    ${by("static")}${ANSI.reset}`);

console.log(
  `\n  ${ANSI.bold}${risky.length}${ANSI.reset} screens mutate with no route to Postgres ${ANSI.dim}(--risky to list)${ANSI.reset}`,
);
console.log(
  `  ${ANSI.bold}${screens.filter((s) => s.proved).length}${ANSI.reset} of ${screens.length} are named by an e2e spec ${ANSI.dim}(visited, not necessarily asserted)${ANSI.reset}\n`,
);

// ── By section, so the work can be picked up in coherent pieces ───────────

const sections = [...new Set(screens.map((s) => s.section))].sort();
console.log(`  ${ANSI.dim}pages  live  risky  proved  section${ANSI.reset}`);
for (const section of sections) {
  const mine = screens.filter((s) => s.section === section);
  const live = mine.filter((s) => s.canPersist).length;
  const bad = mine.filter((s) => s.writes && !s.canPersist).length;
  const ok = mine.filter((s) => s.proved).length;
  const tint = bad > 0 ? ANSI.red : live === mine.length ? ANSI.green : "";
  console.log(
    `  ${String(mine.length).padStart(5)} ${String(live).padStart(5)} ${tint}${String(bad).padStart(6)}${ANSI.reset} ${String(ok).padStart(7)}  ${section}`,
  );
}
console.log("");
