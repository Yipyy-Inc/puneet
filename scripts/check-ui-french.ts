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
 * ── SEVEN SURFACES, BECAUSE A CURATED LIST HIDES WORK ────────────────────
 *
 *   settings    one entry per section, DERIVED from _sections/, three deep
 *   shell × 4   DERIVED from each portal's layout.tsx, two deep
 *   staff       DERIVED from the staff route tree, three deep
 *   primitives  every file in src/components/ui
 *
 * The shell was first measured against a list of files chosen by hand. It came
 * back clean, and it was not: deriving the surface from the layout instead
 * immediately found thirty-four more strings in the support drawer, the
 * notifications dropdown and the location switcher — all of them shell, none
 * of them on the list. A boundary you draw yourself is a boundary that agrees
 * with you.
 *
 * `staff` was added on 2026-09-08 for the sharper version of the same lesson.
 * `usePermissionText()` had been written the day before to translate 168
 * permission names, and was wired into ONE of the eight files that render
 * them. Seven screens kept printing English with every gate green, because
 * the staff area was on nobody's list at all. It measured 33 files and 725
 * strings the moment it was looked at.
 *
 * ── THE BASELINE IS A COUNT, NOT A NAME ──────────────────────────────────
 *
 * It used to be a Set of file ids, which meant a file already in it could
 * absorb any amount of NEW English silently. Measured, rather than assumed,
 * by appending an untranslated sentence to a baselined file: the gate passed.
 * On a surface with 33 files still to convert that is weeks of drift behind a
 * green build. It is a Map of id → permitted count now, so the number can
 * only go down; a file that improves prints a note asking for its baseline to
 * be lowered, the way the badge-glyph and hardcoded-locale ratchets do.
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
  ["root", "src/app/layout.tsx"],
  ["facility", "src/app/facility/layout.tsx"],
  ["customer", "src/app/customer/layout.tsx"],
  ["employee", "src/app/employee/(shell)/layout.tsx"],
  ["super-admin", "src/app/dashboard/layout.tsx"],
];
const PRIMITIVES = "src/components/ui";

/** Static `from "…"` and dynamic `import("…")` alike. */
const IMPORTS = /(?:from\s+|import\s*\()["']([^"']+)["']/g;

/**
 * `import type { … } from "…"` — ERASED AT COMPILE TIME, so the target never
 * reaches the browser and none of its strings can render.
 *
 * The walk followed these like any other import, which is how two error
 * messages in `src/app/api/roles/overrides/route.ts` were attributed to the
 * `my-notifications` SETTINGS SCREEN: `src/lib/api/roles.ts` imports the
 * route's response TYPE, and that was enough to drag a server file into a
 * client surface.
 *
 * Measured across `src/`: 2,047 type-only imports, 149 of them into an API
 * route. Blanking them before the walk is not a loosening — it is the
 * difference between "what this screen renders" and "what its types mention".
 */
const TYPE_IMPORT = /\bimport\s+type\s+[\s\S]{0,400}?from\s+["'][^"']+["']/g;

/** Attributes whose literal value is read by a person, not by a machine. */
const VISIBLE_ATTR =
  /\b(?:placeholder|title|aria-label|label|description|emptyMessage|emptyLabel|helperText|hint|tooltip|heading|subtitle|confirmLabel|cancelLabel|submitLabel)\s*=\s*"([^"]{2,})"/g;

/** The sentence after a save. `toast.success("Saved")` and friends. */
const TOAST = /toast(?:\.\w+)?\(\s*"([^"]{2,})"/g;

/** A fallback value: `{displayValue || "No date selected"}`. */
const FALLBACK = /(?:\?\?|\|\|)\s*"([^"]{2,})"/g;

/**
 * A JSX text node.
 *
 * It used to be `/>([^<>{}]{2,400})</` — text between a tag's `>` and the
 * next `<`, with no brace allowed in between. That missed every text node
 * SITTING NEXT TO AN INTERPOLATION, which is most of the copy that carries a
 * value:
 *
 *     <p>Yipyy Pay is live for{" "}<span>{name}</span>.</p>
 *
 * The opening half never matched, because the run from `>` to the next `<`
 * contains `{`. So a sentence half-translated — `{t("live")}` beside a raw
 * English tail — reported CLEAN, which is the exact shape a conversion leaves
 * behind. 140 fragments in Yipyy Pay alone were invisible this way.
 *
 * A text node is therefore a run between any of `>` `}` and any of `<` `{`.
 *
 * ── AND THE LENGTH CAP WAS 400, WHICH HID A WHOLE PARAGRAPH ──────────────
 *
 * The cap counts the run as it appears in the SOURCE, indentation included, so
 * a paragraph nested six levels deep spends ~80 characters on whitespace
 * before its first word. Yipyy Pay's privacy paragraph — what Yipyy does with
 * a facility's identity documents — is 354 characters of visible text and 438
 * in the file, so it sat one line over an invisible limit and reported clean
 * while rendering English on screen. Found by LOOKING at the page in French,
 * not by the gate.
 *
 * 2000 is far past any real sentence. The class is negated, so there is no
 * backtracking to protect against and the cap was never load-bearing.
 */
const JSX_TEXT = /[>}]([^<>{}]{2,2000})[<{]/g;

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
  /\b(?:label|title|description|placeholder|heading|subtitle|helpText|helper|hint|headline|body|blurb|detail|message|summary|caption|emptyText)\s*:\s*"([^"]{2,})"/g;

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
/**
 * Does the `}` at `at` close a JSX INTERPOLATION, rather than a block or an
 * object?
 *
 * `} else {` and `} from "x";` both look like a text node to the regex. The
 * separator is the first word after the brace: JS continues a block with a
 * keyword, JSX continues a sentence with a word.
 */
const AFTER_BRACE_KEYWORD =
  /^(?:else|catch|finally|while|from|as|satisfies|return|export|default|const|let|var|function|class|interface|type|enum|namespace|declare|abstract|readonly|public|private|protected|static|async|get|set|extends|implements|in|of|instanceof|typeof|delete|void|await|yield|case|do|for|if|switch|try|throw|new)\b/;

/**
 * Tests that hold WHICHEVER delimiter opened the run.
 *
 * Widening the terminator to `{` gave every run a second way to end, so a
 * `>` inside a Tailwind child selector — `[&>svg]:text-current` — now runs on
 * to the `{` that opens a cva variant block. That is a class list, not copy,
 * and the same three tests reject it and the template-literal case at once.
 */
function looksLikeCode(t: string): boolean {
  // An ATTRIBUTE LIST. Between one interpolation's closing brace and the next
  // one's opening brace sits `onClick=`, or `className="row" disabled=` — and
  // because the run is TERMINATED BY that opening brace, every one of them
  // ends at an `=`. A sentence never does. This one test removed ~300 false
  // hits across the shadcn primitives.
  if (t.endsWith("=")) return true;
  if (/=\s*"/.test(t)) return true; // `className="x" onClick=` mid-run
  // A template literal's interior, or a cva class string. Both carry a
  // backtick or a statement terminator; JSX text carries neither, because
  // both would have to be escaped to reach the screen.
  //
  // An HTML ENTITY is the exception and it matters: `It&apos;s past closing
  // time` is copy, and testing for a bare `;` threw it away — a false
  // NEGATIVE introduced by the fix for a false positive. Entities go first.
  const bare = t.replace(/&[a-zA-Z]+;|&#\d+;/g, "");
  if (bare.includes("`") || bare.includes(";")) return true;
  // A CALL or an INDEX: `setBrands([...brands,`, `start.mutate(undefined,`.
  // Both sit between one block's closing brace and the next one's opening
  // brace, and both end at a comma, so the punctuation test below lets them
  // through. The tell is a bracket flush against a word — prose that carries
  // a parenthesis puts a space in front of it.
  if (/[\w$]\(/.test(bare) || /[\w$]\[/.test(bare)) return true;
  // Prose has a space between two words, closes a sentence, or is a single
  // whole word. That last case is not a loosening for its own sake: `{total}
  // unread` and `{n} credits` put ONE word next to the value, and demanding
  // two threw both away — the same false-negative shape as the entity test
  // above. An attribute in this position always ends at `=`, which the first
  // test already took, so a bare alphabetic word here is copy.
  if (
    !/[A-Za-z]\s+[A-Za-z]/.test(t) &&
    !/[.!?:,]$/.test(t) &&
    !/^[A-Za-z]{3,}$/.test(t)
  ) {
    return true;
  }
  return false;
}

function closesExpression(source: string, at: number, text: string): boolean {
  if (source[at] !== "}") return true; // not our case
  return !AFTER_BRACE_KEYWORD.test(text.trim());
}

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
  // A LEADING SYMBOL is not always a reason to skip. This was
  // `!/^[A-Za-z0-9]/`, written to reject ", VariantProps" — a fragment of a
  // generic — and it rejected "© 2026 Yipyy. All rights reserved." for exactly
  // the same reason. That is the line every one of the 266 routes renders, and
  // it sat in English with all four shell surfaces reporting zero, alongside
  // the super-admin and employee portals' own copies of it.
  //
  // Still an ALLOWLIST, because the reject-list version was tried first and
  // let through thirty code fragments starting with `(`, `}`, `"` and `{`. The
  // widening is only the handful of characters real copy begins with: a
  // copyright sign, the separators this product writes sentences around, a
  // currency sign, and an emoji.
  if (!/^[A-Za-z0-9©·—–•«»→✓★$#%\u{1F300}-\u{1FAFF}]/u.test(t)) return false;
  // A STRAIGHT DOUBLE QUOTE means the matcher crossed a string boundary and is
  // holding half of one literal and half of the next. Real copy in this
  // codebase never contains one — §5q's own examples use the typographic pair,
  // as in `Requires the “View payroll” permission`. Two of the three remaining
  // false positives after the widening above were exactly this.
  if (t.includes('"')) return false;
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
      const at = m.index ?? 0;
      if (looksLikeCode(m[1].trim())) continue;
      if (stripped[at] === "}") {
        if (!closesExpression(stripped, at, m[1])) continue;
      } else if (!closesTag(stripped, at)) {
        continue;
      }
      record(m[1], at);
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
  // Type-only imports are blanked first: they carry no runtime code, so the
  // file they name renders nothing on this surface. Length-preserving so the
  // regex indices still line up with the source.
  const source = read(file).stripped.replace(TYPE_IMPORT, (m) =>
    " ".repeat(m.length),
  );
  for (const m of source.matchAll(IMPORTS)) {
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

  // ── THE CHROME IS PART OF THE AREA ──────────────────────────────────────
  //
  // This walked `_sections/` only, so the settings LAYOUT was in no surface at
  // all — not this one, and not the facility shell's, which stops two imports
  // below `facility/layout.tsx` and never reaches this far down the tree.
  //
  // What sat in that gap is not marginal. `settings-shell.tsx` renders the
  // page header that names the section, and `SettingsSidebar` renders 51
  // labels in 9 groups: between them, the most-read text in the entire area,
  // measured by nothing, on the very surface this gate was written for.
  //
  // Found on 2026-09-08 while adding the permission-denied state — a string
  // that would have rendered in English behind a green gate on all 50
  // sections. Same lesson as SHELL_ROOTS above, one level in: a surface list
  // is only as honest as its roots.
  //
  // The route-level states are here for the same reason. `error.tsx` and
  // `not-found.tsx` are the two rungs of the §5s ladder settings implements,
  // and a state nobody can reach on purpose is exactly the file whose English
  // survives longest.
  const chrome = new Set<string>();
  for (const root of ["layout.tsx", "page.tsx", "error.tsx", "not-found.tsx"])
    walk(SETTINGS + root, 3, chrome, true);
  const chromeHits = [...chrome]
    .filter(isComponent)
    .flatMap((f) => hits(f, true));
  if (chromeHits.length > 0) out.push({ id: "(chrome)", hits: chromeHits });

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

/**
 * The staff area, derived from its own route tree.
 *
 * ── WHY THIS SURFACE EXISTS ──────────────────────────────────────────────
 *
 * `usePermissionText()` was written on 2026-09-07 to translate the permission
 * catalogue — 168 permissions, 19 groups, 4 access scopes — and wired into one
 * of the eight files that render it. The other seven kept printing English for
 * a day, and every gate in this repo stayed green, because the measured
 * surfaces were the settings sections, the four portal shells and the shadcn
 * primitives. The staff screens were nobody's.
 *
 * Adding them is the cheaper half of finishing them: the work now has a number
 * that cannot go up.
 *
 * ── DERIVED, NOT LISTED ──────────────────────────────────────────────────
 *
 * Every `page.tsx` and `layout.tsx` under the staff route is a root, found by
 * reading the directory rather than by naming files here. The shell surface's
 * own header records why that matters — measured against a hand-picked list it
 * came back clean while thirty-four strings sat in the support drawer — and
 * the same trap is open here: a staff sub-route added later would be invisible
 * to a list somebody has to remember to update.
 *
 * Three deep, like `settings`: a page is a wrapper, the screen is one import
 * down, and its parts are two or three.
 */
const STAFF = "src/app/facility/dashboard/staff";

/** Every `page.tsx` and `layout.tsx` under a route, at any depth. */
function routeRoots(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...routeRoots(path));
    else if (entry.name === "page.tsx" || entry.name === "layout.tsx")
      out.push(path);
  }
  return out.sort();
}

/** staff — one entry per file, so a file can be cleared on its own. */
function staffSurface(): Offender[] {
  const seen = new Set<string>();
  for (const root of routeRoots(STAFF)) walk(root, 3, seen, true);
  return [...seen]
    .filter(
      (file) =>
        file.endsWith(".tsx") &&
        isComponent(file) &&
        // The settings sections are their own surface and several of them are
        // reachable from here — the roles studio is rendered by both. Pinning
        // its strings on `staff` too would make one fix look like two.
        !file.startsWith(SETTINGS),
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
const BASELINE: Record<string, Map<string, number>> = {
  settings: new Map<string, number>(),
  // ── THE STAFF AREA, AS FOUND ON 2026-09-08 ─────────────────────────────
  //
  // Thirty-three files, 725 strings, none of it previously measured by
  // anything. SHRINKING LIST, exactly as `settings` was: delete an entry when
  // a file is converted, and note that a STALE entry fails too — a file that
  // was translated cannot quietly go back.
  //
  // The permission catalogue itself is already done; this is the copy AROUND
  // it — the headings, the filters, the empty states, the dialogs, and
  // `SERVICE_MODULE_META`, a label table with no hook of its own.
  //
  // ── FOUR OF THESE NUMBERS WENT UP ON 2026-09-09, AND THAT IS NOT A
  //    REGRESSION ────────────────────────────────────────────────────────
  //
  // `staff-availability-tab` 10→11, `staff-roles-tab` 3→4,
  // `EmployeeDashboard` 13→14, `StaffPreviewDialog` 2→3. Not one line of
  // those files changed. `isProse()` stopped throwing away every string that
  // starts with a symbol, so it can now see "— the hours they can work" and
  // "🎉 Onboarding complete" — sentences that were always there.
  //
  // A ratchet that only ever goes down is measuring the CODE. When the gate
  // itself gets sharper the numbers have to be allowed up, once, in the same
  // change that sharpens it — otherwise the only way to widen a gate is to
  // convert every file it newly sees, and nobody widens it.
  staff: new Map([
    [
      "src/app/facility/dashboard/staff/_components/custom-role-quick-create-dialog.tsx",
      15,
    ],
    [
      "src/app/facility/dashboard/staff/_components/resend-invite-dialog.tsx",
      16,
    ],
    [
      "src/app/facility/dashboard/staff/_components/review-activate-dialog.tsx",
      17,
    ],
    ["src/app/facility/dashboard/staff/_components/staff-audit-trail.tsx", 9],
    [
      "src/app/facility/dashboard/staff/_components/staff-availability-tab.tsx",
      11,
    ],
    ["src/app/facility/dashboard/staff/_components/staff-roles-tab.tsx", 4],
    ["src/app/facility/dashboard/staff/_components/staff-tasks-section.tsx", 5],
    [
      "src/app/facility/dashboard/staff/_components/status-change-dialog.tsx",
      19,
    ],
    ["src/components/employee/EmployeeDashboard.tsx", 14],
    ["src/components/facility/DepartmentSettings.tsx", 6],
    ["src/components/facility/StaffPreviewDialog.tsx", 3],
    ["src/components/facility/staff-hr/onboarding-invite-email.tsx", 2],
  ]),
  "shell:facility": new Map<string, number>(),
  "shell:customer": new Map<string, number>(),
  "shell:employee": new Map<string, number>(),
  "shell:super-admin": new Map<string, number>(),
  primitives: new Map<string, number>(),
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
    name: "staff",
    label: "staff area (derived from its route tree)",
    run: staffSurface,
    advice:
      "Route it through usePermissionText() for the permission catalogue, " +
      "useStaffRoleLabel() for a role name, or a settings catalogue block",
  },
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
  const baseline = BASELINE[surface.name] ?? new Map<string, number>();
  // ── A BASELINE THAT IS A COUNT, NOT JUST A NAME ─────────────────────────
  //
  // It was a Set of file ids, and a file already in it could absorb any amount
  // of new English silently. Measured on 2026-09-08 by appending an
  // untranslated sentence to a baselined file: the gate passed. On a surface
  // with 33 files still to convert that is weeks of drift with a green build.
  //
  // A count fails the moment a file grows, so the number can only go down.
  const introduced = offenders.filter(
    (o) => o.hits.length > (baseline.get(o.id) ?? 0),
  );
  const ids = new Set(offenders.map((o) => o.id));
  const converted = [...baseline.keys()].filter((id) => !ids.has(id)).sort();
  // Below its baseline — not a failure, but the ratchet has lost its grip on
  // that file until the number comes down. The same note the badge-glyph and
  // hardcoded-locale ratchets print.
  const slack = offenders
    .filter((o) => o.hits.length < (baseline.get(o.id) ?? 0))
    .sort((a, b) => a.id.localeCompare(b.id));
  const strings = offenders.reduce((n, o) => n + o.hits.length, 0);
  total += strings;

  console.log(
    `  ${ANSI.bold}${surface.label}${ANSI.reset} ${ANSI.dim}— ${offenders.length} still rendering English, ${strings} strings, ${baseline.size} baselined${ANSI.reset}`,
  );

  for (const offender of introduced) {
    failed = true;
    console.log(`    ${ANSI.red}NEW${ANSI.reset}  ${offender.id}`);
    // Eight is enough to recognise the shape of the work. Converting a
    // section wants the whole list, so `UI_FRENCH_LIMIT=100` prints it.
    const limit = Math.max(1, Number(process.env.UI_FRENCH_LIMIT ?? 8));
    for (const hit of offender.hits.slice(0, limit))
      console.log(
        `          ${ANSI.dim}${hit.file}:${hit.line}${ANSI.reset}  ${JSON.stringify(hit.text)}`,
      );
    if (offender.hits.length > limit)
      console.log(
        `          ${ANSI.dim}… and ${offender.hits.length - limit} more${ANSI.reset}`,
      );
    console.log(
      `          ${ANSI.dim}${surface.advice}, or — if it is a name — mark the line // french-ok: <reason>.${ANSI.reset}`,
    );
  }

  for (const o of slack)
    console.log(
      `    ${ANSI.yellow}note${ANSI.reset} ${o.id} is down to ${o.hits.length} from ${baseline.get(o.id)} — lower its baseline so the ratchet keeps its grip.`,
    );

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
