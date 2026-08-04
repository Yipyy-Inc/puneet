/**
 * Guards against a screen reading the grooming menu from the fixture.
 *
 *   bun run check:grooming-menu
 *
 * The facility's grooming services live in Postgres and are edited on the
 * Rates screen. `groomingPackages` in src/data/grooming.ts is the seed they
 * were created from — it still exists, is still exported, and is one import
 * away from any new grooming screen.
 *
 * Reading it is silent: the seed matches the table today, so a screen wired to
 * the fixture looks correct until somebody edits the menu. Then a new service
 * is invisible, a deactivated one is still offered, and — since 20260806560000,
 * which prices the appointment from `grooming_services` — a changed price is
 * QUOTED from the fixture and RECORDED from the table.
 *
 * Use `groomingCatalogueQueries.services()` (src/lib/api/grooming-catalogue.ts)
 * in a component. In a plain module, which cannot call a hook, take the menu as
 * a parameter — see `deductProductsForAppointment` and `buildUnifiedEvents`.
 *
 * Exits 0 clean, 1 on an import outside src/data/.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

const ROOT = "src";
// The fixture's own home. `src/data/grooming.ts` declares it, and other files
// there may legitimately reference it while the rest of that layer is mock.
const ALLOWED_PREFIX = join("src", "data");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
}

const findings: Finding[] = [];

for (const file of walk(ROOT)) {
  if (file.startsWith(ALLOWED_PREFIX)) continue;
  const text = readFileSync(file, "utf8");

  // The IMPORT, not the word: every converted file carries a comment saying
  // `groomingPackages` is gone from its import, and flagging those would make
  // the gate fire on its own documentation.
  const pattern = /import\s*\{[^}]*\bgroomingPackages\b[^}]*\}\s*from/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    findings.push({
      file: file.replace(/\\/g, "/"),
      line: text.slice(0, match.index).split("\n").length,
    });
  }
}

console.log(
  `${ANSI.bold}Grooming menu source${ANSI.reset} ${ANSI.dim}(${ROOT}, excluding ${ALLOWED_PREFIX.replace(/\\/g, "/")})${ANSI.reset}`,
);

if (findings.length === 0) {
  console.log(
    `${ANSI.green}✓ the grooming menu is read from the facility's catalogue${ANSI.reset}`,
  );
  process.exit(0);
}

console.log(
  `\n${ANSI.red}✗ ${findings.length} file(s) import the grooming menu fixture${ANSI.reset}\n`,
);
for (const finding of findings) {
  console.log(`  ${finding.file}:${finding.line}`);
}
console.log(
  `\n  In a component, use ${ANSI.bold}groomingCatalogueQueries.services()${ANSI.reset} ` +
    `(src/lib/api/grooming-catalogue.ts).`,
);
console.log(
  `  In a plain module, take the menu as a parameter — it cannot call a hook.`,
);
process.exit(1);
