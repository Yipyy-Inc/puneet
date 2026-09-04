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
const BASELINE = 534;

/**
 * A literal BCP-47 tag handed straight to a formatter. Matching the call
 * rather than the bare string keeps a locale constant, a test fixture or a
 * comment mentioning "en-CA" out of the count — only a formatter actually
 * being told what to do is a defect.
 */
const HARDCODED =
  /(?:toLocale[A-Za-z]*String|Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat))\(\s*"[a-z]{2}-[A-Z]{2}"/g;

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
let count = 0;

for (const file of sourceFiles("src")) {
  const normalised = file.replace(/\\/g, "/");
  if (EXEMPT.some((e) => normalised.endsWith(e))) continue;

  const hits = [...readFileSync(file, "utf8").matchAll(HARDCODED)].length;
  if (hits > 0) {
    perFile.push({ file, n: hits });
    count += hits;
  }
}

perFile.sort((a, b) => b.n - a.n);

console.log(
  `${ANSI.bold}Hardcoded locales${ANSI.reset} ${ANSI.dim}(${count} in ${perFile.length} files, baseline ${BASELINE})${ANSI.reset}`,
);

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
