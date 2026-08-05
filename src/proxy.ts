import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// ============================================================================
// The only proxy in this app, and it stays that way deliberately.
//
// (`proxy.ts` is what Next 16 renamed the `middleware.ts` convention to — same
// signature, same matcher, the function is just called `proxy` now. Supabase's
// own docs still show this as middleware.ts.)
//
// Its job is refreshing the Supabase session — Server Components cannot write
// cookies, so without this a rotated token has nowhere to land and reads
// quietly start returning empty. Authorisation lives in the layouts, where the
// requested portal is known.
//
// Clerk is layered around that, not in place of it. `clerkMiddleware` only
// establishes the Clerk auth context for the request; the response we hand back
// is still the one `updateSession` built, so the rotated Supabase cookies
// survive. Reversing the order — returning Clerk's own response — would drop
// those cookies and reintroduce exactly the silent-empty-reads failure above.
//
// Clerk does NOT gate anything here yet. Supabase Auth is still the live
// identity provider (see src/lib/auth/actions.ts and the portal login pages).
// Until the identity-ownership question is settled, this wiring is deliberately
// inert: it makes Clerk available without giving it authority over a request.
//
// Keeping it thin is also what keeps self-hosting cheap: this runs at the edge
// and is the least portable part of the platform, so business logic here would
// be the hardest thing to move.
// ============================================================================

// Named `proxy` export, not `export default`: the named form is what this app
// already ran on, so composing inside it keeps the convention proven rather
// than betting the session refresh on a different export being picked up.
const withClerk = clerkMiddleware(async (_auth, request) =>
  updateSession(request),
);

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  return withClerk(request, event);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   _next/static, _next/image  — build output, no session needed
     *   favicon / image files      — static assets
     *   api/twilio, api/health     — machine-to-machine; Twilio signs its own
     *                                webhooks and has no Supabase session, so
     *                                refreshing one would be pure latency
     */
    "/((?!_next/static|_next/image|favicon.ico|api/twilio|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    // Clerk's auto-proxy path. Kept as its own entry because the pattern above
    // is an exclusion list built around Supabase's needs, and /__clerk/* must
    // be routed even if that list later grows an exclusion that would catch it.
    "/__clerk/:path*",
  ],
};
