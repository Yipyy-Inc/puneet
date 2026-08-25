/**
 * Guards against two migrations sharing a version number.
 *
 *   bun run check:migration-versions
 *
 * `supabase db push` orders migrations by the numeric prefix, so two files with
 * the same one are applied in an order NOBODY chose. It is usually harmless —
 * until the day the pair touches the same table, index or function, and then it
 * is a coin flip that behaves differently on a fresh database than it did on
 * the one you tested.
 *
 * This is not hypothetical here. On 2026-08-24 two sessions working the same
 * checkout both reached for `20260824200000` within an hour, and the collision
 * was found by a person reading a directory listing rather than by any gate.
 * Two OLDER pairs were sitting in the same directory unnoticed.
 *
 * Exits 0 when clean, 1 on a NEW collision, so it can be plugged into CI.
 * BASELINE_COLLISIONS carries the pairs that predate the gate: they are
 * reported as warnings every run without failing it, because a gate that fails
 * on the day it is written is a gate somebody deletes. Fix one → remove it from
 * the baseline. Never add to it.
 */

import { readdirSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

/**
 * Versions that already had two files when this gate was written.
 *
 * Both pairs touch unrelated objects, which is the only reason they have not
 * bitten:
 *
 *   20260806160000  grooming_appointment_history + profiles_email_is_unique
 *   20260822700000  a_facility_owns_its_own_care_routine
 *                   + a_passkey_is_a_credential_the_owner_can_revoke
 *
 * Renaming them is safe but not free — an applied migration's version is
 * recorded in `supabase_migrations.schema_migrations`, so a rename makes the
 * file run again on any database that already has it. Both are re-runnable
 * today; check before assuming that of a third.
 */
const BASELINE_COLLISIONS = new Set<string>([
  "20260806160000",
  "20260822700000",
]);

const DIR = join("supabase", "migrations");

const byVersion = new Map<string, string[]>();
for (const file of readdirSync(DIR)) {
  if (!file.endsWith(".sql")) continue;
  const version = file.split("_")[0];
  // A file that does not start with a version is a different problem and not
  // this gate's to report — silently ignored rather than lumped in as a
  // collision with every other malformed name.
  if (!version || !/^\d{14}$/.test(version)) continue;
  byVersion.set(version, [...(byVersion.get(version) ?? []), file]);
}

const collisions = [...byVersion.entries()]
  .filter(([, files]) => files.length > 1)
  .sort(([a], [b]) => a.localeCompare(b));

const fresh = collisions.filter(
  ([version]) => !BASELINE_COLLISIONS.has(version),
);
const known = collisions.filter(([version]) =>
  BASELINE_COLLISIONS.has(version),
);

for (const [version, files] of known) {
  console.log(
    `  ${ANSI.yellow}!${ANSI.reset} ${version} has ${files.length} files (known, baselined)`,
  );
  for (const file of files)
    console.log(`      ${ANSI.dim}${file}${ANSI.reset}`);
}

if (fresh.length > 0) {
  for (const [version, files] of fresh) {
    console.log(
      `\n  ${ANSI.red}✗${ANSI.reset} ${ANSI.bold}${version}${ANSI.reset} is used by ${files.length} migrations`,
    );
    for (const file of files)
      console.log(`      ${ANSI.dim}${file}${ANSI.reset}`);
  }
  console.log(
    `\n${ANSI.dim}Two migrations with one version apply in an order nobody chose.` +
      `\nRename the one that landed LATER — git log --format='%h %ad' -1 -- <file>` +
      `\ntells you which. Pick the next free slot, not a random number.${ANSI.reset}\n`,
  );
  process.exit(1);
}

const total = [...byVersion.values()].reduce((n, files) => n + files.length, 0);
console.log(
  `\n${ANSI.green}${ANSI.bold}✓ ${total} migrations, every version used once${ANSI.reset}` +
    (known.length > 0
      ? ` ${ANSI.dim}(${known.length} baselined collision${known.length === 1 ? "" : "s"})${ANSI.reset}`
      : ""),
);
