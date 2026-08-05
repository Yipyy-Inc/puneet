import "server-only";

import { auth } from "@clerk/nextjs/server";

import { createClerkServerClient } from "./clerk-server";

// ============================================================================
// Server-side Supabase client — for Server Components, Route Handlers and
// Server Actions.
//
// This client carries the SIGNED-IN USER'S JWT, not the service role key. That
// is the whole point: every query it makes is filtered by RLS. Reach for the
// service role and those policies stop applying — a query bug then returns
// another facility's clients instead of an empty set.
//
// The identity behind that JWT is now CLERK. The cookie-bound @supabase/ssr
// client is gone: Clerk owns the session, so there is no Supabase cookie to
// read and nothing for the proxy to rotate.
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
  return createClerkServerClient();
}

/**
 * The signed-in user, or `null`.
 *
 * `auth()` reads Clerk's verified session — it does not trust a raw cookie, so
 * the guarantee that made the old `getUser()`-not-`getSession()` rule matter
 * still holds: a forged cookie does not produce a subject.
 *
 * The shape is narrowed to what callers actually read (`id`, `email` — checked
 * across the API routes) rather than re-exporting Supabase's User, which
 * described a record that no longer exists for a Clerk identity.
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string | null;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // The address lives on the synced profile now, not on an auth.users row.
  // A user whose sync webhook has not landed yet still resolves — with a null
  // email — because callers use this to answer "is anyone signed in", and
  // answering "no" there would 401 a legitimately authenticated request.
  const supabase = createClerkServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  return { id: userId, email: data?.email ?? null };
}
