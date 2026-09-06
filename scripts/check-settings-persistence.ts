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
// addons left too, and it was the largest of them: the storage key was
// copy-pasted into THIRTEEN files, each with its own loader and its own
// fixture fallback, one of them src/lib/pricing-rules.ts. Ten more read the
// shipped list directly. See lib/settings/addons.ts.
//
// estimate-settings and incident-reporting followed. Both were localStorage:
// the estimate NUMBERING and the magic-link lifetime in a customer's email, and
// a facility's policy on who is told when an animal is hurt — including whether
// a critical report may be filed with no photo, which the front desk could do
// because the requirement lived on the manager's laptop.
//
// vaccination-requirements left the same day. Its rules live in the
// `vaccination_rules` domain now, and the fixture module they used to be
// spliced into is deleted. Three of its six readers had never seen a
// facility's edits at all — they imported the shipped list from @/data/settings
// directly — so this one moved a gate on a customer's booking, not just a
// settings screen.
//
// deposit-rules left this list on 2026-09-05 — the first entry to. Its terms
// now live in the `deposit_rules` settings domain instead of localStorage,
// where they had been read not only by the editor but by BookingModal and by
// the checkout on the booking detail page. See lib/settings/deposits.ts.
//
// yipyygo left on 2026-09-06, and it was the widest of them. Its setup now
// lives in the `yipyy_go_config` domain; the fixture's `saveYipyyGoConfig()`
// (a splice into a module-level array, under a screen that said "saved
// successfully") and `getYipyyGoConfig()` are both deleted, so nothing can
// drift back. The read side moved with it — TWELVE call sites, including the
// customer's own booking page and the trigger that decides whether to ask for
// a form. The customer portal reads it through its own route and its own RLS
// allowlist entry, because `getFacilityContext()` resolves a caller with no
// membership to the DEMO facility. See lib/settings/yipyy-go.ts.
//
// tags-notes left on 2026-09-06, but only HALF of it did, and the difference
// matters when reading this green. The note POLICY — including the five-by-four
// permission grid — is the `tag_note_settings` domain now, and it landed with
// its enforcement: `rolePermissions` had been read by exactly one component,
// the editor that wrote it, so a facility reserving deletion to management
// changed nothing on any screen. NotesList consults it now.
//
// The tag CATALOGUE still edits `useState`. It is not a settings blob: a tag is
// a row that assignments point at, so it needs a table, and the catalogue and
// its assignments have to move together or every pet shows no tags. This gate
// asks whether a SECTION reaches a write, and this one now does, so it cannot
// see the remaining half — the toasts there say plainly that the list is not
// stored, and the debt map carries the rest.
//
// mobile-app left on 2026-09-06 and emptied this list. It was the one the gate
// was written for: a "Save Changes" button with NO `onClick` at all — not a
// stub, not a toast, not a console.log — which is why check:success-claims
// could never have found it. Nothing claimed anything; the button simply did
// nothing.
//
// Two things beyond the save. The fixture was another company's identity
// (appName "PawCare", com.pawcare.facility, pawcare.com/terms), shown to every
// facility as their own. And `enableLiveCamera` is read by the CUSTOMER portal
// to decide whether to offer a live feed of somebody's pet — it shipped `true`,
// so every facility advertised a camera nobody there had switched on, and
// turning it off changed nothing a customer saw. The fallback is empty and the
// customer portal reads the facility's real choice through its own route now.
//
// ── THE LIST IS EMPTY, AND THAT IS THE POINT OF THE SHAPE ────────────────
//
// Fifty sections, none reaching no write. Keep it that way: this gate fails on
// a NEW offender, and a stale entry fails too, so the set cannot quietly
// re-permit a section that was fixed. There is nothing left to add to — a new
// entry here would be the first regression the list has ever recorded.
const BASELINE = new Set<string>([]);

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
