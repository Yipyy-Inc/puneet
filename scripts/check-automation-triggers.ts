/**
 * ============================================================================
 * The trigger list in TypeScript and the one in Postgres must be the same list.
 *
 *   bun run check:automation-triggers
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * `automationTriggerEnum` had seventeen values. The rule editor's dropdown was
 * hand-written and offered EIGHT of them:
 *
 *   const triggerOptions = [
 *     { value: "booking_created", label: "Booking Created", ... },
 *     ... seven more
 *   ];
 *
 * So nine of the nineteen seeded rules used triggers the editor could not
 * represent. Opening one of those rules and touching the dropdown did not show
 * an error — it silently rewrote the rule's trigger to whatever happened to be
 * highlighted. The dropdown is now generated from the enum, which fixes that
 * half permanently.
 *
 * The other half is the database. `automation_rules.trigger` carries the same
 * list as a CHECK constraint, and nothing about TypeScript can enforce a CHECK
 * constraint — `bun run test:sql` reads the database but cannot read a Zod
 * enum, and typecheck reads the enum but cannot read a migration. Add a value
 * to one and not the other and you get either an editor offering a trigger the
 * database refuses (a 400 on save, blamed on the form), or a database
 * accepting a trigger nothing in the app can produce or display.
 *
 * This is the only thing in the repo that reads both.
 *
 * ── HOW IT READS THE DATABASE HALF ────────────────────────────────────────
 *
 * From the MIGRATION FILE, not from a live connection. A gate that needs
 * SUPABASE_DB_URL cannot run in the `checks` CI job, and one that only runs
 * where credentials exist is a gate that is off most of the time. The tradeoff
 * is that it verifies the file, not the deployed schema — `test:sql` is what
 * checks the deployed schema, and it needs the connection anyway.
 * ============================================================================
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const ENUM_FILE = "src/types/communications.ts";
const MIGRATIONS = "supabase/migrations";

/** The migration that owns the CHECK. Renamed here if it is ever superseded. */
const OWNING_MIGRATION = "a_facility_owns_the_messages_it_sends";

function fail(message: string): never {
  console.error(`${ANSI.red}${ANSI.bold}✗ ${message}${ANSI.reset}`);
  process.exit(1);
}

// ── The TypeScript half ─────────────────────────────────────────────────────

const source = readFileSync(ENUM_FILE, "utf8");
const enumMatch = source.match(
  /export const automationTriggerEnum = z\.enum\(\[([\s\S]*?)\]\)/,
);
if (!enumMatch) {
  fail(`could not find automationTriggerEnum in ${ENUM_FILE}`);
}
const tsTriggers = [...enumMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
if (tsTriggers.length === 0) fail("automationTriggerEnum parsed as empty");

// ── The Postgres half ───────────────────────────────────────────────────────

const migrationFile = readdirSync(MIGRATIONS).find((f) =>
  f.includes(OWNING_MIGRATION),
);
if (!migrationFile) {
  fail(`no migration matching "${OWNING_MIGRATION}" in ${MIGRATIONS}`);
}

const migration = readFileSync(join(MIGRATIONS, migrationFile), "utf8");
const checkMatch = migration.match(
  /trigger text not null check \(trigger in \(([\s\S]*?)\)\)/,
);
if (!checkMatch) {
  fail(`could not find the trigger CHECK constraint in ${migrationFile}`);
}
const sqlTriggers = [...checkMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (sqlTriggers.length === 0) fail("the trigger CHECK parsed as empty");

// ── Compare ─────────────────────────────────────────────────────────────────

const inTsOnly = tsTriggers.filter((t) => !sqlTriggers.includes(t));
const inSqlOnly = sqlTriggers.filter((t) => !tsTriggers.includes(t));

console.log(
  `${ANSI.bold}Automation trigger parity${ANSI.reset} ${ANSI.dim}(${tsTriggers.length} in ${ENUM_FILE}, ${sqlTriggers.length} in ${migrationFile})${ANSI.reset}\n`,
);

if (inTsOnly.length === 0 && inSqlOnly.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ both lists carry the same ${tsTriggers.length} triggers${ANSI.reset}`,
  );
  process.exit(0);
}

for (const t of inTsOnly) {
  console.log(`  ${ANSI.red}TS only${ANSI.reset}   ${t}`);
  console.log(
    `            ${ANSI.dim}the editor can offer it; the database will refuse it with a 400 on save.${ANSI.reset}`,
  );
}
for (const t of inSqlOnly) {
  console.log(`  ${ANSI.red}SQL only${ANSI.reset}  ${t}`);
  console.log(
    `            ${ANSI.dim}the database accepts it; nothing in the app can produce or display it.${ANSI.reset}`,
  );
}
console.log(
  `\n${ANSI.dim}Add the value to BOTH ${ENUM_FILE} and a migration altering the CHECK.${ANSI.reset}`,
);
process.exit(1);
