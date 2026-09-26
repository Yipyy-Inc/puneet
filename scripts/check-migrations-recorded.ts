/**
 * Guards against a migration that production never received.
 *
 *   bun run check:migrations-recorded                    # against the last pull
 *   bun run check:migrations-recorded --require-applied  # CI, after a fresh pull
 *
 * Every file in `supabase/migrations/` must be named in production's migration
 * ledger — `supabase_migrations.schema_migrations`, by version OR by name —
 * which `bun run db:local:pull` copies into `supabase/baseline/ledger.txt`.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * On 2026-09-25 the service-picture upload shipped, and the migration that
 * creates its bucket did not: its last statement was one `postgres` may not
 * run, so it rolled back whole, and nothing noticed. For two days every photo
 * a facility tried to put on a room category or a service answered "Bucket
 * not found", with every gate green, until a client reported it.
 *
 * Three things let it through, and this check is about the two that are
 * structural (the debt map, 2026-09-26, has the whole account):
 *
 *   1. `db:local:reset` applies only files NEWER than production's newest
 *      recorded version. A forgotten file whose version sorts below that —
 *      and a hand-picked one like `20260924240000` does within a day — is
 *      skipped by every local and CI run forever, so the copies mirror
 *      production's absence exactly and no test can see it.
 *   2. Since 2026-09-26 CI tests a push's migrations against its own copy, so
 *      a migration nobody applies to production passes CI, and the code that
 *      needs it deploys anyway.
 *
 * ── THE TWO THINGS IT REPORTS ─────────────────────────────────────────────
 *
 * FORGOTTEN — a file production never recorded, whose version is at or below
 * production's newest. This is case 1 exactly, and it fails EVERYWHERE: there
 * is no workflow in which it is correct.
 *
 * PENDING — a file newer than production's newest. That is the normal state
 * of a migration being written and tested locally (`db:local:reset` applies
 * it), so locally it is a notice and the check passes. With
 * `--require-applied` — which CI's `sql` job passes after it has pulled
 * production — it FAILS, because at that point the push is about to deploy
 * code that may depend on it. The order is: test it locally, apply it with
 * `apply_migration`, rename the file to the version production recorded, run
 * `db:local:pull`, then push. "Apply at push time" was a habit; this makes it
 * a gate.
 *
 * ── MATCHING BY NAME AS WELL AS VERSION ───────────────────────────────────
 *
 * `apply_migration` records the moment it ran, not the file's number, so a
 * file is renamed afterwards to match. Until it is — and for the older files
 * that never were — the name still identifies it. Production also
 * holds a few names WITH a version prefix (`20260826100000_training_…`),
 * which is stripped before comparing.
 *
 * On 2026-09-26 47 files matched neither. Each was checked against production
 * by the objects it creates — tables, columns, functions, policies,
 * triggers, indexes, buckets — and every one was present or had been removed
 * on purpose by a later, recorded migration; the one data-only file was
 * verified by its effect. They were then recorded (`created_by` says so), so
 * this check starts at zero with no exception list. Keep it that way: a file
 * that fails here is either not in production, or in production without a
 * record, and both are worth a person's attention.
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const MIGRATIONS = join("supabase", "migrations");
const LEDGER = join("supabase", "baseline", "ledger.txt");
const VERSION = join("supabase", "baseline", "version.txt");

const requireApplied = process.argv.includes("--require-applied");

// A missing snapshot must not read as "nothing is missing". An empty set of
// recorded migrations would make every file PENDING or FORGOTTEN, which is
// loud — but a missing file is a setup problem, and says so.
if (!existsSync(LEDGER) || !existsSync(VERSION)) {
  console.error(
    `${ANSI.red}✗ ${LEDGER} or ${VERSION} is missing.${ANSI.reset}\n` +
      `  Run ${ANSI.bold}bun run db:local:pull${ANSI.reset} — it reads production's migration ledger into the baseline.`,
  );
  process.exit(1);
}

const newest = readFileSync(VERSION, "utf8").trim();
if (!/^\d{14}$/.test(newest)) {
  console.error(
    `${ANSI.red}✗ ${VERSION} does not hold a version: "${newest}"${ANSI.reset}`,
  );
  process.exit(1);
}

const recordedVersions = new Set<string>();
const recordedNames = new Set<string>();
for (const line of readFileSync(LEDGER, "utf8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [version, name = ""] = line.split("\t");
  if (version) recordedVersions.add(version.trim());
  const bare = name.trim().replace(/^\d{14}_/, "");
  if (bare) recordedNames.add(bare);
}

if (recordedVersions.size === 0) {
  console.error(
    `${ANSI.red}✗ ${LEDGER} names no migrations at all.${ANSI.reset}\n` +
      `  A ledger cannot be empty on a database that has a schema. Run ${ANSI.bold}bun run db:local:pull${ANSI.reset} again.`,
  );
  process.exit(1);
}

interface Finding {
  file: string;
  version: string;
}

const forgotten: Finding[] = [];
const pending: Finding[] = [];
const malformed: string[] = [];
let checked = 0;

for (const file of readdirSync(MIGRATIONS).sort()) {
  if (!file.endsWith(".sql")) continue;
  const match = /^(\d{14})_(.+)\.sql$/.exec(file);
  if (!match) {
    malformed.push(file);
    continue;
  }
  checked++;
  const [, version, name] = match;
  if (recordedVersions.has(version!) || recordedNames.has(name!)) continue;
  (version! > newest ? pending : forgotten).push({ file, version: version! });
}

console.log(
  `${ANSI.bold}Migrations recorded · ${checked} files against production's ledger${ANSI.reset}` +
    ` ${ANSI.dim}(${recordedVersions.size} entries, newest ${newest})${ANSI.reset}`,
);

for (const file of malformed) {
  console.log(
    `\n  ${ANSI.red}✗ NOT A MIGRATION NAME${ANSI.reset}  ${file}\n` +
      `      ${ANSI.dim}expected <14-digit version>_<name>.sql${ANSI.reset}`,
  );
}

for (const { file } of forgotten) {
  console.log(
    `\n  ${ANSI.red}✗ FORGOTTEN${ANSI.reset}  ${file}\n` +
      `      ${ANSI.dim}production has no record of it, and it sorts below production's newest (${newest}),\n` +
      `      so db:local:reset skips it: no local or CI run can see it is missing.\n` +
      `      If it is NOT in the database: apply it with apply_migration, rename the file to the\n` +
      `      version production records, and run db:local:pull.\n` +
      `      If it IS (applied some other way): check its objects are there, then record it.${ANSI.reset}`,
  );
}

for (const { file } of pending) {
  const colour = requireApplied ? ANSI.red : ANSI.yellow;
  const mark = requireApplied ? "✗" : "!";
  console.log(
    `\n  ${colour}${mark} PENDING${ANSI.reset}  ${file}\n` +
      (requireApplied
        ? `      ${ANSI.dim}this push deploys code that may need it, and production does not have it.\n` +
          `      Apply it with apply_migration, rename the file to the version production records,\n` +
          `      run db:local:pull, commit, and push again.${ANSI.reset}`
        : `      ${ANSI.dim}not in production yet — expected while you are testing it locally.\n` +
          `      Before you push: apply it with apply_migration, rename the file to the recorded\n` +
          `      version, and run db:local:pull. CI refuses to deploy until you do.${ANSI.reset}`),
  );
}

const failing =
  malformed.length + forgotten.length + (requireApplied ? pending.length : 0);

if (failing > 0) {
  console.log(
    `\n${ANSI.red}${ANSI.bold}✗ ${failing} migration file(s) production does not have on record${ANSI.reset}`,
  );
  process.exit(1);
}

console.log(
  `\n${ANSI.green}${ANSI.bold}✓ every migration file is on production's record${ANSI.reset}` +
    (pending.length
      ? ` ${ANSI.dim}(${pending.length} pending — not yet applied, fine until you push)${ANSI.reset}`
      : ""),
);
