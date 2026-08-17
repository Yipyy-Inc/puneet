import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

// ============================================================================
// Server-side Supabase client authenticated by WORKOS.
//
// Renamed from clerk-server.ts by ADR 0004. The file it replaced explained why
// it existed as a SECOND factory alongside a cookie-bound Supabase client: the
// two identified a caller in incompatible units and both were live mid-migration.
// That reason is spent — the auth.uid() era ended with ADR 0003 — so there is one
// factory now and this is it.
//
// WHAT MAKES THE PROVIDER SWAP CHEAP. Postgres identifies the caller by
// `auth.jwt()->>'sub'`, a plain JWT claim. WorkOS supplies it exactly as Clerk
// did, so the 220 RLS policies were not touched and no column changed type.
// Verified end to end before this file was written: a real WorkOS token resolves
// in Postgres with `role = authenticated` and `sub = user_01M0…`.
//
// THE `role` CLAIM IS NOT AUTOMATIC. Supabase reads `role` from the token to pick
// the Postgres role, and WorkOS does not emit one by default — it is injected by
// the environment's JWT template, `{"role": "authenticated"}`. Without it every
// query runs as `anon` and returns zero rows with no error. That template is
// configuration, not code, so nothing in this repo will fail if somebody deletes
// it; the symptom is every page rendering empty.
//
// Do NOT add `user_role: {{organization_membership.role}}` to that template, as
// Supabase's generic WorkOS guide suggests. It assumes WorkOS Organizations,
// which ADR 0004 §5 deliberately refuses — tenancy is `facility_memberships`.
//
// `server-only`: importing this from a client component should be a build error,
// not a runtime surprise.
// ============================================================================

export function createWorkosServerClient() {
  const { url, publishableKey } = supabaseConfig();

  return createClient<Database>(url, publishableKey, {
    // Called by supabase-js before each request rather than snapshotted, so a
    // token that expires mid-session is re-fetched. `withAuth()` reads the
    // sealed session cookie the proxy maintains and refreshes it proactively,
    // so this never hands out an expired token.
    async accessToken() {
      const { accessToken } = await withAuth();
      return accessToken ?? null;
    },
  });
}
