#!/usr/bin/env bun
/**
 * ============================================================================
 * The local database: a copy of production's SCHEMA on this machine, in Docker.
 *
 *   bun run db:local:reset   rebuild it from supabase/baseline/ (seconds)
 *   bun run db:local:pull    refresh supabase/baseline/ from production
 *
 * Needs the local stack running: `bunx supabase start`.
 *
 * ── WHY A BASELINE, NOT A REPLAY OF supabase/migrations ───────────────────
 *
 * Measured 2026-09-26: replaying the 341 migration files into an empty
 * database stops at file 30 and ends with 89 of them failed. 86 files carry
 * hand-picked versions (20260806920000) that do not match the order they were
 * applied in, so some run before the table they alter exists; one
 * (20260806700000) refuses to proceed unless production's own payment rows are
 * there. The files are a faithful record of what was done to ONE database, not
 * a recipe that rebuilds it. Rewriting applied history to make them replay
 * would change files production already ran and still prove nothing about
 * production.
 *
 * So the local database starts from what production IS: a schema-only dump
 * (tables, functions, policies, grants, owners — no rows), plus the storage
 * buckets and policies the dump leaves out. Then every migration NEWER than
 * the version the dump covers is applied on top, in order — which is how a
 * migration gets tested here before it goes anywhere near production.
 *
 * That is why config.toml has [db.migrations] and [db.seed] switched off: the
 * CLI would otherwise replay the files and fail at file 30.
 *
 * ── PULL READS PRODUCTION, ONCE ───────────────────────────────────────────
 *
 * One pg_dump of the schema and two small catalogue reads. Run it after a
 * migration reaches production, or when the baseline drifts; never per test.
 * ============================================================================
 */
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const LOCAL_POSTGRES =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
// Storage's tables belong to Supabase's own roles, and a policy can only be
// created by a table's owner or a superuser — so storage.sql loads as the
// local superuser. Local-only credentials, the same on every machine.
const LOCAL_SUPERUSER =
  "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres";
const BASELINE = "supabase/baseline";
const MIGRATIONS = "supabase/migrations";
const CLI = ["bunx", "supabase@2.118.0"];
const DB_CONTAINER = "supabase_db_puneet";
// Production ROWS, from `db:local:pull`. Git-ignored: real data never goes
// into the repo. Optional — without it the database is structure only.
const DATA = `${BASELINE}/data.local.sql`;

/**
 * The data dump, reduced to our own schemas. auth.* and storage.* rows belong
 * to Supabase internals: identity is WorkOS (ADR 0004), so auth is unused, and
 * storage.objects would describe files that are not on this machine.
 */
function ourRowsOnly(dump: string): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of dump.split("\n")) {
    if (skipping) {
      if (line === "\\.") skipping = false;
      continue;
    }
    if (/^COPY "(auth|storage)"\./.test(line)) {
      skipping = true;
      continue;
    }
    if (/^SELECT pg_catalog\.setval\('"(auth|storage)"/.test(line)) continue;
    out.push(line);
  }
  return out.join("\n");
}

/**
 * COPY ... FROM stdin needs the copy protocol, which Bun's client does not
 * speak, so the rows go through psql inside the database container — as the
 * superuser, because the dump switches triggers off with
 * session_replication_role, which only a superuser may set.
 */
function loadRows(sqlText: string): void {
  const proc = Bun.spawnSync(
    [
      "docker",
      "exec",
      "-i",
      DB_CONTAINER,
      "psql",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
    ],
    { stdin: Buffer.from(sqlText), stdout: "ignore", stderr: "pipe" },
  );
  if (proc.exitCode !== 0)
    throw new Error(`Loading rows failed: ${proc.stderr.toString()}`);
}

function run(cmd: string[]): void {
  const proc = Bun.spawnSync(cmd, { stdout: "inherit", stderr: "inherit" });
  if (proc.exitCode !== 0)
    throw new Error(`${cmd.join(" ")} exited ${proc.exitCode}`);
}

async function reset(): Promise<void> {
  // A clean database: Supabase's own schemas and roles, nothing of ours.
  run([...CLI, "db", "reset", "--local"]);

  const baselineVersion = (
    await Bun.file(`${BASELINE}/version.txt`).text()
  ).trim();
  const newer = (await readdir(MIGRATIONS))
    .filter((f) => f.endsWith(".sql") && f.split("_")[0]! > baselineVersion)
    .sort();

  const db = new SQL(LOCAL_POSTGRES, { max: 1 });
  try {
    // Supabase's default privileges grant anon, authenticated and service_role
    // everything on each new table, sequence and function in public. In
    // production those grants were given at creation and then REVOKED by
    // migrations; the dump records only the grants that survived, so loaded
    // with the defaults on, every object would hand anon back what production
    // took away (measured: V7 of rpc-session-required.sql named dozens). Off
    // while the dump loads, then on again, so a NEW migration below is born
    // exactly as it would be in production.
    const defaults = (verb: "grant" | "revoke") =>
      ["tables", "sequences", "functions"]
        .map(
          (kind) =>
            `alter default privileges for role postgres in schema public ${verb} all on ${kind} ${verb === "grant" ? "to" : "from"} anon, authenticated, service_role;`,
        )
        .join("\n");
    await db.unsafe(defaults("revoke"));
    await db.unsafe(await Bun.file(`${BASELINE}/schema.sql`).text());
    await db.unsafe(defaults("grant"));
    console.log(`Schema loaded (production as of ${baselineVersion}).`);

    if (await Bun.file(DATA).exists()) {
      loadRows(ourRowsOnly(await Bun.file(DATA).text()));
      console.log("Production rows loaded.");
    } else {
      console.log(`No ${DATA} — structure only. Run db:local:pull for rows.`);
    }

    const admin = new SQL(LOCAL_SUPERUSER, { max: 1 });
    try {
      await admin.unsafe(await Bun.file(`${BASELINE}/storage.sql`).text());
    } finally {
      await admin.close();
    }
    console.log("Storage buckets and policies loaded.");

    for (const f of newer) {
      const body = await Bun.file(`${MIGRATIONS}/${f}`).text();
      await db.begin((tx) => tx.unsafe(body));
      console.log(`Applied ${f}`);
    }
    console.log(
      newer.length
        ? `${newer.length} newer migration(s) applied.`
        : "No newer migrations.",
    );
  } finally {
    await db.close();
  }
}

async function pull(): Promise<void> {
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (!url) throw new Error("SUPABASE_DB_URL is not set (see .env.local).");

  run([...CLI, "db", "dump", "--db-url", url, "-f", `${BASELINE}/schema.sql`]);

  const prod = new SQL(url, { max: 1 });
  const lines: string[] = [];
  let version = "";
  try {
    await prod.begin(async (tx) => {
      // An empty search_path makes the policy text fully qualified, so it
      // means the same thing whatever search_path loads it.
      await tx.unsafe("set local search_path = ''");
      const q = (s: string | null) =>
        s === null ? "null" : `'${s.replaceAll("'", "''")}'`;
      for (const b of await tx`
        select id, name, public, file_size_limit, allowed_mime_types
        from storage.buckets order by id`) {
        const mime = b.allowed_mime_types
          ? `array[${b.allowed_mime_types.map(q).join(",")}]::text[]`
          : "null";
        lines.push(
          `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (${q(b.id)}, ${q(b.name)}, ${b.public}, ${b.file_size_limit ?? "null"}, ${mime}) on conflict (id) do nothing;`,
        );
      }
      lines.push("");
      for (const p of await tx`
        select policyname, tablename, permissive, roles::text[] roles, cmd, qual, with_check
        from pg_policies where schemaname = 'storage' order by tablename, policyname`) {
        const roles = p.roles
          .map((r: string) => (r === "public" ? "public" : `"${r}"`))
          .join(", ");
        lines.push(
          `create policy "${p.policyname}" on storage.${p.tablename} as ${p.permissive.toLowerCase()} for ${p.cmd.toLowerCase()} to ${roles}${p.qual ? ` using (${p.qual})` : ""}${p.with_check ? ` with check (${p.with_check})` : ""};`,
        );
      }
      const [v] =
        await tx`select max(version) v from supabase_migrations.schema_migrations`;
      version = v.v;
    });
  } finally {
    await prod.close();
  }

  await Bun.write(
    `${BASELINE}/storage.sql`,
    "-- Storage buckets and policies, read from production by `bun run db:local:pull`.\n" +
      "-- `supabase db dump` leaves the storage schema out. Generated; do not edit.\n\n" +
      lines.join("\n") +
      "\n",
  );
  await Bun.write(`${BASELINE}/version.txt`, `${version}\n`);

  // The rows, into the git-ignored file `reset` loads. Last, so the schema
  // and the rows are read as close together as the two dumps allow — a row
  // whose column the schema lacks fails the load.
  run([
    ...CLI,
    "db",
    "dump",
    "--db-url",
    url,
    "--data-only",
    "--use-copy",
    "-f",
    DATA,
  ]);
  console.log(
    `Baseline refreshed: production as of ${version}, with its rows.`,
  );
}

const command = process.argv[2];
if (command === "reset") await reset();
else if (command === "pull") await pull();
else {
  console.error("Usage: bun scripts/local-db.ts <reset|pull>");
  process.exit(1);
}
