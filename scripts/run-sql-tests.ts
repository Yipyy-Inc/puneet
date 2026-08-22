#!/usr/bin/env bun
/**
 * Run the SQL tests in supabase/tests/.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * There are 41 of them and NOTHING ran any of them — not CI, not a package
 * script, not a hook. They were hand-run, and evidently had not been for weeks.
 *
 * That is not a tidiness problem. `rpc-session-required.sql` contains V7, a
 * sweep written specifically so that a new SECURITY DEFINER function which
 * forgets `revoke ... from anon` fails a TEST rather than reaching production.
 * On 2026-08-22 `award_loyalty_badge` shipped with exactly that hole — the
 * FOURTH occurrence of a trap documented in three places. A rule broken four
 * times despite being written down is not a documentation problem; it is a
 * missing gate. This is the gate.
 *
 * ── THE RUNNER OWNS THE TRANSACTION, NOT THE FILE ──────────────────────────
 *
 * Every file opens with `begin;` and closes with `rollback;`, and they seed
 * real rows into real tables to do their work — orgs, facilities, memberships,
 * staff. Against production that is only safe because of the rollback.
 *
 * So the runner does not trust it. It STRIPS both statements and wraps the body
 * in its own transaction, which it aborts unconditionally. A file that forgot
 * its `rollback;`, or grew a stray `commit;`, still cannot commit — and a file
 * whose shape it does not recognise is REFUSED rather than run. The safety
 * property has to hold for the file somebody writes next, not just for the 41
 * that exist.
 *
 * ── READING THE RESULT ─────────────────────────────────────────────────────
 *
 * Each file builds a temp table `tap (n, name, ok, detail)` through a
 * `pg_temp.t(name, ok, detail)` helper, then prints it. The runner ignores the
 * file's own printing — a multi-statement batch does not reliably hand back
 * every result set — and selects from `tap` itself as a statement of its own,
 * inside the transaction, before rolling back.
 *
 * Usage:
 *   bun run test:sql                      every file
 *   bun run test:sql loyalty rpc-session  only files whose name contains one
 *
 * Needs SUPABASE_DB_URL — a DIRECT Postgres connection string. Not the
 * publishable key and not the service-role key: those reach PostgREST, which
 * cannot hold a session open across `begin` and `rollback`, which is the one
 * thing this depends on.
 */
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const TESTS_DIR = "supabase/tests";

interface TapRow {
  n: number;
  name: string;
  ok: boolean;
  detail: string | null;
}

interface FileResult {
  file: string;
  rows: TapRow[];
  /** Set when the file could not be run at all. */
  error?: string;
  /** Set when the file's shape was not one this runner will execute. */
  refused?: string;
}

/** Thrown to abort the transaction. Never escapes `runFile`. */
class Rollback extends Error {}

/**
 * The body, with the file's own transaction control removed.
 *
 * Refuses anything it does not recognise. A file that does not open with
 * `begin;` and close with `rollback;` is not one whose safety this runner can
 * reason about, and running it anyway is how a test suite writes to production.
 */
function bodyOf(sqlText: string): { body: string } | { refused: string } {
  const lines = sqlText.split(/\r?\n/);

  const firstIdx = lines.findIndex(
    (l) => l.trim() !== "" && !l.trim().startsWith("--"),
  );
  if (firstIdx === -1 || lines[firstIdx].trim().toLowerCase() !== "begin;") {
    return { refused: "does not open with `begin;`" };
  }

  let lastIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== "") {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx === -1 || lines[lastIdx].trim().toLowerCase() !== "rollback;") {
    return { refused: "does not close with `rollback;`" };
  }

  const body = lines.slice(firstIdx + 1, lastIdx).join("\n");

  // A `commit` anywhere inside would end the runner's transaction early and
  // make everything after it permanent. Cheap to check, catastrophic to miss.
  if (/^\s*commit\s*;/im.test(body)) {
    return { refused: "contains a `commit;`" };
  }

  return { body };
}

/**
 * One connection per file, opened and closed here.
 *
 * A single shared client segfaulted Bun 1.3.11 partway through the 41 — inside
 * its own pooling, with a stack in `postgres_connections`, so nothing this
 * script does could catch it. A crashed process reports NO results, including
 * for the files that had already passed, which makes the whole run worthless.
 *
 * `max: 1` and a close per file costs a handshake each and buys a run that
 * finishes. When Bun fixes it this can go back to one client.
 */
async function runFile(url: string, file: string): Promise<FileResult> {
  const text = await Bun.file(`${TESTS_DIR}/${file}`).text();
  const parsed = bodyOf(text);
  if ("refused" in parsed) return { file, rows: [], refused: parsed.refused };

  const sql = new SQL(url, { max: 1 });
  let rows: TapRow[] = [];
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(parsed.body).simple();
      // `?? []` because Bun's client returns undefined rather than an empty
      // array for some shapes, and an undefined `rows` crashes the summary
      // AFTER every file has already run — losing the whole result set.
      rows =
        ((await tx.unsafe(
          "select n, name, ok, detail from tap order by n",
        )) as unknown as TapRow[] | undefined) ?? [];
      // Unconditional. The assertions have been read; nothing this file did
      // survives, whatever the file itself intended.
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) {
      return {
        file,
        rows,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } finally {
    await sql.close().catch(() => {});
  }

  return { file, rows };
}

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const OFF = "\x1b[0m";

/** One file's outcome, printed the moment it is known. */
function report(result: FileResult): void {
  if (result.refused) {
    console.log(`${RED}REFUSED${OFF} ${result.file} — ${result.refused}`);
    return;
  }
  if (result.error) {
    console.log(`${RED}ERROR  ${OFF} ${result.file}`);
    console.log(`        ${DIM}${result.error.split("\n")[0]}${OFF}`);
    return;
  }
  if (result.rows.length === 0) {
    console.log(`${RED}EMPTY  ${OFF} ${result.file} — ran, asserted nothing`);
    return;
  }

  const bad = result.rows.filter((r) => !r.ok);
  if (bad.length === 0) {
    console.log(
      `${GREEN}ok     ${OFF} ${result.file} ${DIM}(${result.rows.length})${OFF}`,
    );
    return;
  }

  console.log(
    `${RED}FAIL   ${OFF} ${result.file} ${DIM}(${bad.length} of ${result.rows.length})${OFF}`,
  );
  for (const row of bad) {
    console.log(`        ${RED}✗${OFF} ${row.name}`);
    if (row.detail) console.log(`          ${DIM}${row.detail}${OFF}`);
  }
}

/**
 * The child half: run ONE file and print its result as JSON.
 *
 * Not a public entry point — the parent spawns it. It prints nothing else, so
 * the last line of stdout is always the result or there is no result.
 */
async function runOne(url: string, file: string): Promise<number> {
  const result = await runFile(url, file);
  console.log(JSON.stringify(result));
  return 0;
}

async function main(): Promise<number> {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error(
      `${RED}SUPABASE_DB_URL is not set.${OFF}\n\n` +
        "It must be a DIRECT Postgres connection string — the one Supabase shows\n" +
        "under Project Settings > Database > Connection string. The publishable\n" +
        "and service-role keys will not do: they reach PostgREST, which cannot\n" +
        "hold a session open across `begin` and `rollback`, and the rollback is\n" +
        "the only reason these tests are safe to run against a real database.\n\n" +
        "Put it in .env.local as SUPABASE_DB_URL; bun loads that file itself.",
    );
    return 2;
  }

  // ── NOT THE TRANSACTION POOLER ──────────────────────────────────────────
  //
  // Supabase offers three connection strings and only two work here. The
  // transaction pooler (port 6543) hands out a different backend per
  // STATEMENT, so a prepared statement from one does not exist on the next —
  // and Bun's client prepares by default. The failure it produces
  // ("prepared statement ... does not exist") says nothing about the real
  // cause, so it is worth naming here.
  if (/:6543(\/|$)/.test(url)) {
    console.error(
      `${RED}That is the TRANSACTION pooler (port 6543).${OFF}\n\n` +
        "It gives a different backend per statement, which breaks both prepared\n" +
        "statements and the session-level transaction these tests depend on.\n" +
        "Use the SESSION pooler or the direct connection — both are port 5432.",
    );
    return 2;
  }

  const argv = process.argv.slice(2);

  // The child half, spawned by the loop below. Must come after the url checks
  // so a child never runs with no connection string.
  const oneAt = argv.indexOf("--one");
  if (oneAt !== -1) {
    const file = argv[oneAt + 1];
    if (!file) {
      console.error("--one needs a file name");
      return 2;
    }
    return runOne(url, file);
  }

  const filters = argv;
  const all = (await readdir(TESTS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const files =
    filters.length > 0
      ? all.filter((f) => filters.some((needle) => f.includes(needle)))
      : all;

  if (files.length === 0) {
    console.error(`No test file matches ${filters.join(", ")}`);
    return 2;
  }

  console.log(
    `${BOLD}SQL tests${OFF} ${DIM}(${files.length} of ${all.length} file(s))${OFF}\n`,
  );

  const results: FileResult[] = [];

  // ── ONE FILE, ONE PROCESS ───────────────────────────────────────────────
  //
  // Bun 1.3.11's Postgres client segfaults nondeterministically on Windows,
  // inside its own connection handling — twice during this suite, at different
  // points, with a stack no JavaScript can catch. A crash in-process takes the
  // exit code with it, and a gate whose exit code is sometimes 3 for reasons
  // unrelated to the assertions is not a gate.
  //
  // So each file runs in a child that does nothing else. If the driver dies it
  // kills only that child; the parent records the file as ERROR and carries on.
  //
  // Sequential, deliberately: the files seed overlapping fixture rows with
  // fixed uuids and `on conflict do nothing`, so run concurrently they would
  // see each other's uncommitted state or deadlock on it.
  for (const file of files) {
    const child = Bun.spawn(
      [process.execPath, import.meta.path, "--one", file],
      { stdout: "pipe", stderr: "pipe", env: process.env },
    );
    const stdout = await new Response(child.stdout).text();
    await child.exited;

    let result: FileResult;
    try {
      result = JSON.parse(stdout.trim().split("\n").pop() ?? "") as FileResult;
    } catch {
      result = {
        file,
        rows: [],
        error:
          child.exitCode === 0
            ? "child produced no result"
            : `child died (exit ${child.exitCode}) — likely the Bun driver crash`,
      };
    }
    results.push(result);
    // Printed as it goes, so a run interrupted for any reason still leaves a
    // record of what had already been established.
    report(result);
  }

  const passed = results.reduce(
    (n, r) => n + r.rows.filter((row) => row.ok).length,
    0,
  );
  const failed = results.reduce(
    (n, r) => n + r.rows.filter((row) => !row.ok).length,
    0,
  );
  const broken = results.filter(
    (r) => r.refused || r.error || r.rows.length === 0,
  ).length;

  console.log(
    `\n${BOLD}${passed} passed, ${failed} failed${OFF}` +
      (broken > 0 ? `, ${RED}${broken} file(s) did not run${OFF}` : ""),
  );

  return failed > 0 || broken > 0 ? 1 : 0;
}

process.exit(await main());
