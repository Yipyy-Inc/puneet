import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getViewer,
  isAuthEnforced,
  landingPathFor,
  type Viewer,
} from "./viewer";

// ============================================================================
// One gate, used by every portal layout.
//
// Six layouts were each about to grow the same four decisions: fetch the
// viewer, leave the portal's own auth screens alone, allow or deny, and pick
// between "you need to sign in" and "you're signed in as the wrong person".
// Six copies is how they drift apart, and an auth gate that drifts is worse
// than one that is merely strict.
//
// WHAT THIS IS AND ISN'T: routing. `redirect()` from a streaming layout is a
// soft redirect — HTTP 200 with NEXT_REDIRECT in the payload, executed by the
// client router — so this keeps people out of the wrong UI. It is not what
// keeps them out of the data. RLS does that, on the database, from the JWT.
// ============================================================================

/**
 * The path being rendered, stamped onto the request by src/proxy.ts.
 *
 * Empty when the proxy did not run — currently only the routes its matcher
 * excludes (api/twilio, api/health, static assets), none of which render a
 * portal layout. An empty path matches no public prefix, so the gate fails
 * closed rather than open.
 */
async function currentPathname(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-pathname") ?? "";
}

export async function guardPortal({
  allow,
  publicPrefixes = [],
  whenWrongPortal,
}: {
  /** Gate for this portal, from viewer.ts — already flag-aware. */
  allow: (viewer: Viewer) => boolean;
  /**
   * Paths inside this portal that must stay reachable while signed out —
   * its own /auth/* screens. Gating those makes signing in impossible, which
   * is a redirect loop rather than a login page.
   */
  publicPrefixes?: string[];
  /**
   * Legacy-only fallback for a denied viewer while AUTH_ENFORCED is off, where
   * there are no claims to route by. Under enforcement the destination is
   * computed from the viewer instead — see below.
   */
  whenWrongPortal?: string;
}): Promise<Viewer> {
  const viewer = await getViewer();
  const pathname = await currentPathname();

  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return viewer;
  }

  if (allow(viewer)) return viewer;

  // Signed out and signed in as the wrong person are different problems: one
  // needs a login, the other needs somewhere else to go.
  if (isAuthEnforced()) {
    if (viewer.source !== "session") {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      redirect(`/login${next}`);
    }

    // Send them where they DO belong, computed from their own claims.
    //
    // This must not be a fixed path per portal. It was, briefly, and it
    // produced a redirect loop: a customer hitting /facility/dashboard was
    // sent to /dashboard, which denied them and sent them back. Every value
    // landingPathFor can return is a portal its own gate admits — a
    // membership implies the facility/staff portals, its absence implies the
    // customer one — so routing by the viewer cannot ping-pong.
    const home = landingPathFor(viewer);
    redirect(home === pathname ? "/login" : home);
  }

  // Flag off: no claims to route by, so fall back to the portal's own guess.
  // Safe from loops because the legacy rules are complementary — a
  // facility_admin is admitted to /facility and refused /dashboard, and a
  // super_admin is admitted to both.
  redirect(whenWrongPortal ?? "/login");
}
