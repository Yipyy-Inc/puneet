import "server-only";

import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

// ============================================================================
// Server-side Supabase client — for Server Components, Route Handlers and
// Server Actions.
//
// This client carries the SIGNED-IN USER'S JWT, not the service role key. That
// is the whole point: every query it makes is filtered by the RLS policies in
// supabase/migrations/20260726120000_tenancy_and_identity.sql. Reach for the
// service role and those policies stop applying — a query bug then returns
// another facility's clients instead of an empty set.
//
// `server-only` makes importing this from a client component a build error
// rather than a silent leak.
//
// Named `createServerClient`, not `createClient`, so that importing it
// alongside the browser factory needs no alias. The two have very different
// blast radii and an aliasing slip would be silent.
// ============================================================================

export async function createServerClient() {
  const { url, publishableKey } = supabaseConfig();
  const cookieStore = await cookies();

  return createSsrServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is expected and safe to
          // swallow *provided* something else refreshes the session — today
          // nothing does, because there is no auth flow yet. When one lands,
          // add the standard `updateSession` middleware; without it tokens
          // expire mid-session and reads start returning empty.
        }
      },
    },
  });
}

/**
 * The signed-in user, or `null`.
 *
 * Always `getUser()`, never `getSession()`, on the server: `getSession()` reads
 * the cookie without verifying it, so a forged cookie would be believed.
 * `getUser()` validates the JWT against Supabase before returning.
 */
export async function getCurrentUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
