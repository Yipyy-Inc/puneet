#!/usr/bin/env bun
/**
 * How far `supabase/migrations/` has drifted from the database it supposedly built.
 *
 * ── THIS IS A MEASUREMENT, NOT A GATE ──────────────────────────────────────
 *
 * It is deliberately not wired into CI and it never exits non-zero on drift.
 * On 2026-08-25 only 8 of 176 files were stamped in `schema_migrations` under
 * the version their filename claims, so a gate written against this would fail
 * on 168 files the day it was added — and a gate that fails on day one gets
 * deleted rather than fixed. `bun run check:migration-versions` is the gate; it
 * catches the narrower failure of two files claiming one version.
 *
 * ── WHY THE JOIN IS ON NAME ────────────────────────────────────────────────
 *
 * Joining on version answers "did this exact file run", which is almost always
 * no and tells you nothing further. Joining on NAME separates the two cases
 * that matter: applied under a different number (recoverable — the schema has
 * it), versus never applied at all (a real gap).
 *
 * The last figure is the one that matters. `supabase db push` orders by
 * FILENAME; this schema was built in TIMESTAMP order, and 60 files sit at a
 * different rank in one than the other. See the 2026-08-25 entry in
 * docs/quality/debt-map.md.
 *
 * Usage:
 *   bun run measure:migration-drift            counts only
 *   bun run measure:migration-drift --list     and the files whose version moved
 *
 * Needs SUPABASE_DB_URL, the same direct connection string `test:sql` uses.
 */
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is not set — see scripts/run-sql-tests.ts.");
  process.exit(1);
}

const files = (await readdir("supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .map((file) => {
    const parsed = /^(\d{14})_(.*)\.sql$/.exec(file);
    return parsed ? { version: parsed[1], name: parsed[2] } : null;
  })
  .filter((file): file is { version: string; name: string } => file !== null);

const sql = new SQL(url);
const rows = (await sql`
  select version, name from supabase_migrations.schema_migrations
`) as { version: string; name: string | null }[];
await sql.close();

const versionsByName = new Map<string, string[]>();
for (const row of rows) {
  const name = row.name ?? "";
  versionsByName.set(name, [...(versionsByName.get(name) ?? []), row.version]);
}
const fileNames = new Set(files.map((file) => file.name));

let exact = 0;
let versionDiffers = 0;
let neverRecorded = 0;
const moved: string[] = [];
for (const file of files) {
  const versions = versionsByName.get(file.name);
  if (!versions) {
    neverRecorded += 1;
    continue;
  }
  if (versions.includes(file.version)) {
    exact += 1;
  } else {
    versionDiffers += 1;
    moved.push(`${file.version} -> ${versions.join(",")}  ${file.name}`);
  }
}

console.log(`files                            ${files.length}`);
console.log(`recorded rows                    ${rows.length}`);
console.log(`exact match (name + version)     ${exact}`);
console.log(`name matches, version does not   ${versionDiffers}`);
console.log(`file never recorded by name      ${neverRecorded}`);
console.log(
  `recorded row with no file        ${rows.filter((row) => !fileNames.has(row.name ?? "")).length}`,
);

// Would `db push` rebuild the schema in the order it was actually built in?
// Rank each recorded file by filename, then by the version it really ran under,
// and count how many sit in a different place.
const recorded = files
  .map((file) => ({ file, version: (versionsByName.get(file.name) ?? [])[0] }))
  .filter(
    (
      entry,
    ): entry is { file: { version: string; name: string }; version: string } =>
      Boolean(entry.version),
  );
const byFilename = [...recorded].sort((a, b) =>
  a.file.version.localeCompare(b.file.version),
);
const byApplied = [...recorded].sort((a, b) =>
  a.version.localeCompare(b.version),
);
const outOfOrder = byFilename.filter(
  (entry, index) => byApplied[index].file.name !== entry.file.name,
).length;

console.log(`\nrecorded files                   ${recorded.length}`);
console.log(`same rank in both orderings      ${recorded.length - outOfOrder}`);
console.log(`DIFFERENT rank under db push     ${outOfOrder}`);

if (process.argv.includes("--list")) {
  console.log("\n--- filename version -> version(s) actually applied ---");
  for (const line of moved) console.log(line);
}
