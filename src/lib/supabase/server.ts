import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";

import { createWorkosServerClient } from "./workos-server";

// ============================================================================
// Server-side Supabase client — for Server Components, Route Handlers and
// Server Actions.
//
// This client carries the SIGNED-IN USER'S JWT, not the service role key. That
// is the whole point: every query it makes is filtered by RLS. Reach for the
// service role and those policies stop applying — a query bug then returns
// another facility's clients instead of an empty set.
//
// The identity behind that JWT is now WORKOS (ADR 0004). The cookie-bound
// @supabase/ssr client is gone: AuthKit owns the session, so there is no
// Supabase cookie to read and nothing for the proxy to rotate.
//
// KEPT AS A SEAM, DELIBERATELY. The name, the async signature and the return
// type are unchanged, so the ~70 call sites that say
// `const supabase = await createServerClient()` did not need to be touched to
// swap the identity provider underneath them. Editing 70 files to change one
// decision is how a cutover acquires its own bugs.
//
// `server-only` makes importing this from a client component a build error
// rather than a silent leak.
// ============================================================================

export async function createServerClient() {
  // async purely to preserve the existing call shape — every caller already
  // awaits this, and changing that is a 70-file diff for no behavioural gain.
  return createWorkosServerClient();
}

/**
 * The signed-in user, or `null`.
 *
 * `withAuth()` reads AuthKit's sealed session — it does not trust a raw cookie,
 * so the guarantee that made the old `getUser()`-not-`getSession()` rule matter
 * still holds: a forged cookie does not produce a subject.
 *
 * The shape is narrowed to what callers actually read (`id`, `email` — checked
 * across the API routes) rather than re-exporting Supabase's User, which
 * described a record that no longer exists for a third-party identity.
 *
 * IT NO LONGER QUERIES THE DATABASE. Under Clerk this read `profiles.email`,
 * because the address lived on the synced profile rather than the session. The
 * WorkOS session carries the address itself, so the round trip is gone — and
 * with it the window where a user whose sync webhook had not yet landed resolved
 * with a null email. Same signature, one fewer query, a more accurate answer.
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string | null;
} | null> {
  const { user } = await withAuth();
  if (!user) return null;

  return { id: user.id, email: user.email ?? null };
}
