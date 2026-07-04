/**
 * Guards against dead settings-section components — a file that typechecks but
 * is imported nowhere, so edits to it never appear in the app. This is exactly
 * how three tasks edited `RolesPermissionsSettings.tsx` while the live UI was
 * `FacilityRolesStudio.tsx` (see AGENTS.md → The loop → Ground).
 *
 *   bun run check:settings-wiring
 *
 * It scans every `*Settings.tsx` component under `src/components/` and fails if
 * any is imported nowhere in `src/`. Exits 0 when clean, 1 on a NEW orphan — so
 * it can be plugged into CI. Pre-existing orphans live in BASELINE_ORPHANS and
 * are reported as warnings (they still nag every run) without failing the gate;
 * remove a file → remove it from the baseline.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, basename, sep } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

// Known dead files that predate this gate. Do NOT add to this list — delete the
// file instead. Each entry is a basename without extension.
const BASELINE_ORPHANS = new Set<string>([]);

const SRC = "src";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);

// Every module specifier imported anywhere, paired with the importing file.
const IMPORT_RE = /(?:from|import\()\s*['"]([^'"]+)['"]/g;
const importedLastSegments = new Map<string, Set<string>>(); // segment -> files that import it
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const m of content.matchAll(IMPORT_RE)) {
    const segment = m[1].split("/").pop();
    if (!segment) continue;
    if (!importedLastSegments.has(segment)) {
      importedLastSegments.set(segment, new Set());
    }
    importedLastSegments.get(segment)!.add(file);
  }
}

// Settings-section components: `*Settings.tsx` under src/components/.
const settingsComponents = files.filter(
  (f) =>
    f.includes(`${sep}components${sep}`) && /Settings\.tsx$/.test(basename(f)),
);

const newOrphans: string[] = [];
const baselinedOrphans: string[] = [];

for (const file of settingsComponents) {
  const name = basename(file, ".tsx");
  const importers = importedLastSegments.get(name);
  // "Imported" means referenced by a module specifier from some OTHER file.
  const importedElsewhere = importers
    ? [...importers].some((f) => f !== file)
    : false;
  if (importedElsewhere) continue;
  if (BASELINE_ORPHANS.has(name)) baselinedOrphans.push(file);
  else newOrphans.push(file);
}

const total = settingsComponents.length;
const wired = total - newOrphans.length - baselinedOrphans.length;

console.log(
  `${ANSI.bold}Settings wiring · ${total} *Settings.tsx component${total === 1 ? "" : "s"}${ANSI.reset}`,
);
console.log(
  `  ${ANSI.green}${wired} imported${ANSI.reset} · ${ANSI.yellow}${baselinedOrphans.length} baselined${ANSI.reset} · ${ANSI.red}${newOrphans.length} new orphan${newOrphans.length === 1 ? "" : "s"}${ANSI.reset}`,
);
console.log();

for (const file of baselinedOrphans) {
  console.log(
    `  ${ANSI.yellow}WARN${ANSI.reset}  ${file} ${ANSI.dim}(known dead code — delete it and drop it from BASELINE_ORPHANS)${ANSI.reset}`,
  );
}

for (const file of newOrphans) {
  console.log(`  ${ANSI.red}ORPHAN${ANSI.reset}  ${file}`);
  console.log(
    `          ${ANSI.dim}imported nowhere in src/ — edits here won't appear in the app. Find the live component (grep the host page) or delete this file.${ANSI.reset}`,
  );
}

console.log();
if (newOrphans.length === 0) {
  const note =
    baselinedOrphans.length > 0
      ? ` ${ANSI.yellow}(${baselinedOrphans.length} baselined orphan still pending deletion)${ANSI.reset}`
      : "";
  console.log(
    `${ANSI.green}${ANSI.bold}✓ No new orphaned settings components${ANSI.reset}${note}`,
  );
  process.exit(0);
} else {
  console.log(
    `${ANSI.red}${ANSI.bold}✗ ${newOrphans.length} orphaned settings component${newOrphans.length === 1 ? "" : "s"}${ANSI.reset}`,
  );
  console.log(
    `${ANSI.yellow}A *Settings.tsx component imported nowhere is dead code. Wire it into its host page or delete it.${ANSI.reset}`,
  );
  process.exit(1);
}
