#!/usr/bin/env bun
/**
 * Apply ONE migration file, in a transaction, against SUPABASE_DB_URL.
 *
 * CI does not apply migrations on this project — `image`'s needs are
 * typecheck, lint, format, unit, checks, sql and build, and none of them is a
 * `db push`. So migrations reach the database by hand, and doing that by hand
 * with no transaction is how half a migration lands.
 *
 * This wraps the file in one transaction and COMMITS only if every statement
 * succeeded. It refuses a file it was not pointed at explicitly: there is no
 * "apply everything pending", because that is `supabase db push`'s job and
 * guessing at pending state against a shared database is worse than typing a
 * filename.
 */
import { SQL } from "bun";
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("usage: bun scripts/apply-one-migration.ts <path-to-sql>");
  process.exit(1);
}

const url = (await readFile(".env.local", "utf8"))
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="))
  ?.slice("SUPABASE_DB_URL=".length)
  .replace(/^"|"$/g, "")
  .trim();

if (!url) {
  console.error("SUPABASE_DB_URL is not in .env.local");
  process.exit(1);
}

const body = await readFile(file, "utf8");
const sql = new SQL(url, { max: 1 });

try {
  await sql.begin(async (tx) => {
    await tx.unsafe(body).simple();
  });
  console.log(`applied: ${file}`);
} catch (error) {
  console.error(`REFUSED, nothing applied: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await sql.close().catch(() => {});
}
