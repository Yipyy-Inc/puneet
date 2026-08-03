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
// USED FOR EXACTLY ONE THING: creating an auth user for a new hire. That is not
// something RLS can do — auth.users is GoTrue's table, not ours, and the
// admin API is the only door. Every other statement in the invite route goes
// through the ordinary cookie-bound client so RLS still decides.
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
