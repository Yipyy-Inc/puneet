import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// ============================================================================
// The only proxy in this app, and it stays that way deliberately.
//
// (`proxy.ts` is what Next 16 renamed the `middleware.ts` convention to — same
// signature, same matcher, the function is just called `proxy` now. Supabase's
// own docs still show this as middleware.ts.)
//
// Its single job is refreshing the Supabase session — Server Components cannot
// write cookies, so without this a rotated token has nowhere to land and reads
// quietly start returning empty. Authorisation lives in the layouts, where the
// requested portal is known.
//
// Keeping it thin is also what keeps self-hosting cheap: this runs at the edge
// and is the least portable part of the platform, so business logic here would
// be the hardest thing to move.
// ============================================================================

export async function proxy(request: NextRequest) {
  return updateSession(request);
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
  ],
};
