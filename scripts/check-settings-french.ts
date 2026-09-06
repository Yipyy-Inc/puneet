/**
 * ============================================================================
 * A settings section a French user reads in English.
 *
 *   bun run check:settings-french
 *
 * ── WHY A GATE AND NOT A TEST ─────────────────────────────────────────────
 *
 * `tests/unit/settings-i18n.test.ts` already proves that every entry in the
 * settings REGISTRY has a French string — the rail, the groups, the index. It
 * cannot say anything about what is inside a section, because the strings in
 * there never reach a catalogue at all: they are English words typed straight
 * into the JSX.
 *
 * That is the hole `translateUiText()` hid for months. It is an English→French
 * map that RETURNS ITS INPUT on a miss, so a label with no translation renders
 * the English and reports nothing. Forty of the fifty-one rail labels sat
 * untranslated with every gate in this repo green. The only measurement that
 * ever found them was rendering a screen twice, once per locale, and diffing
 * the visible text — and a scratch script nobody runs is not a measurement.
 *
 * This is that diff, done statically: a string that is English words in the
 * source is English words on the screen in both languages. It does not consult
 * the map, so the map cannot fool it.
 *
 * ── WHAT COUNTS AS VISIBLE ────────────────────────────────────────────────
 *
 * Three shapes, and only in a section's own tree:
 *
 *   1. a JSX text node   — `<Label>Blocked dates</Label>`
 *   2. a literal in an attribute the user reads — placeholder, title,
 *      aria-label, label, description, and the rest of VISIBLE_ATTR
 *   3. a literal handed to `toast(…)` — the sentence after a save
 *
 * A string that comes through `{t("…")}` is an expression, not a literal, so
 * it is invisible here by construction. That is the whole design: converting a
 * section is exactly what makes it stop being counted.
 *
 * ── THREE LEVELS, AND NOT INTO `components/ui` ────────────────────────────
 *
 * A section is a wrapper; the screen is one import down and its cards are two
 * or three, so the walk follows static `from "…"` and dynamic `import("…")`
 * alike — seven sections reach their body through `next/dynamic`, and a walk
 * that cannot see those reports them clean while they are entirely English.
 *
 * It stops at `src/components/ui/`. Those are the shadcn primitives, shared by
 * all 266 routes; their few strings are one shared surface to convert once,
 * not fifty sections' worth of debt attributed fifty times. They also carry
 * the TypeScript generics — `VariantProps<typeof x>` — that a `>text<` scan
 * mistakes for a text node.
 *
 * ── THE ESCAPE HATCH ──────────────────────────────────────────────────────
 *
 * `// french-ok: <reason>` on the line, or the line above it, excuses one
 * string. §5q names what it is for: "a pet's name, a breed as the owner typed
 * it, an invoice number and a run number never pass through the locale layer."
 * Product names are the same thing — "QuickBooks Online" and "Yipyy Pay" are
 * identical in French because they are names, not because nobody translated
 * them. The point is not to force a translation. It is to make someone say why
 * there is none.
 * ============================================================================
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";

const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const SETTINGS = "src/app/facility/dashboard/settings/";
const SECTIONS = SETTINGS + "_sections";

/** Static `from "…"` and dynamic `import("…")` alike. */
const IMPORTS = /(?:from\s+|import\s*\()["']([^"']+)["']/g;

/** Attributes whose literal value is read by a person, not by a machine. */
const VISIBLE_ATTR =
  /\b(?:placeholder|title|aria-label|label|description|emptyMessage|emptyLabel|helperText|tooltip|heading|subtitle|confirmLabel|cancelLabel|submitLabel)\s*=\s*"([^"]{2,})"/g;

/** The sentence after a save. `toast.success("Saved")` and friends. */
const TOAST = /toast(?:\.\w+)?\(\s*"([^"]{2,})"/g;

/**
 * A JSX text node — what sits between a tag's `>` and the next `<`.
 *
 * The lookbehind is load-bearing: without it `() => Promise<void>` reads as
 * the text node "Promise", which put 25 phantom strings in the one section
 * that is actually finished.
 */
const JSX_TEXT = /(?<![=\-!<> \t])>([^<>{}]{2,400})</g;

const FRENCH_OK = /french-ok:/;

/**
 * The forty-nine sections still rendering English in French, as of
 * 2026-09-06. SHRINKING LIST — delete an entry when the section is converted,
 * and note that a stale entry fails too, so a section that was translated
 * cannot quietly go back.
 *
 * `hours` is not here. It is the worked example: 42 keys under
 * `settings.sections.hours` in both catalogues, reached through
 * `useSettingsText().section("hours")`, with the day names coming from `Intl`
 * rather than from a hand-written array. It took four passes to finish,
 * because each one left strings the previous one could not see — quoted
 * literals, then multi-line JSX button text, then a `<Label>` beside an
 * `aria-label` that HAD been converted, then prose. This gate is what those
 * four passes should have been.
 */
const BASELINE = new Set<string>([
  "addons",
  "audit",
  "boarding",
  "booking-rules",
  "booking-statuses",
  "branding",
  "business",
  "care-tasks",
  "checkin-requirements",
  "custom-email-domain",
  "daycare",
  "deposit-rules",
  "employment-types",
  "estimate-settings",
  "evaluations",
  "form-notifications",
  "form-requirements",
  "grooming",
  "hq",
  "hr-config",
  "incident-reporting",
  "integrations",
  "invoice-template",
  "language",
  "locations",
  "mobile-app",
  "my-notifications",
  "my-profile",
  "notifications",
  "offboarding-templates",
  "onboarding-templates",
  "payroll-rules",
  "pet-breeds",
  "pricing-rules",
  "report-card-template",
  "retail",
  "roles-permissions",
  "smart-insights",
  "staff-notifications",
  "subscription",
  "tags-notes",
  "taxes",
  "termination-reasons",
  "tips",
  "training",
  "vaccination-requirements",
  "weather",
  "yipyy-pay",
  "yipyygo",
]);

/** Comments out, so a sentence in a docblock is not a screen's copy. */
function strip(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (match, prefix: string) =>
        prefix + " ".repeat(match.length - prefix.length),
    );
}

const cache = new Map<string, { stripped: string; lines: string[] }>();
function read(file: string) {
  const hit = cache.get(file);
  if (hit) return hit;
  const raw = readFileSync(file, "utf8");
  const entry = { stripped: strip(raw), lines: raw.split("\n") };
  cache.set(file, entry);
  return entry;
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

/**
 * Is this English prose a person will read, rather than a class name, a URL,
 * an identifier or a fragment of type syntax?
 */
function isProse(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (!/^[A-Za-z0-9]/.test(t)) return false; // ", VariantProps" — a generic
  if (!/[a-z]{2}/.test(t)) return false; // needs real lowercase letters
  // Already French, so not a defect. The test is ACCENTED LETTERS, not
  // "non-ASCII": requiring pure ASCII also threw away English carrying
  // typographic punctuation, and "Searching…" sat unseen in the global search
  // — on every screen — for exactly that reason.
  if (/[À-ÿ]/.test(t)) return false;
  if (/^(?:https?:|\/|#|\.)/.test(t)) return false;
  if (/^[a-z0-9-]+$/.test(t) && !t.includes(" ") && t.includes("-"))
    return false;
  return /[A-Za-z]{3}/.test(t);
}

type Hit = { file: string; line: number; text: string };

function line(source: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i += 1) if (source[i] === "\n") n += 1;
  return n;
}

function hits(file: string): Hit[] {
  const { stripped, lines } = read(file);
  const found: Hit[] = [];

  const record = (text: string, index: number) => {
    if (!isProse(text)) return;
    const n = line(stripped, index);
    const here = lines[n - 1] ?? "";
    const above = lines[n - 2] ?? "";
    if (FRENCH_OK.test(here) || FRENCH_OK.test(above)) return;
    found.push({ file, line: n, text: text.trim() });
  };

  for (const m of stripped.matchAll(VISIBLE_ATTR)) record(m[1], m.index ?? 0);
  for (const m of stripped.matchAll(TOAST)) record(m[1], m.index ?? 0);
  // A JSX text node cannot exist in a file with no JSX.
  if (file.endsWith(".tsx"))
    for (const m of stripped.matchAll(JSX_TEXT)) record(m[1], m.index ?? 0);

  return found;
}

function walk(file: string, depth: number, acc: Map<string, Hit[]>): void {
  if (acc.has(file)) return;
  acc.set(file, hits(file));
  if (depth <= 0) return;
  for (const m of read(file).stripped.matchAll(IMPORTS)) {
    const target = resolveSpec(m[1]);
    // The shadcn primitives are one shared surface, not fifty sections' debt.
    if (target && !target.startsWith("src/components/ui/"))
      walk(target, depth - 1, acc);
  }
}

const sections = readdirSync(SECTIONS)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.replace(/\.tsx$/, ""))
  .sort();

const english = new Map<string, Hit[]>();
for (const id of sections) {
  const acc = new Map<string, Hit[]>();
  walk(`${SECTIONS}/${id}.tsx`, 3, acc);
  const all = [...acc.values()].flat();
  if (all.length > 0) english.set(id, all);
}

const introduced = [...english.keys()].filter((id) => !BASELINE.has(id)).sort();
const converted = [...BASELINE].filter((id) => !english.has(id)).sort();
const remaining = [...english.values()].reduce((n, h) => n + h.length, 0);

console.log(
  `${ANSI.bold}Settings in French${ANSI.reset} ${ANSI.dim}(${sections.length} sections, ${english.size} still rendering English, ${remaining} strings)${ANSI.reset}\n`,
);

for (const id of introduced) {
  const found = english.get(id) ?? [];
  console.log(`  ${ANSI.red}NEW${ANSI.reset}  ${SECTIONS}/${id}.tsx`);
  console.log(
    `        ${ANSI.dim}${found.length} string(s) a French user reads in English. This section was converted; something went back.${ANSI.reset}`,
  );
  for (const hit of found.slice(0, 8))
    console.log(
      `        ${ANSI.dim}${hit.file}:${hit.line}${ANSI.reset}  ${JSON.stringify(hit.text)}`,
    );
  if (found.length > 8)
    console.log(
      `        ${ANSI.dim}… and ${found.length - 8} more${ANSI.reset}`,
    );
  console.log(
    `        ${ANSI.dim}Route it through useSettingsText().section("${id}"), or — if it is a name — mark the line // french-ok: <reason>.${ANSI.reset}\n`,
  );
}

if (converted.length > 0) {
  console.log(
    `${ANSI.yellow}${converted.length} baselined section(s) now render no English — remove them from BASELINE in this script:${ANSI.reset}`,
  );
  for (const id of converted) console.log(`  ${ANSI.dim}${id}${ANSI.reset}`);
  console.log();
}

if (introduced.length === 0 && converted.length === 0) {
  const done = sections.filter((id) => !english.has(id));
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no settings section went back to English${ANSI.reset} ${ANSI.dim}(${done.length} of ${sections.length} converted: ${done.join(", ")})${ANSI.reset}`,
  );
  process.exit(0);
}

// A stale baseline is a failure too: left alone it silently re-permits a
// section that was already translated.
process.exit(1);
