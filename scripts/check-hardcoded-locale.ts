/**
 * Guards against a date, time or number formatted in a locale the user did
 * not choose.
 *
 *   bun run check:hardcoded-locale
 *
 * docs/design-system/design-system.md §5q: "**`Intl`, never a format string.**
 * `Intl.DateTimeFormat` / `Intl.NumberFormat` **with the real locale**. A
 * hand-rolled template gets French wrong in ways nobody on an English team
 * will notice."
 *
 * ── WHAT IS ACTUALLY BROKEN HERE ──────────────────────────────────────────
 *
 * This app already formats through `Intl` and `toLocale*String` in 534 places
 * across 330 files. It passes a LITERAL locale tag to every one of them, and
 * 461 of those tags are `"en-US"` — so a facility that switched to French
 * still gets American dates, American thousands separators and a 12-hour
 * clock. The formatting layer is not missing; it is being told the wrong
 * answer 534 times.
 *
 * And `en-US` is wrong even in English. This is a Canadian product: `en-CA`
 * gives `2026-09-01` and `Tue, Sep 1, 2026`, which is what §5q's table
 * specifies; `en-US` gives `9/1/2026`, which is the numeric MM/DD form §6
 * rule 8 bans outright — "Canada reads all three orders and this is a
 * boarding product, where the wrong month is a dog in the wrong week."
 *
 * ── WHY A RATCHET AND NOT A SWEEP ─────────────────────────────────────────
 *
 * 534 call sites, and each needs a locale from somewhere: a client component
 * can call `useAppLocale()`, a server component cannot, and a pure helper has
 * to take it as an argument, which changes its signature and every one of its
 * own callers. That is a refactor with a shape per file, not one edit.
 *
 * `src/lib/i18n/format.ts` is the destination — it takes the locale and
 * returns §5q's table exactly, asserted in tests/unit/i18n-format.test.ts.
 * This gate freezes the number so the migration can only go one way.
 *
 * The file that DEFINES the layer is exempt: pinning `en-CA` and `fr-CA` is
 * its whole job.
 *
 * ── THE SECOND KIND, ADDED 2026-09-09, AND IT IS THE WORSE ONE ────────────
 *
 * The regex above requires a literal `"xx-XX"`. So for five days this gate
 * measured every formatter told the WRONG locale and none of the ones told
 * NOTHING:
 *
 *     new Date(value).toLocaleDateString()
 *
 * That takes the machine's locale. On a US-defaulted laptop it prints
 * `9/1/2026` — the numeric MM/DD §6 rule 8 bans outright — and on the next
 * laptop it prints something else, so the same row reads differently to two
 * people looking at the same screen. A wrong answer is at least a consistent
 * one; this is not even that.
 *
 * Eight turned up in the staff conversion alone, in files the French gate had
 * just declared clean, because a formatter call is not English words and
 * `check:ui-french` cannot see it either. Neither gate covered the defect and
 * both were green.
 *
 * Counted SEPARATELY, with its own baseline. The two are different migrations
 * — a literal tag needs replacing, a bare call needs a locale threaded to it
 * from somewhere — and one number would hide which of them was moving.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  reset: "[0m",
  bold: "[1m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
};

/** The count on the day the rule got a gate (stage 11, 2026-09-04). */
const BASELINE = 449;

/**
 * Formatters told no locale, measured the day the pattern was added — then
 * RAISED from 371 to 432 the same day, when the pattern learned to see `([])`
 * and `(undefined, …)` as well as `()`. Not one line of those 61 files
 * changed: the gate got sharper, and a ratchet measures the code, so the
 * number is allowed up once in the change that sharpens it. Same rule as the
 * two widenings of `check:ui-french`.
 */
const BASELINE_UNSPECIFIED = 400;

/**
 * A literal BCP-47 tag handed straight to a formatter. Matching the call
 * rather than the bare string keeps a locale constant, a test fixture or a
 * comment mentioning "en-CA" out of the count — only a formatter actually
 * being told what to do is a defect.
 */
const HARDCODED =
  /(?:toLocale[A-Za-z]*String|Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat))\(\s*"[a-z]{2}-[A-Z]{2}"/g;

/**
 * A formatter told NOTHING. THREE SPELLINGS OF THE SAME THING:
 *
 *   toLocaleDateString()                       empty parens
 *   toLocaleTimeString([], { hour: … })        an EMPTY ARRAY
 *   toLocaleString(undefined, { … })           an explicit undefined
 *
 * The first version matched only the first, which missed 59 — and the two it
 * missed are the WORSE half, because they carry an options bag and therefore
 * look deliberate. `ClockConfirm.formatClockTime` was
 * `toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })`: the control
 * every shift in the product starts and ends with, rendering "3:42 PM" to a
 * French reader, and green under both of this gate's patterns.
 *
 * Deliberately not `\(\s*\)` on `Intl.*Format` as well: `new
 * Intl.NumberFormat()` is rare and `toLocale*String()` is where these live.
 * Matching the call, not the identifier, so a comment or a type mentioning the
 * name stays out.
 */
const UNSPECIFIED = /\.toLocale[A-Za-z]*String\(\s*(?:\)|\[\s*\]|undefined\b)/g;

/** The layer whose job is to pin the tags. Everything else must ask it. */
const EXEMPT = ["src/lib/i18n/format.ts"];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") sourceFiles(path, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const perFile: { file: string; n: number }[] = [];
const perFileUnspecified: { file: string; n: number }[] = [];
let count = 0;
let unspecified = 0;

for (const file of sourceFiles("src")) {
  const normalised = file.replace(/\\/g, "/");
  if (EXEMPT.some((e) => normalised.endsWith(e))) continue;

  const source = readFileSync(file, "utf8");

  const hits = [...source.matchAll(HARDCODED)].length;
  if (hits > 0) {
    perFile.push({ file, n: hits });
    count += hits;
  }

  const bare = [...source.matchAll(UNSPECIFIED)].length;
  if (bare > 0) {
    perFileUnspecified.push({ file, n: bare });
    unspecified += bare;
  }
}

perFile.sort((a, b) => b.n - a.n);
perFileUnspecified.sort((a, b) => b.n - a.n);

console.log(
  `${ANSI.bold}Hardcoded locales${ANSI.reset} ${ANSI.dim}(${count} in ${perFile.length} files, baseline ${BASELINE})${ANSI.reset}`,
);
console.log(
  `${ANSI.bold}Unspecified locales${ANSI.reset} ${ANSI.dim}(${unspecified} in ${perFileUnspecified.length} files, baseline ${BASELINE_UNSPECIFIED})${ANSI.reset}`,
);

if (unspecified > BASELINE_UNSPECIFIED) {
  console.log(
    `\n${ANSI.red}✗ ${unspecified - BASELINE_UNSPECIFIED} new formatter(s) told NO locale at all${ANSI.reset}\n`,
  );
  console.log(
    `  ${ANSI.bold}toLocaleDateString()${ANSI.reset} takes the MACHINE's locale. It prints\n` +
      `  9/1/2026 on a US-defaulted laptop — the numeric MM/DD §6 rule 8 bans —\n` +
      `  and something else on the next one, so the same row reads differently\n` +
      `  to two people on the same screen.\n\n` +
      `  Use ${ANSI.bold}src/lib/i18n/format.ts${ANSI.reset} and pass the locale.\n\n` +
      `  Heaviest files:\n` +
      perFileUnspecified
        .slice(0, 10)
        .map((w) => `    ${String(w.n).padStart(3)}  ${w.file}`)
        .join("\n"),
  );
  process.exit(1);
}

if (unspecified < BASELINE_UNSPECIFIED) {
  console.log(
    `${ANSI.yellow}note${ANSI.reset} ${unspecified} unspecified is below its baseline — lower BASELINE_UNSPECIFIED to ${unspecified}.`,
  );
}

if (count > BASELINE) {
  console.log(
    `\n${ANSI.red}✗ ${count - BASELINE} new formatter(s) told a locale the user did not choose${ANSI.reset}\n`,
  );
  console.log(
    `  §5q: Intl with the REAL locale. A literal tag means a French facility\n` +
      `  reads American dates, and "en-US" gives 9/1/2026 — the numeric MM/DD\n` +
      `  form §6 rule 8 bans, on a product where the wrong month is a dog in\n` +
      `  the wrong week.\n\n` +
      `  Use ${ANSI.bold}src/lib/i18n/format.ts${ANSI.reset}, which takes the locale and returns\n` +
      `  §5q's table exactly. Client components get the locale from\n` +
      `  ${ANSI.bold}useAppLocale()${ANSI.reset}.\n\n` +
      `  Heaviest files:\n` +
      perFile
        .slice(0, 10)
        .map((w) => `    ${String(w.n).padStart(3)}  ${w.file}`)
        .join("\n"),
  );
  process.exit(1);
}

if (count < BASELINE) {
  console.log(
    `${ANSI.yellow}note${ANSI.reset} ${count} is below the baseline — lower BASELINE in ${ANSI.dim}scripts/check-hardcoded-locale.ts${ANSI.reset} to ${count} so the ratchet keeps its grip.`,
  );
}

console.log(
  `${ANSI.green}✓ no formatter has started guessing the user's locale${ANSI.reset}`,
);
process.exit(0);
