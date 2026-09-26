#!/usr/bin/env bun
/**
 * ============================================================================
 * Run a command against the LOCAL database instead of the live project.
 *
 *   bun run local bun run build
 *   bun run local bun run e2e:serve
 *   bun run local bun run test:e2e:gate
 *   bun run local bun run test:sql
 *
 * It reads the local stack's address and keys from `supabase status` and puts
 * them in the command's environment, where they outrank .env.local: Next and
 * the Playwright config both keep a variable that is already set. Nothing
 * else changes — WorkOS stays on staging, so the e2e accounts sign in as
 * they always have, and the local database trusts those tokens through
 * [auth.third_party.workos] in supabase/config.toml.
 *
 * NEXT_PUBLIC_* are inlined at BUILD time, so a server built by
 * `bun run build` (cloud) keeps talking to the cloud even when started under
 * this wrapper. Build under it too.
 *
 * Refuses to run when the stack is down rather than falling back to
 * .env.local, because the fallback is the live project — exactly what this
 * exists to avoid.
 * ============================================================================
 */
export {};

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: bun run local <command> [args...]");
  process.exit(1);
}

const status = Bun.spawnSync(
  ["bunx", "supabase@2.118.0", "status", "-o", "json"],
  { stdout: "pipe", stderr: "ignore" },
);
let local: Record<string, string>;
try {
  local = JSON.parse(status.stdout.toString());
} catch {
  local = {};
}
if (!local.API_URL || !local.DB_URL) {
  console.error(
    "The local Supabase stack is not running. Start it with `bunx supabase start`\n" +
      "(and `bun run db:local:reset` the first time). Not falling back to .env.local:\n" +
      "that is the live project.",
  );
  process.exit(1);
}

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY!,
  SUPABASE_DB_URL: local.DB_URL,
};

const proc = Bun.spawn([cmd, ...args], {
  env,
  stdio: ["inherit", "inherit", "inherit"],
});
process.exit(await proc.exited);
