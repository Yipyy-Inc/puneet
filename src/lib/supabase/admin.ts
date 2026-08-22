import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// The service-role client. Bypasses RLS entirely.
//
// `server-only` at the top is load-bearing: importing this from anything that
// reaches the browser is a build error, not a code review finding. The key is
// read from a NON-public env var for the same reason — `NEXT_PUBLIC_` would
// publish it to every visitor, and this key can read every facility's data.
//
// WHEN IT IS LEGITIMATE. This said "USED FOR EXACTLY ONE THING" until
// 2026-08-22, by which point thirteen files imported it — a count is the wrong
// thing to write down, because it goes stale silently and reads as permission
// once it has. The rule instead:
//
//   1. THERE IS NO SESSION TO BIND A CLIENT TO. A webhook is called by Clover
//      or WorkOS, not by a browser; a setup token is redeemed before an account
//      exists; a passkey is looked up in order to decide who is signing in. An
//      RLS-bound client would be `anon` and read nothing.
//   2. THE ACT IS OUTSIDE WHAT A POLICY CAN JUDGE. `user_passkeys` has no
//      insert policy because no `with check` expression can tell a genuine
//      WebAuthn attestation from a fabricated one; the verification happens in
//      the route, and the write follows it.
//   3. THE ROW BELONGS TO THE SYSTEM, NOT A TENANT — merchant credentials and
//      vault tokens under lib/clover.
//
// Anything else goes through `createWorkosServerClient()` so RLS still decides.
// If you are reaching for this key because a policy is in your way, the policy
// is the thing to change.
//
// `.env.example` documents this deliberately rather than pretending it does not
// exist, because a key people add ad-hoc without knowing what it does is worse
// than one that is written down with a warning attached.
// ============================================================================

let cached: SupabaseClient | null = null;

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Throws rather than returning null when unconfigured. A caller that forgets to
 * check `hasServiceRoleKey()` should fail loudly here, not receive a client-
 * shaped nothing and discover the problem three awaits later.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Staff invitations create " +
        "an auth account, which needs it. See .env.example.",
    );
  }

  cached ??= createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
