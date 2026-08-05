import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

// ============================================================================
// Server-side Supabase client authenticated by CLERK, not Supabase Auth.
//
// Deliberately a second factory rather than a change to ./server.ts. The two
// authenticate a request in incompatible ways and both are live during the
// migration:
//
//   ./server.ts        cookie-bound Supabase session  → auth.uid()  (uuid)
//   this file          Clerk session token            → auth.jwt()->>'sub' (text)
//
// Editing the existing one in place would swap the identity under all 55
// auth.uid() call sites at once, and RLS answers an unrecognised caller with an
// empty result rather than an error — so the app would look fine and silently
// show nothing. Two factories let tables move over one at a time.
//
// USING THIS CLIENT ONLY WORKS ON TABLES WHOSE POLICIES READ auth.jwt()->>'sub'.
// Point it at a table still policed by auth.uid() and every read returns zero
// rows: Clerk's `sub` is `user_2abc…`, auth.uid() casts the claim to uuid, the
// cast yields NULL, and NULL matches nothing.
//
// No JWT template is involved. That integration was deprecated on 2025-04-01
// (it required sharing the project's JWT secret with Clerk, and rotating that
// secret meant downtime). This uses Clerk session tokens via Supabase's native
// third-party auth, which needs the provider registered in BOTH dashboards —
// until then Supabase rejects the token and every call 401s.
//
// `server-only` for the same reason as its sibling: importing it from a client
// component should be a build error, not a runtime surprise.
// ============================================================================

export function createClerkServerClient() {
  const { url, publishableKey } = supabaseConfig();

  return createClient<Database>(url, publishableKey, {
    // Called by supabase-js before each request, so a token that expires
    // mid-session is re-fetched rather than cached. This is what replaces the
    // cookie-refresh dance in lib/supabase/proxy.ts — Clerk holds the session,
    // so there is no Supabase cookie to rotate.
    async accessToken() {
      return (await auth()).getToken();
    },
  });
}
