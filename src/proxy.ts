import { clerkMiddleware } from "@clerk/nextjs/server";
import { facilitySlugFromHost } from "@/lib/facility-host";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

// ============================================================================
// The only proxy in this app, and it stays that way deliberately.
//
// (`proxy.ts` is what Next 16 renamed the `middleware.ts` convention to — same
// signature, same matcher, the function is just called `proxy` now.)
//
// It used to refresh the Supabase session. That job is GONE, not forgotten:
// Clerk owns the session now, so there is no Supabase cookie to rotate and
// nothing that expires mid-request. `clerkMiddleware` establishes the auth
// context and that is the whole of it.
//
// WHAT SURVIVED THE DELETION, and must. Stamping `x-pathname` had nothing to do
// with sessions — it was riding along in the same response. Layouts cannot see
// the pathname (Next deliberately does not pass it) and `src/lib/auth/
// portal-gate.ts:33` reads this header for two things: leaving the sign-in
// screens reachable, and building the `?next=` that returns a bounced user
// where they were headed. Drop it and every portal gate loses its bearings.
//
// `set` rather than `append`, so a client that sends its own x-pathname header
// cannot smuggle a value past the gate.
//
// Nothing is gated HERE. Authorisation stays in the layouts, where the
// requested portal is known, and the real boundary stays in RLS. Keeping this
// thin is also what keeps self-hosting cheap: it runs at the edge and is the
// least portable part of the platform.
// ============================================================================

// Named `proxy` export, not `export default`: the named form is what this app
// already ran on and is verified to register (the build prints
// `ƒ Proxy (Middleware)`), so composing inside it keeps the convention proven.
const withClerk = clerkMiddleware(async (_auth, request) => {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);

  // Which facility this hostname names (spec 002 D2: pawradise.yipyy.com).
  // `null` for the apex, www, localhost and previews — i.e. "this is Yipyy
  // itself", which is the ordinary case and not an error.
  //
  // `set`, never `append`, and set UNCONDITIONALLY: a client that sends its own
  // x-facility-slug must not be able to smuggle one past this, and only writing
  // the header when a facility resolves would leave theirs in place on the
  // apex. Same reasoning as x-pathname above, higher stakes — this names a
  // tenant.
  //
  // It is a ROUTING HINT. RLS still scopes every row from the token and
  // getFacilityContext() still resolves from the membership, so a forged value
  // buys a wrong-looking login page and no data whatsoever.
  headers.set(
    "x-facility-slug",
    facilitySlugFromHost(
      request.headers.get("host"),
      process.env.NEXT_PUBLIC_APP_DOMAIN,
    ) ?? "",
  );

  return NextResponse.next({ request: { headers } });
});

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  return withClerk(request, event);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   _next/static, _next/image  — build output, no auth context needed
     *   favicon / image files      — static assets
     *   api/twilio, api/health     — machine-to-machine; Twilio signs its own
     *                                webhooks and carries no session, so
     *                                establishing one would be pure latency
     *
     * api/webhooks is NOT excluded: Clerk's own webhook route wants the
     * middleware to run (it verifies by signature, not by session), and adding
     * exclusions here is how a route quietly stops being seen at all.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/twilio|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    // Clerk's auto-proxy path. Kept as its own entry because the pattern above
    // is an exclusion list, and /__clerk/* must be routed even if that list
    // later grows an exclusion that would catch it.
    "/__clerk/:path*",
  ],
};
