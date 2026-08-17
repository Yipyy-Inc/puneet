/**
 * ============================================================================
 * The WorkOS keys the e2e suite runs on. (Was _clerk-keys.ts; ADR 0004.)
 *
 * ── STAGING KEYS ONLY, AND THAT IS ASSERTED ───────────────────────────────
 *
 * The realistic accident is a developer with PRODUCTION keys exported in their
 * shell running the suite and having it create seven staff accounts on the live
 * environment — and then, because the provisioning script is find-or-create,
 * quietly reusing them on every later run.
 *
 * WorkOS makes the check easy: staging keys are `sk_test_…`. The check below is
 * not ceremony.
 *
 * **Production keys are NOT `sk_live_…`** — that was assumed here until
 * 2026-08-17 and is wrong. A WorkOS production key is `sk_` followed by base64,
 * with no environment marker at all, so there is nothing to match on and the
 * only safe test is the positive one: require `sk_test_`, refuse everything
 * else. Do not "improve" this into a `sk_live_` denylist; it would pass every
 * production key.
 *
 * ── THE ISSUER MUST BE REGISTERED WITH SUPABASE ───────────────────────────
 *
 * Supabase's third-party auth accepts tokens only from the WorkOS environments
 * registered on the project. A token from any other environment is refused with
 * `PGRST301 No suitable key or wrong key type`, which surfaces as
 * "Not signed in." from /api/permissions and as a portal bounce — i.e. it looks
 * like a broken account rather than a wrong environment. Both Yipyy environments
 * are registered; a third one would not be.
 *
 * Simpler than the Clerk version this replaces, which also had to defeat a
 * "keyless" fallback that auto-provisioned a throwaway instance registered
 * nowhere. WorkOS has no such mode: absent keys fail loudly.
 * ============================================================================
 */

export interface WorkosTestKeys {
  apiKey: string;
  clientId: string;
}

/**
 * Not exported: `global.setup.ts` was its only outside caller and went with
 * Clerk's Testing Token (playwright.config.ts explains why there is no setup
 * project now). Reaching for the keys without going through
 * `applyWorkosTestKeys` would skip the web server, which needs them too.
 */
function resolveWorkosTestKeys(): WorkosTestKeys {
  const apiKey = process.env.WORKOS_API_KEY?.trim();
  const clientId = process.env.WORKOS_CLIENT_ID?.trim();

  if (!apiKey || !clientId) {
    throw new Error(
      [
        "No WorkOS keys available for the e2e suite.",
        "",
        "Set WORKOS_API_KEY (sk_test_…) and WORKOS_CLIENT_ID in .env.local.",
        "Both come from the WorkOS dashboard, Staging environment.",
      ].join("\n"),
    );
  }

  if (!apiKey.startsWith("sk_test_")) {
    throw new Error(
      [
        "Refusing to run the e2e suite against a WorkOS PRODUCTION environment.",
        "",
        `  api key: ${apiKey.slice(0, 8)}…`,
        "",
        "The suite provisions seven staff accounts and signs in as them.",
        "Use the Staging environment's sk_test_ key.",
      ].join("\n"),
    );
  }

  return { apiKey, clientId };
}

/**
 * Resolve and export onto process.env.
 *
 * Called from playwright.config.ts so the failure is one sentence at startup
 * rather than 36 identical sign-in timeouts — and so the WEB SERVER gets them
 * too: Playwright passes process.env down to the `bun run dev` it starts, and an
 * app on a different WorkOS environment from the harness would reject every
 * session the harness creates.
 *
 * Existing values are never overwritten — an explicit export in the shell is a
 * deliberate act and outranks anything found on disk.
 */
export function applyWorkosTestKeys(): WorkosTestKeys {
  const keys = resolveWorkosTestKeys();
  const assign = (name: string, value: string) => {
    if (!process.env[name]?.trim()) process.env[name] = value;
  };
  assign("WORKOS_API_KEY", keys.apiKey);
  assign("WORKOS_CLIENT_ID", keys.clientId);
  return keys;
}
