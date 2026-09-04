/**
 * Guards against a nav glyph that drifted from the icon map.
 *
 *   bun run check:nav-icons
 *
 * docs/design-system/design-system.md §5b1: "One glyph per meaning — take it
 * from docs/design-system/icon-map.json, NEVER A SYNONYM. The map also carries
 * the six collisions in the shipped nav and their fixes."
 *
 * ── WHY A SCRIPT AND NOT A CODE REVIEW ────────────────────────────────────
 *
 * Six of the 36 areas had already drifted into collisions before stage 10 —
 * two calendars, two credit cards, two bar charts, two file-texts, two
 * clipboards — and every one of them looked fine in isolation. A collision is
 * only visible when you hold the whole nav in your head at once, which is
 * exactly the thing a person cannot do and a script does for free.
 *
 * It checks two properties:
 *
 *   1. Every nav item's glyph MATCHES the map's `tier1.navigation` entry for
 *      that area, so a synonym cannot creep back in.
 *   2. No glyph is used twice, so a NEW collision fails even if both halves
 *      happen to match the map (which would mean the map itself has one).
 *
 * ── WHY IT PARSES SOURCE RATHER THAN IMPORTING THE MODULE ─────────────────
 *
 * `facility-nav.ts` pulls in the permission model, which pulls in more, and a
 * check script that has to stand up half the app to read a list of icon names
 * is a check script that breaks for reasons unrelated to icons. The shape it
 * reads — `title: "…"` then `icon: Name,` — is stable and enforced by
 * Prettier.
 */
import { readFileSync } from "node:fs";

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
};

const NAV_FILE = "src/lib/nav/facility-nav.ts";
const MAP_FILE = "docs/design-system/icon-map.json";

/** `calendar-days` -> `CalendarDays`, which is lucide-react's export name. */
function toPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((part) =>
      /^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

/**
 * The map keys areas by the name §5b1 uses, which is not always the nav's own
 * title — the nav says "Occupancy Calendar" where the map says "Occupancy",
 * and "Reports & Analytics" where the map says "Reports". These are the only
 * places the two vocabularies differ; anything not listed must match exactly,
 * so a NEW area cannot quietly opt out of the check by renaming itself.
 */
const TITLE_TO_MAP_AREA: Record<string, string> = {
  "Occupancy Calendar": "Occupancy",
  "Retail / POS": "Retail",
  "Smart Insights": "Insights",
  "Operational Inventory": "Inventory",
  "Live Pet Cams": "Pet Cams",
  "Daily Register": "Register",
  "Subscription & Billing": "Subscription",
  "Reports & Analytics": "Reports",
  "Loyalty Program": "Loyalty",
  "Reputation Booster": "Reputation",
};

const map = JSON.parse(readFileSync(MAP_FILE, "utf8")) as {
  tier1: { navigation: Record<string, string> };
};
const source = readFileSync(NAV_FILE, "utf8");

// `title: "X",` … `icon: Y,` — the pair, in order, as the file is written.
const items: { title: string; icon: string }[] = [];
const pattern = /title:\s*"([^"]+)",[\s\S]{0,400}?icon:\s*([A-Za-z0-9]+),/g;
for (const m of source.matchAll(pattern)) {
  items.push({ title: m[1]!, icon: m[2]! });
}

const wrongGlyph: { title: string; got: string; want: string }[] = [];
const unmapped: string[] = [];
const seen = new Map<string, string[]>();

for (const item of items) {
  const area = TITLE_TO_MAP_AREA[item.title] ?? item.title;
  const kebab = map.tier1.navigation[area];

  if (!kebab) {
    unmapped.push(`${item.title} (looked up as "${area}")`);
  } else {
    const want = toPascal(kebab);
    if (want !== item.icon) {
      wrongGlyph.push({ title: item.title, got: item.icon, want });
    }
  }

  seen.set(item.icon, [...(seen.get(item.icon) ?? []), item.title]);
}

const collisions = [...seen.entries()].filter(
  ([, titles]) => titles.length > 1,
);

console.log(
  `${ANSI.bold}Nav glyphs${ANSI.reset} ${ANSI.dim}(${items.length} areas checked against ${MAP_FILE})${ANSI.reset}`,
);

let failed = false;

if (unmapped.length) {
  failed = true;
  console.log(
    `\n${ANSI.red}✗ ${unmapped.length} area(s) the map does not name${ANSI.reset}`,
  );
  for (const u of unmapped) console.log(`    ${u}`);
  console.log(
    `\n  Add the area to tier1.navigation in ${MAP_FILE}, or add its title to\n` +
      `  TITLE_TO_MAP_AREA in this script if it is the same area under another name.`,
  );
}

if (wrongGlyph.length) {
  failed = true;
  console.log(
    `\n${ANSI.red}✗ ${wrongGlyph.length} glyph(s) do not match the map${ANSI.reset}`,
  );
  for (const w of wrongGlyph) {
    console.log(`    ${w.title.padEnd(24)} is ${w.got}, map says ${w.want}`);
  }
}

if (collisions.length) {
  failed = true;
  console.log(
    `\n${ANSI.red}✗ ${collisions.length} glyph(s) used by more than one area${ANSI.reset}`,
  );
  for (const [icon, titles] of collisions) {
    console.log(`    ${icon.padEnd(20)} ${titles.join(" + ")}`);
  }
  console.log(
    `\n  §5b1: one glyph per meaning. A glyph on two areas carries no\n` +
      `  information — the label is doing all the work. See tier1Collisions\n` +
      `  in the map for how the six known ones were resolved.`,
  );
}

if (failed) process.exit(1);

console.log(
  `${ANSI.green}✓ every nav glyph matches the map, and none is used twice${ANSI.reset}`,
);
process.exit(0);
