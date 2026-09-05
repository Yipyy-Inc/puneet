#!/usr/bin/env bun
/**
 * check:settings-routes — the settings area agrees with itself.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * The settings area was described in three places that had to agree and had no
 * way to check that they did: the rail in `SettingsSidebar.tsx`, the permission
 * map beside it, and ~45 `activeSection === "…"` branches in a 4,748-line
 * `page.tsx`. Links to it were a fourth place — free-hand `?section=` strings
 * scattered across twenty files.
 *
 * They did not agree, and nothing said so:
 *
 *   · `?section=training-disciplines` is linked from two training screens and
 *     is not a section. Both land on Business, silently, because the page
 *     falls back to Business for an unknown id.
 *   · `?tab=tags-notes` and `?tab=cancellation-policy` use the wrong parameter
 *     name entirely — the page reads `?section=` — so three links do nothing.
 *   · The rail synthesises a `custom-<slug>` entry per active custom module and
 *     `page.tsx` has no branch for it, so a facility with a custom module has
 *     menu items that open a blank pane.
 *
 * None of that is exotic. It is what happens when a link is a string and a
 * destination is a switch case, and no one compares the two lists.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 *
 *   1. LINKS RESOLVE.  Every `settings?section=…` / `settings?tab=…` literal in
 *      `src/` names a real leaf (or a documented legacy alias).
 *   2. LEAVES RENDER.  Every leaf in the registry has somewhere to go.
 *   3. SEGMENTS ARE UNIQUE.  Two leaves cannot claim one URL.
 *   4. NOBODY WRITES THE PATH BY HAND.  A settings URL comes from
 *      `settingsHref()` or `useSettingsHref()`, never from a string literal.
 *
 * ── WHY (4) IS THE ONE THAT MATTERS ───────────────────────────────────────
 *
 * The employee shell does not reimplement the product. `/employee/grooming` is
 * `@/app/facility/dashboard/services/grooming/page`, and ~40 sibling routes do
 * the same — so one component renders in two portals and an absolute
 * `/facility/dashboard/settings…` inside it is correct in exactly one of them.
 *
 * For a groomer the wrong one is silent, not broken-looking:
 * `canAccessFacilityPortal` admits facility admins and platform admins and
 * nobody else, so guardPortal denies the navigation and `landingPathFor` sends
 * them to /employee/schedule. HTTP 200, a real screen, and nothing to do with
 * settings. Twenty-eight links did that, including `handleSectionChange` — the
 * settings rail itself, on a route (`/employee/settings`) deliberately left
 * ungated because every employee owns their personal settings.
 *
 * It is also what makes the route move survivable. When `?section=x` becomes
 * `/settings/x` it is one line inside `settingsHref()`; a literal has to be
 * found and rewritten, and the ones that are missed keep working — landing on
 * Business — until somebody notices they are on the wrong screen.
 *
 * ── WHY IT PARSES SOURCE RATHER THAN IMPORTING ────────────────────────────
 *
 * Same reason `check-nav-icons.ts` gives: importing the registry pulls in
 * `lucide-react` and the permission types, and a check that can fail because an
 * unrelated module moved is a check people learn to ignore. The shapes it reads
 * are simple and stable — object literals with quoted string fields.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const REGISTRY = "src/lib/settings/nav.ts";

const ANSI = {
  reset: "[0m",
  bold: "[1m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
};

// ── the registry ───────────────────────────────────────────────────────────

const registrySrc = readFileSync(REGISTRY, "utf8");

/** Leaf ids, in file order. */
const leafIds = [...registrySrc.matchAll(/^\s+id: "([^"]+)",$/gm)].map(
  (m) => m[1],
);
/** Segments, same order. */
const segments = [...registrySrc.matchAll(/^\s+segment: "([^"]+)",$/gm)].map(
  (m) => m[1],
);
/** Ids named as a `parent:` — headings, not destinations. */
const parentIds = new Set(
  [...registrySrc.matchAll(/^\s+parent: "([^"]+)",$/gm)].map((m) => m[1]),
);
/** The legacy alias table, so a stale bookmark is not reported as a defect. */
const aliasBlock = registrySrc.slice(
  registrySrc.indexOf("LEGACY_SECTION_ALIASES"),
);
const aliases = new Map(
  [
    ...aliasBlock
      .slice(0, aliasBlock.indexOf("};"))
      .matchAll(/"?([\w-]+)"?:\s*"([^"]+)"/g),
  ].map((m) => [m[1], m[2]]),
);

const leaves = new Set(leafIds);
/** Leaves as {id, segment} pairs, in file order — the two arrays are parallel. */
const SETTINGS_LEAVES = leafIds.map((id, i) => ({ id, segment: segments[i] }));
const resolve = (id: string) => aliases.get(id) ?? id;

// ── every source file, once ────────────────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}
const files = walk("src");

// ── 1. links resolve ───────────────────────────────────────────────────────

interface Problem {
  file: string;
  line: number;
  text: string;
  why: string;
}
const problems: Problem[] = [];

// `settings?section=x`, `settings?tab=x`, and the same after a template hole.
const LINK = /settings\?(section|tab)=([\w-]+)/g;

for (const file of files) {
  if (file.replace(/\\/g, "/") === REGISTRY) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(LINK)) {
      const [, param, id] = m;
      if (param === "tab") {
        problems.push({
          file,
          line: i + 1,
          text: m[0],
          why: "the page reads ?section=, so this link does nothing",
        });
        continue;
      }
      if (!leaves.has(resolve(id))) {
        problems.push({
          file,
          line: i + 1,
          text: m[0],
          why: `no settings section is called "${id}"`,
        });
      }
    }
  });
}

// ── 1b. nobody writes the path by hand ─────────────────────────────────────

const SETTINGS_PATH =
  /["'`](\/facility\/dashboard|\/employee)\/settings(\?|\/|["'`])/;

/**
 * The files allowed to name a settings path: the registry that builds them, the
 * hook that picks the portal, the employee wrapper that re-exports the page (an
 * `import` specifier, not a link), the nav models that DECLARE the settings
 * item, and the three screens linking to `settings/integrations/quickbooks`,
 * which is a real route on disk rather than a section of the page.
 */
const MAY_NAME_A_PATH = new Set([
  "src/lib/settings/nav.ts",
  "src/lib/settings/use-settings-href.ts",
  "src/app/employee/(shell)/settings/page.tsx",
  "src/components/hq/HQIntegrationsClient.tsx",
  "src/components/integrations/quickbooks/QuickBooksSettingsEntry.tsx",
  "src/lib/quickbooks/sync-engine.ts",
  "src/lib/nav/facility-nav.ts",
  "src/lib/nav/employee-nav.ts",
  "src/lib/role-utils.ts",
]);

const handWritten: Problem[] = [];
for (const file of files) {
  if (MAY_NAME_A_PATH.has(file.split(sep).join("/"))) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    const m = line.match(SETTINGS_PATH);
    if (!m) return;
    handWritten.push({
      file,
      line: i + 1,
      text: m[0],
      why: "a settings url written by hand is right in only one portal",
    });
  });
}

// ── 2. leaves render ───────────────────────────────────────────────────────
//
// Every leaf has its own route file now. The switchboard this used to read —
// one 4,700-line component with ~45 `activeSection === "…"` branches — is gone;
// each branch became `settings/<segment>/page.tsx`, which is what makes a
// section's bundle its own and a section's code findable.
//
// So the question is simply whether the file exists. A leaf with no page is a
// menu item that 404s, which is the exact failure the dynamic segment used to
// hide by falling through to Business.

/**
 * Segments that have a real page in BOTH portals.
 *
 * Both, and that is the whole point of this check. Extraction gave the facility
 * portal 50 static pages and left the employee shell with only its dynamic
 * `[section]` route — and because Next resolves a static segment ahead of a
 * dynamic one, that route was suddenly the only thing serving 50 sections it
 * was never meant to serve. It answered 404 for every one of them. A groomer
 * opening /employee/settings/my-profile — a screen deliberately available to
 * every employee — got "That page has moved".
 *
 * The gate did not notice, because it only looked at one portal. It looks at
 * both now.
 *
 * `dashboard/` in the facility pattern is load-bearing too: without it the
 * pattern also matched `services/grooming/settings/booking-rules/page.tsx` —
 * grooming's own screen — which quietly satisfied the `booking-rules` leaf while
 * that leaf had no route at all. A path fragment is not an identifier; anchor
 * it.
 */
function pagesUnder(pattern: RegExp): Set<string> {
  return new Set(
    files
      .map((f) => f.split(sep).join("/"))
      .map((f) => f.match(pattern)?.[1])
      .filter((s): s is string => Boolean(s)),
  );
}
const facilityRoutes = pagesUnder(
  /dashboard\/settings\/([^/[\]]+)\/page\.tsx$/,
);
const employeeRoutes = pagesUnder(
  /\(shell\)\/settings\/([^/[\]]+)\/page\.tsx$/,
);
const routed = new Set(
  [...facilityRoutes].filter((s) => employeeRoutes.has(s)),
);

const unrendered = SETTINGS_LEAVES.filter(
  (leaf) => !parentIds.has(leaf.id) && !routed.has(leaf.segment),
).map((leaf) => {
  // Which portal is missing it, since "renders nothing" in one of them is the
  // failure that hid for a whole extraction.
  const where = facilityRoutes.has(leaf.segment)
    ? " — missing from the EMPLOYEE portal"
    : employeeRoutes.has(leaf.segment)
      ? " — missing from the FACILITY portal"
      : " — missing from both";
  return leaf.id + where;
});

// ── 3. runtime-synthesised leaves have a home ──────────────────────────────
//
// The rail and the index do not only render the registry: they synthesise a
// `custom-<slug>` entry for every ACTIVE custom service module, from data. A
// static list cannot contain those, so this is the one check that has to read
// the rail's source.
//
// It is a ratchet at ONE, not a pass. There is genuinely no screen behind one —
// `settings-routes.tsx` returns null for the prefix and the layout's permission
// guard moves the viewer to a section they can open — and building it belongs
// to the stage that decides whether a custom module should have settings at all.
// The entry below stops the count growing while that is pending, and makes the
// next person meet the gap in CI rather than in a support ticket.
const RAIL = "src/components/facility/SettingsSidebar.tsx";
const HANDLER =
  "src/app/facility/dashboard/settings/_components/settings-routes.tsx";
const KNOWN_UNHANDLED = new Set(["custom-"]);

const railSrc = readFileSync(RAIL, "utf8");
const handlerSrc = readFileSync(HANDLER, "utf8");
const synthesised = [...railSrc.matchAll(/id: `([a-z-]+)-\$\{/g)].map(
  (m) => `${m[1]}-`,
);
const unhandled = synthesised.filter(
  (prefix) => !routed.has(prefix.replace(/-$/, "")),
);
const newUnhandled = unhandled.filter((p) => !KNOWN_UNHANDLED.has(p));
const staleBaseline = [...KNOWN_UNHANDLED].filter(
  (p) => !unhandled.includes(p),
);
/** The prefix must at least be RECOGNISED, or it 404s instead of redirecting. */
const unrecognised = synthesised.filter(
  (prefix) => !handlerSrc.includes(`startsWith("${prefix}")`),
);

// ── 4. segments are unique ─────────────────────────────────────────────────

const seen = new Map<string, number>();
for (const s of segments) seen.set(s, (seen.get(s) ?? 0) + 1);
const duplicateSegments = [...seen].filter(([, n]) => n > 1).map(([s]) => s);

// ── report ─────────────────────────────────────────────────────────────────

console.log(
  `${ANSI.bold}Settings routes${ANSI.reset} ${ANSI.dim}(${leafIds.length} leaves, ${parentIds.size} heading${parentIds.size === 1 ? "" : "s"}, ${files.length} files scanned)${ANSI.reset}`,
);

let failed = false;

if (problems.length) {
  failed = true;
  console.log(
    `\n${ANSI.red}✗ ${problems.length} link${problems.length === 1 ? "" : "s"} into settings ${problems.length === 1 ? "does" : "do"} not resolve${ANSI.reset}`,
  );
  for (const p of problems) {
    console.log(`  ${p.file}:${p.line}  ${ANSI.yellow}${p.text}${ANSI.reset}`);
    console.log(`      ${ANSI.dim}${p.why}${ANSI.reset}`);
  }
  console.log(
    `\n  ${ANSI.dim}Link through settingsHref() in ${REGISTRY} rather than\n  writing the query string by hand — then a bad id is a type error.${ANSI.reset}`,
  );
}

if (handWritten.length) {
  failed = true;
  console.log(
    `
${ANSI.red}✗ ${handWritten.length} settings url${handWritten.length === 1 ? " is" : "s are"} written by hand${ANSI.reset}`,
  );
  for (const p of handWritten) {
    console.log(`  ${p.file}:${p.line}  ${ANSI.yellow}${p.text}${ANSI.reset}`);
  }
  console.log(
    `
  ${ANSI.dim}Use settingsHref(id) — or useSettingsHref() in a component, which
  reads the portal off the pathname. The employee shell re-exports these
  same components, and a facility path there bounces a groomer out of
  their portal to /employee/schedule.${ANSI.reset}`,
  );
}

if (unrendered.length) {
  failed = true;
  console.log(
    `\n${ANSI.red}✗ ${unrendered.length} leaf/leaves in the registry render nothing${ANSI.reset}`,
  );
  for (const id of unrendered) console.log(`  ${id}`);
  console.log(
    `
  ${ANSI.dim}Add settings/<segment>/page.tsx, or remove the leaf. A menu item
  that 404s is worse than one that is not there.${ANSI.reset}`,
  );
}

if (newUnhandled.length) {
  failed = true;
  console.log(
    `
${ANSI.red}✗ the rail synthesises ${newUnhandled.length} kind${newUnhandled.length === 1 ? "" : "s"} of entry the page cannot render${ANSI.reset}`,
  );
  for (const p of newUnhandled) console.log(`  ${p}<…>`);
  console.log(
    `
  ${ANSI.dim}${RAIL} builds these ids at runtime. Give the prefix a route, or
  stop synthesising it.${ANSI.reset}`,
  );
}

if (staleBaseline.length) {
  failed = true;
  console.log(
    `
${ANSI.red}✗ KNOWN_UNHANDLED lists ${staleBaseline.length} prefix(es) that are now handled${ANSI.reset}`,
  );
  for (const p of staleBaseline)
    console.log(`  ${p} — remove it from the baseline`);
}

if (unrecognised.length) {
  failed = true;
  console.log(
    `
${ANSI.red}✗ the rail synthesises a prefix the dynamic route does not recognise${ANSI.reset}`,
  );
  for (const p of unrecognised) console.log(`  ${p}<…> — 404s today`);
}

if (duplicateSegments.length) {
  failed = true;
  console.log(
    `\n${ANSI.red}✗ two leaves claim the same URL segment${ANSI.reset}`,
  );
  for (const s of duplicateSegments) console.log(`  ${s}`);
}

if (failed) process.exit(1);

console.log(
  `${ANSI.green}✓ every link resolves, every leaf renders, every segment is unique${ANSI.reset}`,
);
console.log(
  `  ${ANSI.dim}${KNOWN_UNHANDLED.size} synthesised prefix baselined — see KNOWN_UNHANDLED${ANSI.reset}`,
);
