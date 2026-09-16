#!/usr/bin/env bun
// ============================================================================
// The server the local e2e suite drives, kept alive for the length of a run.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// `next start` has died mid-suite five times now, always the same way: exit
// code 9, sometimes after logging `Error: The destination stream closed early.`
// It has happened 11, 15 and 20 minutes into a run, and once at test 148 of
// 384. Nothing in this repo causes it and nothing here fixes it.
//
// What made it EXPENSIVE was not the crash. Playwright does not know the port
// went away: it keeps driving it, every remaining spec fails in two or three
// seconds against nothing, and the run ends with a wall of red that looks
// exactly like a regression. The last time, five `daycare-areas` specs that
// had passed standalone twenty minutes earlier were in that wall. Reading it
// costs more than the run did.
//
// So this does not prevent the crash. It makes the crash cost one gap of a few
// seconds instead of the rest of the suite, and it leaves a line in the log
// saying exactly when it happened — which is the thing that separates "the
// server died" from "this change broke it", and which was missing every time.
//
// ── USE ───────────────────────────────────────────────────────────────────
//
//   bun run e2e:serve              # port 3111
//   PORT=3000 bun run e2e:serve
//
// Detached, so it survives the shell that started it (see the memory note: a
// Bash-spawned server dies mid-suite for a different and duller reason):
//
//   Start-Process bun -ArgumentList "run","e2e:serve" -WindowStyle Hidden `
//     -RedirectStandardOutput e2e-server.log -RedirectStandardError e2e-server.err
//
// It needs a build: run `bun run build` first. `next start` with no build
// exits immediately, which is the one case below that must NOT be retried
// forever — see the crash loop guard.
// ============================================================================

// A module, so the top-level `await`s below are legal. There is nothing to
// export — `export {}` is the declaration that says so (TS1375).
export {};

const PORT = process.env.PORT ?? "3111";
const HEALTH = `http://localhost:${PORT}/api/health`;

/** A start that dies faster than this never got as far as serving anything. */
const TOO_FAST_MS = 10_000;
/** That many consecutive too-fast deaths and the fault is not transient. */
const MAX_FAST_DEATHS = 3;

function stamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function say(line: string): void {
  // To stderr so it interleaves with next's own output in the .err file rather
  // than landing in a separate stream a reader has to zip back together.
  process.stderr.write(`[e2e-server ${stamp()}] ${line}\n`);
}

/** Resolves once the port answers, or after `tries` — never throws. */
async function waitForHealth(tries = 40): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(HEALTH, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return true;
    } catch {
      // Not up yet. A refused connection during startup is expected.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

let starts = 0;
let fastDeaths = 0;

// Stop cleanly on Ctrl-C rather than leaving an orphan holding the port — an
// orphan is indistinguishable from a healthy server until the first spec fails.
let child: ReturnType<typeof Bun.spawn> | null = null;
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
    child?.kill();
    say(`stopped on ${signal} after ${starts} start(s)`);
    process.exit(0);
  });
}

say(`supervising next start on port ${PORT}`);

while (!stopping) {
  starts++;
  const startedAt = Date.now();
  if (starts > 1) say(`RESTART #${starts - 1} — the suite saw a gap here`);

  child = Bun.spawn(["bun", "x", "next", "start", "--port", PORT], {
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });

  if (starts === 1) {
    const healthy = await waitForHealth();
    say(healthy ? `ready on ${PORT}` : `NOT healthy on ${PORT} — see above`);
  }

  const code = await child.exited;
  if (stopping) break;

  const alive = Date.now() - startedAt;
  say(`next start exited ${code} after ${Math.round(alive / 1000)}s`);

  // ── The crash loop guard ────────────────────────────────────────────────
  //
  // A missing build, a port already held, a bad env: all exit at once, and
  // restarting forever would spin silently while a reader waits for a suite
  // that will never run. A server that served for a while and then fell over
  // is the case this exists for and is always retried.
  if (alive < TOO_FAST_MS) {
    fastDeaths++;
    if (fastDeaths >= MAX_FAST_DEATHS) {
      say(
        `gave up: ${MAX_FAST_DEATHS} starts died inside ${TOO_FAST_MS / 1000}s. ` +
          `Run \`bun run build\` and check nothing else holds port ${PORT}.`,
      );
      process.exit(1);
    }
  } else {
    fastDeaths = 0;
  }

  await new Promise((r) => setTimeout(r, 500));
}
