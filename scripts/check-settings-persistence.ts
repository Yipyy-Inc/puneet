/**
 * ============================================================================
 * A settings screen may not take input it has nowhere to put.
 *
 *   bun run check:settings-persistence
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * src/data/vaccination-rules.ts, in full:
 *
 *   export function syncVaccinationRules(next: VaccinationRule[]): void {
 *     rules.splice(0, rules.length, ...next);
 *     notify();
 *   }
 *
 * A module-level array, spliced in place. The screen above it has a Save
 * button that appears the moment anything is dirty, and pressing it does
 * exactly what you would expect until the tab is reloaded. Then the facility's
 * vaccination requirements — which staff check before an animal is admitted —
 * are back to the fixture.
 *
 * Eight of the fifty settings sections were that on 2026-09-05. Four of them
 * also raise a success toast, so they are in check:success-claims' baseline
 * too; the other four fail silently, which is why that gate alone was not
 * enough. This one asks the structural question instead of the copy one: does
 * the save path reach ANYTHING that could leave the browser?
 *
 * ── WHY THREE LEVELS ──────────────────────────────────────────────────────
 *
 * A section is a wrapper. The screen is one import down, its hook is two, and
 * the query factory that actually fetches is three. Stopping at one produced
 * sixteen "dead" sections of which half were false — the write was simply
 * further away than the regex could see.
 *
 * DYNAMIC IMPORTS COUNT. Seven sections reach their body through
 * `next/dynamic`, whose specifier sits inside a call rather than after `from`.
 * The first version of this measurement missed every one of them and reported
 * roles-permissions — the permission editor — as writing nowhere. A gate that
 * cannot see how half the sections are loaded is worse than none, because its
 * green means nothing.
 *
 * ── THE ESCAPE HATCH ──────────────────────────────────────────────────────
 *
 * Some sections legitimately write nothing: one that links into a real area
 * elsewhere, one that says a feature is not available yet. Those mark the
 * section file with `// settings-write-ok: <reason>`, the same shape as
 * `success-claim-ok:` and `rls-write-ok:`. The point is not to force a write.
 * It is to make someone say why there is none.
 * ============================================================================
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";

const ANSI = {
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const SETTINGS = "src/app/facility/dashboard/settings/";
const SECTIONS = SETTINGS + "_sections";

/** Anything that could carry a change out of the browser. */
const PERFORMS =
  /\bfetch\s*\(|useMutation|\.mutate\b|\.mutateAsync\b|\.rpc\s*\(|supabase\.|"use server"|createServerClient/;

/** Static `from "…"` and dynamic `import("…")` alike. */
const IMPORTS = /(?:from\s+|import\s*\()["']([^"']+)["']/g;

const ALLOW = /settings-write-ok:/;

/**
 * Sections whose save reaches nothing, as of 2026-09-05. SHRINKING LIST —
 * delete an entry when the screen is wired, and note that a stale entry fails
 * too, so this cannot quietly re-permit a section that was fixed.
 *
 * Not one of these is new. Each has always discarded what it was given; the
 * gate is what is new.
 */
// deposit-rules left this list on 2026-09-05 — the first entry to. Its terms
// now live in the `deposit_rules` settings domain instead of localStorage,
// where they had been read not only by the editor but by BookingModal and by
// the checkout on the booking detail page. See lib/settings/deposits.ts.
const BASELINE = new Set<string>([
  // Four of these raise a success toast as well, and are in
  // check:success-claims' baseline for it. The other four say nothing at all,
  // which is the case that gate could never have caught.
  "addons",
  "estimate-settings",
  "incident-reporting",
  "mobile-app",
  "tags-notes",
  "vaccination-requirements",
  "yipyygo",
]);

const cache = new Map<string, string>();
function read(file: string): string {
  const hit = cache.get(file);
  if (hit !== undefined) return hit;
  const source = readFileSync(file, "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    (block) => block.replace(/[^\n]/g, " "),
  );
  cache.set(file, source);
  return source;
}

/** Resolve an `@/`, `../` or `./` specifier to a file, or null. */
function resolveSpec(spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith("../"))
    base = SETTINGS + spec.replace(/^\.\.\//, "");
  else if (spec.startsWith("./")) base = SECTIONS + "/" + spec.slice(2);
  else return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

const memo = new Map<string, boolean>();
function performs(file: string, depth: number): boolean {
  const key = `${file}:${depth}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  memo.set(key, false); // cycle guard
  const source = read(file);
  let answer = PERFORMS.test(source);
  if (!answer && depth > 0) {
    for (const match of source.matchAll(IMPORTS)) {
      const target = resolveSpec(match[1]);
      if (target && performs(target, depth - 1)) {
        answer = true;
        break;
      }
    }
  }
  memo.set(key, answer);
  return answer;
}

const sections = readdirSync(SECTIONS)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.replace(/\.tsx$/, ""))
  .sort();

const offending = new Set<string>();
const excused: string[] = [];

for (const segment of sections) {
  const path = `${SECTIONS}/${segment}.tsx`;
  if (ALLOW.test(readFileSync(path, "utf8"))) {
    excused.push(segment);
    continue;
  }
  if (!performs(path, 3)) offending.add(segment);
}

const introduced = [...offending].filter((s) => !BASELINE.has(s)).sort();
const fixed = [...BASELINE].filter((s) => !offending.has(s)).sort();

console.log(
  `${ANSI.bold}Settings persistence${ANSI.reset} ${ANSI.dim}(${sections.length} sections, ${offending.size} reaching no write, ${BASELINE.size} baselined, ${excused.length} declared read-only)${ANSI.reset}\n`,
);

for (const segment of introduced) {
  console.log(`  ${ANSI.red}NEW${ANSI.reset}  ${SECTIONS}/${segment}.tsx`);
  console.log(
    `        ${ANSI.dim}nothing within three imports of this section can leave the browser, so anything it accepts is lost on reload.${ANSI.reset}`,
  );
  console.log(
    `        ${ANSI.dim}Wire it — src/app/api/locations is the worked example — or, if it genuinely saves nothing, mark it // settings-write-ok: <reason>.${ANSI.reset}\n`,
  );
}

if (fixed.length > 0) {
  console.log(
    `${ANSI.yellow}${fixed.length} baselined section(s) now reach a write — remove them from BASELINE in this script:${ANSI.reset}`,
  );
  for (const segment of fixed)
    console.log(`  ${ANSI.dim}${segment}${ANSI.reset}`);
  console.log();
}

if (introduced.length === 0 && fixed.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no NEW settings section accepts input it cannot store${ANSI.reset}`,
  );
  process.exit(0);
}

// A stale baseline is a failure too: left alone it silently re-permits a
// section that was already wired.
process.exit(1);
