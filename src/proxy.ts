import {
  applyResponseHeaders,
  authkit,
  partitionAuthkitHeaders,
} from "@workos-inc/authkit-nextjs";
import { facilitySlugFromHost } from "@/lib/facility-host";
import { NextResponse, type NextRequest } from "next/server";

// ============================================================================
// The only proxy in this app, and it stays that way deliberately.
//
// (`proxy.ts` is what Next 16 renamed the `middleware.ts` convention to — same
// signature, same matcher, the function is just called `proxy` now. Next 16
// throws E900 if a `middleware.ts` ever appears beside it.)
//
// It used to refresh the Supabase session, then it established a Clerk one.
// WorkOS AuthKit owns the session now (ADR 0004): `authkit()` reads the sealed
// session cookie, refreshes it proactively when it is close to expiry, and hands
// back the headers that make `withAuth()` work in Server Components.
//
// WHY THE THREE-CALL FORM rather than `authkitProxy()`. The one-liner builds and
// returns the response itself, which leaves nowhere to add the two request
// headers below. `partitionAuthkitHeaders` splits AuthKit's output into headers
// bound for the app and headers bound for the browser, so we can add ours to the
// first set and still let AuthKit set its cookies on the second. Measured, not
// assumed: it seeds `requestHeaders` from `new Headers(request.headers)`, so the
// incoming headers survive.
//
// WHAT SURVIVED TWO PROVIDER MIGRATIONS, and must. Stamping `x-pathname` has
// nothing to do with sessions — it was riding along in the same response.
// Layouts cannot see the pathname (Next deliberately does not pass it) and
// `src/lib/auth/portal-gate.ts:33` reads this header for two things: leaving the
// sign-in screens reachable, and building the `?next=` that returns a bounced
// user where they were headed. Drop it and every portal gate loses its bearings.
//
// `set` rather than `append`, so a client that sends its own x-pathname header
// cannot smuggle a value past the gate. AuthKit applies the same rule to its own
// `x-workos-*` headers, which it strips from the incoming request before setting
// them itself.
//
// Nothing is gated HERE. Authorisation stays in the layouts, where the requested
// portal is known, and the real boundary stays in RLS. Keeping this thin is also
// what keeps self-hosting cheap: it runs at the edge and is the least portable
// part of the platform.
// ============================================================================

export async function proxy(request: NextRequest) {
  const { headers: authkitHeaders } = await authkit(request);
  const { requestHeaders, responseHeaders } = partitionAuthkitHeaders(
    request,
    authkitHeaders,
  );

  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Which facility this hostname names (spec 002 D2: pawradise.yipyy.com).
  // `null` for the apex, www, localhost and previews — i.e. "this is Yipyy
  // itself", which is the ordinary case and not an error.
  //
  // `set`, never `append`, and set UNCONDITIONALLY: a client that sends its own
  // x-facility-slug must not be able to smuggle one past this, and only writing
  // the header when a facility resolves would leave theirs in place on the apex.
  //
  // It is a ROUTING HINT. RLS still scopes every row from the token and
  // getFacilityContext() still resolves from the membership, so a forged value
  // buys a wrong-looking login page and no data whatsoever.
  requestHeaders.set(
    "x-facility-slug",
    facilitySlugFromHost(
      request.headers.get("host"),
      process.env.NEXT_PUBLIC_APP_DOMAIN,
    ) ?? "",
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyResponseHeaders(response, responseHeaders);
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
     * api/webhooks is NOT excluded: the user-sync webhook wants the proxy to run
     * (it verifies by signature, not by session), and adding exclusions here is
     * how a route quietly stops being seen at all.
     *
     * /auth/callback is NOT excluded either — it must run so AuthKit can set the
     * session cookie it just earned.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/twilio|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
