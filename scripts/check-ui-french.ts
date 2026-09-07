/**
 * ============================================================================
 * A surface a French user reads in English.
 *
 *   bun run check:ui-french
 *
 * ── WHY A GATE AND NOT A TEST ─────────────────────────────────────────────
 *
 * `tests/unit/settings-i18n.test.ts` and `tests/unit/shell-i18n.test.ts`
 * already prove that every entry in a CATALOGUE has a French string. Neither
 * can say anything about a string that never reaches a catalogue at all —
 * English words typed straight into the JSX.
 *
 * That is the hole `translateUiText()` hid for months. It is an English→French
 * map that RETURNS ITS INPUT on a miss, so a label with no translation renders
 * the English and reports nothing. Forty of the fifty-one settings rail labels
 * sat untranslated with every gate in this repo green; so did sixteen of the
 * twenty-four strings in the account menu, all of which were already wrapped
 * in `t(…)` and looked converted. The only measurement that ever found them
 * was rendering a screen twice, once per locale, and diffing the visible text
 * — and a scratch script nobody runs is not a measurement.
 *
 * This is that diff, done statically: a string that is English words in the
 * source is English words on the screen in both languages. It does not consult
 * the map, so the map cannot fool it.
 *
 * ── THREE SURFACES, BECAUSE A CURATED LIST HIDES WORK ────────────────────
 *
 *   settings    one entry per section, walked three imports deep
 *   shell       DERIVED from src/app/facility/layout.tsx, two deep
 *   primitives  every file in src/components/ui
 *
 * The shell was first measured against a list of files chosen by hand. It came
 * back clean, and it was not: deriving the surface from the layout instead
 * immediately found thirty-four more strings in the support drawer, the
 * notifications dropdown and the location switcher — all of them shell, none
 * of them on the list. A boundary you draw yourself is a boundary that agrees
 * with you.
 *
 * ── WHAT COUNTS AS VISIBLE ────────────────────────────────────────────────
 *
 *   1. a JSX text node                — `<Label>Blocked dates</Label>`
 *   2. a literal in an attribute the user reads — placeholder, title,
 *      aria-label, label, description, and the rest of VISIBLE_ATTR. This also
 *      catches a DEFAULT PARAMETER, `placeholder = "Select time"`, which is
 *      how the global search read as translated while it was not
 *   3. a literal handed to `toast(…)`  — the sentence after a save
 *   4. a literal after `??` or `||`    — `{displayValue || "No date selected"}`
 *
 * A string that comes through `{t("…")}` is an expression, not a literal, so
 * it is invisible here by construction. That is the whole design: converting a
 * surface is exactly what makes it stop being counted.
 *
 * ── THE TWO IT USED TO MISS, AND WHY THEY ARE IN NOW ─────────────────────
 *
 * A ternary's branches (`{online ? "Online" : "Offline"}`) and a template
 * literal (`` `Clocked in at ${time}` ``) were left out of the first version,
 * on the reasoning that the obvious pattern for either also matches every
 * `cn(cond ? "bg-red-500" : "bg-blue-500")` in the repo. That reasoning was
 * never measured, and it was wrong. Measured across the five surfaces that
 * must be empty: SIX ternary hits and a manageable set of template ones, of
 * which the real ones included **Clock in / Clock out** — the control an
 * employee touches most — and the whole register-open gate that blocks the
 * portal at the start of every shift.
 *
 * Each has a cheap discriminator, and the discriminators are the whole trick:
 *
 *   ternary   copy has a capital or a space; `"default"` / `"outline"` has
 *             neither
 *   template  copy has an UPPERCASE LETTER; a Tailwind class list does not.
 *             Enumerating the character set of a Tailwind token was tried
 *             first and let `data-[state=open]:animate-in` straight through
 *
 * It still cannot see everything — a string assembled at runtime, or one
 * living in a `src/data` fixture, will not appear. Treat a green run as proof
 * a surface has not gone backwards, not as proof it is finished. Looking at
 * the rendered page in French is what found the last three.
 *
 * ── THREE LEVELS, AND NOT INTO `components/ui` FROM ELSEWHERE ────────────
 *
 * A settings section is a wrapper; the screen is one import down and its cards
 * are two or three, so the walk follows static `from "…"` and dynamic
 * `import("…")` alike — seven sections reach their body through
 * `next/dynamic`, and a walk that cannot see those reports them clean while
 * they are entirely English.
 *
 * The settings and shell walks stop at `src/components/ui/`, because that is
 * the `primitives` surface's job. Attributing the same shared file to fifty
 * sections would make one fix look like fifty.
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
/**
 * Every portal's chrome, by the layout that renders it.
 *
 * One root was the facility's, and the shell surface it defined was measured
 * clean while three other portals had never been looked at — 61 strings,
 * including a cash-drawer close dialog floor staff use every evening. A
 * surface list is only as honest as its roots.
 */
const SHELL_ROOTS: [string, string][] = [
  ["facility", "src/app/facility/layout.tsx"],
  ["customer", "src/app/customer/layout.tsx"],
  ["employee", "src/app/employee/(shell)/layout.tsx"],
  ["super-admin", "src/app/dashboard/layout.tsx"],
];
const PRIMITIVES = "src/components/ui";

/** Static `from "…"` and dynamic `import("…")` alike. */
const IMPORTS = /(?:from\s+|import\s*\()["']([^"']+)["']/g;

/** Attributes whose literal value is read by a person, not by a machine. */
const VISIBLE_ATTR =
  /\b(?:placeholder|title|aria-label|label|description|emptyMessage|emptyLabel|helperText|tooltip|heading|subtitle|confirmLabel|cancelLabel|submitLabel)\s*=\s*"([^"]{2,})"/g;

/** The sentence after a save. `toast.success("Saved")` and friends. */
const TOAST = /toast(?:\.\w+)?\(\s*"([^"]{2,})"/g;

/** A fallback value: `{displayValue || "No date selected"}`. */
const FALLBACK = /(?:\?\?|\|\|)\s*"([^"]{2,})"/g;

/** A JSX text node — what sits between a tag's `>` and the next `<`. */
const JSX_TEXT = />([^<>{}]{2,400})</g;

/**
 * Both branches of a ternary: `{online ? "Online" : "Offline"}`.
 *
 * Left out of the first version for fear of matching every
 * `cn(cond ? "bg-red-500" : "bg-blue-500")`. Measured across the five
 * zero-baseline surfaces afterwards: SIX hits, of which "Hide password" /
 * "Show password" and "Half Day" / "Full Day" were real. The fear was worth
 * checking rather than deferring to.
 */
const TERNARY = /\?\s*"([^"]{2,})"\s*:\s*"([^"]{2,})"/g;

/**
 * A template literal — `` `Remove the ${label} filter` ``.
 *
 * The discriminator against a Tailwind class list in backticks (there are ~50
 * in components/ui alone) is simply an UPPERCASE LETTER: copy has one, a class
 * list does not. Cheaper and far more robust than enumerating the character
 * set of a Tailwind token, which was tried and let `data-[state=open]:…`
 * through.
 */
const TEMPLATE = /`([^`]{4,300})`/g;

/**
 * Copy sitting in an OBJECT, not in JSX: `{ href: "…", label: "HQ Overview" }`.
 *
 * ── WHY THIS WAS ADDED ON 2026-09-07 ──────────────────────────────────────
 *
 * `VISIBLE_ATTR` matches the JSX attribute form, `label="…"`. It does not
 * match the property form, `label: "…"`, and a settings screen renders plenty
 * of copy from arrays of objects — a list of links, a set of service tabs, a
 * table's column headers.
 *
 * Measured the day this landed: the `hq` section reported TWO English strings
 * and rendered NINE. The seven it hid were the entire list of links the page
 * exists to show. Across the settings tree, 44 hits in 8 files.
 *
 * The discriminator is the same one `FALLBACK` and `TERNARY` already use — a
 * capital or a space — because the same keys carry enum values (`label: "sm"`,
 * `title: "none"`). It is deliberately a short key list: `value:`, `id:`,
 * `key:` and `name:` are usually data, and `name` in particular is what §5q
 * says must never pass through the locale layer. `helper:` joined the list on
 * 2026-09-07: the eleven Smart-insights thresholds each carry one, and eleven
 * sentences of English were invisible while the section reported clean.
 *
 * ── AND IT RUNS ON THE SETTINGS SURFACE ONLY ──────────────────────────────
 *
 * Not to spare the shells. It was run against all six surfaces first, and
 * every hit outside settings was checked one by one:
 *
 *   FacilityMobileBottomNav  `label:` is the KEY `useNavText()` looks up, and
 *                            the fallback if it misses. Renders "Accueil".
 *   GlobalSearch             `heading:` is the key of the grouped-results
 *                            object, rendered as `t(GROUP_KEY[heading])`.
 *   UserProfileSheet         hardcoded mock notifications — "HealthFirst
 *                            Clinic has requested to join the platform".
 *                            A real finding, and translating invented
 *                            notifications would make it worse, not better.
 *                            Recorded in the debt map instead.
 *
 * Two of the three are a key sitting next to its own translator, which is the
 * one shape this rule cannot tell from copy. Annotating them `french-ok` would
 * put twenty lines of noise on surfaces that are genuinely at zero, to say
 * nothing. The shells are exactly as strict as they were before this rule
 * existed; the settings surface is stricter, which is where it found the
 * seven-link `hq` list and a card rendering a service name with no translator
 * while its two siblings translated the same expression.
 *
 * If a shell ever needs it, turn it on there and annotate — the flag is one
 * argument.
 */
const OBJECT_COPY =
  /\b(?:label|title|description|placeholder|heading|subtitle|helpText|helper|hint|message|summary|caption|emptyText)\s*:\s*"([^"]{2,})"/g;

const FRENCH_OK = /french-ok:/;

/**
 * Does the `>` at this index close a JSX tag, rather than being an operator?
 *
 * A lookbehind was tried twice and got it wrong both times, in opposite
 * directions. `(?<![=\-!<])` let `length > 0 && …` read as the text node
 * "0 && results.length === 0"; adding a space to the class then blinded it to
 * every multi-line tag, because Prettier writes
 *
 *     <Button
 *       onClick={markAllRead}
 *     >
 *       Mark all read
 *
 * and that `>` is preceded by a newline and indentation. Both forms end in
 * whitespace, so the distinction is what comes BEFORE the whitespace, which is
 * a scan and not a lookbehind.
 */
function closesTag(source: string, at: number): boolean {
  let i = at - 1;
  let skippedSpace = false;
  while (i >= 0 && (source[i] === " " || source[i] === "\t")) {
    skippedSpace = true;
    i -= 1;
  }
  if (i < 0) return false;
  const before = source[i];
  if (before === "\n") return true; // a tag closed on its own line
  if ("=-!<>".includes(before)) return false; // =>, ->, !=, <>, >>
  return !skippedSpace; // `a > b` has a space; `className="x">` does not
}

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

/** Resolve a specifier to a file, or null. `from` gives relative ones a base. */
function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith(".")) {
    const dir = from.slice(0, from.lastIndexOf("/"));
    const parts = (dir + "/" + spec).split("/");
    const out: string[] = [];
    for (const part of parts) {
      if (part === "." || part === "") continue;
      if (part === "..") out.pop();
      else out.push(part);
    }
    base = out.join("/");
  } else return null;
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
  // A Tailwind class list: every token lowercase, at least one hyphenated.
  const tokens = t.split(/\s+/);
  if (
    tokens.length > 1 &&
    // The charset is wide because a Tailwind v4 token is: `shadow-(--sh-cta)`,
    // `data-[state=open]:animate-in`, `*:[[role=checkbox]]:translate-y-[2px]`.
    // Narrower versions let every one of those through as prose.
    tokens.every((token) => /^[a-z0-9:[\]()/.!,*&%+_#~>=-]+$/.test(token)) &&
    tokens.some((token) => token.includes("-"))
  ) {
    return false;
  }
  return /[A-Za-z]{3}/.test(t);
}

type Hit = { file: string; line: number; text: string };

function lineOf(source: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i += 1) if (source[i] === "\n") n += 1;
  return n;
}

function hits(file: string, objectCopy = false): Hit[] {
  const { stripped, lines } = read(file);
  const found: Hit[] = [];

  const record = (text: string, index: number) => {
    if (!isProse(text)) return;
    const n = lineOf(stripped, index);
    const here = lines[n - 1] ?? "";
    const above = lines[n - 2] ?? "";
    if (FRENCH_OK.test(here) || FRENCH_OK.test(above)) return;
    found.push({ file, line: n, text: text.trim() });
  };

  for (const m of stripped.matchAll(VISIBLE_ATTR)) record(m[1], m.index ?? 0);
  for (const m of stripped.matchAll(TOAST)) record(m[1], m.index ?? 0);
  if (objectCopy) {
    for (const m of stripped.matchAll(OBJECT_COPY)) {
      // Same guard as FALLBACK below: `label: "sm"` is an enum value, not copy.
      if (!/^[A-Z]/.test(m[1]) && !m[1].includes(" ")) continue;
      record(m[1], m.index ?? 0);
    }
  }
  for (const m of stripped.matchAll(FALLBACK)) {
    // A fallback is as often a variant as a sentence — `variant ?? "outline"`,
    // `size ?? "sm"`. Copy either starts with a capital or has a space in it;
    // an enum value has neither. A lowercase one-word LABEL is missed, and
    // that is the cheaper mistake.
    if (!/^[A-Z]/.test(m[1]) && !m[1].includes(" ")) continue;
    record(m[1], m.index ?? 0);
  }
  for (const m of stripped.matchAll(TERNARY)) {
    // Same guard as FALLBACK, and for the same reason: `variant === "x" ?
    // "default" : "outline"` is a pair of enum values, not a pair of labels.
    // Copy has a capital or a space; an enum value has neither.
    for (const branch of [m[1], m[2]]) {
      if (!/^[A-Z]/.test(branch) && !branch.includes(" ")) continue;
      record(branch, m.index ?? 0);
    }
  }
  for (const m of stripped.matchAll(TEMPLATE)) {
    // An uppercase letter is what separates copy from a class list. The
    // interpolations are blanked first so `${foo}` cannot supply the capital.
    const words = m[1].replace(/\$\{[^}]*\}/g, " ");
    if (!/[A-Z]/.test(words)) continue;
    if (!words.includes(" ")) continue;
    record(words, m.index ?? 0);
  }
  // A JSX text node cannot exist in a file with no JSX.
  if (file.endsWith(".tsx")) {
    for (const m of stripped.matchAll(JSX_TEXT)) {
      if (!closesTag(stripped, m.index ?? 0)) continue;
      record(m[1], m.index ?? 0);
    }
  }

  return found;
}

/** Walk a component tree, collecting every file it can reach. */
function walk(
  file: string,
  depth: number,
  seen: Set<string>,
  skipPrimitives: boolean,
): void {
  if (seen.has(file)) return;
  seen.add(file);
  if (depth <= 0) return;
  for (const m of read(file).stripped.matchAll(IMPORTS)) {
    const target = resolveSpec(m[1], file);
    if (!target) continue;
    // The shadcn primitives are their own surface, not fifty sections' debt.
    if (skipPrimitives && target.startsWith(PRIMITIVES + "/")) continue;
    walk(target, depth - 1, seen, skipPrimitives);
  }
}

// ── the three surfaces ─────────────────────────────────────────────────────

type Offender = { id: string; hits: Hit[] };

/**
 * A file whose strings belong to the surface that reached it.
 *
 * A shared lib is not: `src/lib/operations-calendar.ts` carries "Unassigned"
 * and "Front Desk", and a walk from the hours section reaches it, but pinning
 * those on `hours` would make one fix look like fifty — the same argument
 * that keeps `components/ui` its own surface.
 */
function isComponent(file: string): boolean {
  return file.startsWith("src/components/") || file.startsWith("src/app/");
}

/** settings — one entry per section. */
function settingsSurface(): Offender[] {
  const out: Offender[] = [];
  for (const file of readdirSync(SECTIONS).sort()) {
    if (!file.endsWith(".tsx")) continue;
    const id = file.replace(/\.tsx$/, "");
    const seen = new Set<string>();
    walk(`${SECTIONS}/${id}`.concat(".tsx"), 3, seen, true);
    const found = [...seen].filter(isComponent).flatMap((f) => hits(f, true));
    if (found.length > 0) out.push({ id, hits: found });
  }
  return out;
}

/** One portal's chrome, derived from its layout. One entry per file. */
function shellSurface(root: string): Offender[] {
  const seen = new Set<string>();
  walk(root, 2, seen, true);
  return [...seen]
    .filter(
      (file) =>
        file.endsWith(".tsx") &&
        (file.startsWith("src/components/") || file === root),
    )
    .sort()
    .map((file) => ({ id: file, hits: hits(file) }))
    .filter((entry) => entry.hits.length > 0);
}

/** primitives — every shadcn file, one entry per file. */
function primitivesSurface(): Offender[] {
  return readdirSync(PRIMITIVES)
    .filter((f) => f.endsWith(".tsx"))
    .sort()
    .map((f) => ({
      id: `${PRIMITIVES}/${f}`,
      hits: hits(`${PRIMITIVES}/${f}`),
    }))
    .filter((entry) => entry.hits.length > 0);
}

/**
 * The forty-nine settings sections still rendering English in French, as of
 * 2026-09-06. SHRINKING LIST — delete an entry when the section is converted,
 * and note that a stale entry fails too, so a section that was translated
 * cannot quietly go back.
 *
 * `hours` is not here. It is the worked example: 43 keys under
 * `settings.sections.hours` in both catalogues, reached through
 * `useSettingsText().section("hours")`, with the day names coming from `Intl`
 * rather than from a hand-written array.
 *
 * The four portal shells and the primitives have NO baseline. They were
 * finished before this gate covered them, so their only permitted state is
 * empty — which is the strongest form of this check and the one worth having
 * on chrome that is on screen for every route in the product.
 */
const BASELINE: Record<string, Set<string>> = {
  settings: new Set([
    "addons",
    "booking-rules",
    "booking-statuses",
    "care-tasks",
    "checkin-requirements",
    "deposit-rules",
    "estimate-settings",
    "evaluations",
    "form-notifications",
    "hr-config",
    "invoice-template",
    "mobile-app",
    "my-notifications",
    "my-profile",
    "offboarding-templates",
    "onboarding-templates",
    "payroll-rules",
    "pet-breeds",
    "pricing-rules",
    "report-card-template",
    "roles-permissions",
    "tags-notes",
    "taxes",
    "tips",
    "training",
    "yipyy-pay",
    "yipyygo",
  ]),
  "shell:facility": new Set<string>(),
  "shell:customer": new Set<string>(),
  "shell:employee": new Set<string>(),
  "shell:super-admin": new Set<string>(),
  primitives: new Set<string>(),
};

const SURFACES: {
  name: string;
  label: string;
  run: () => Offender[];
  advice: string;
}[] = [
  {
    name: "settings",
    label: "settings sections",
    run: settingsSurface,
    advice: 'Route it through useSettingsText().section("<id>")',
  },
  ...SHELL_ROOTS.map(([portal, root]) => ({
    name: `shell:${portal}`,
    label: `${portal} shell (derived from its layout)`,
    run: () => shellSurface(root),
    advice: 'Route it through useShellText("<group>") — see lib/shell/text.ts',
  })),
  {
    name: "primitives",
    label: "shadcn primitives",
    run: primitivesSurface,
    advice: 'Route it through useShellText("primitives")',
  },
];

let failed = false;
let total = 0;

console.log(`${ANSI.bold}The interface, in French${ANSI.reset}\n`);

for (const surface of SURFACES) {
  const offenders = surface.run();
  const baseline = BASELINE[surface.name] ?? new Set<string>();
  const introduced = offenders.filter((o) => !baseline.has(o.id));
  const ids = new Set(offenders.map((o) => o.id));
  const converted = [...baseline].filter((id) => !ids.has(id)).sort();
  const strings = offenders.reduce((n, o) => n + o.hits.length, 0);
  total += strings;

  console.log(
    `  ${ANSI.bold}${surface.label}${ANSI.reset} ${ANSI.dim}— ${offenders.length} still rendering English, ${strings} strings, ${baseline.size} baselined${ANSI.reset}`,
  );

  for (const offender of introduced) {
    failed = true;
    console.log(`    ${ANSI.red}NEW${ANSI.reset}  ${offender.id}`);
    for (const hit of offender.hits.slice(0, 8))
      console.log(
        `          ${ANSI.dim}${hit.file}:${hit.line}${ANSI.reset}  ${JSON.stringify(hit.text)}`,
      );
    if (offender.hits.length > 8)
      console.log(
        `          ${ANSI.dim}… and ${offender.hits.length - 8} more${ANSI.reset}`,
      );
    console.log(
      `          ${ANSI.dim}${surface.advice}, or — if it is a name — mark the line // french-ok: <reason>.${ANSI.reset}`,
    );
  }

  if (converted.length > 0) {
    failed = true;
    console.log(
      `    ${ANSI.yellow}${converted.length} baselined entr(y|ies) now render no English — remove from BASELINE.${surface.name}:${ANSI.reset}`,
    );
    for (const id of converted)
      console.log(`      ${ANSI.dim}${id}${ANSI.reset}`);
  }

  console.log();
}

if (!failed) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no surface went back to English${ANSI.reset} ${ANSI.dim}(${total} strings remain, all baselined)${ANSI.reset}`,
  );
  process.exit(0);
}

// A stale baseline is a failure too: left alone it silently re-permits a
// surface that was already translated.
process.exit(1);
