import {
  applyResponseHeaders,
  authkit,
  partitionAuthkitHeaders,
} from "@workos-inc/authkit-nextjs";
import { facilitySlugFromHost } from "@/lib/facility-host";
import { isMarketingHost } from "@/lib/app-host";
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

  // ── WHICH PATH IS ACTUALLY BEING SERVED ─────────────────────────────────
  //
  // The apex rewrite below changes that, so this is computed first and stamped
  // once. Setting the incoming `/` here and rewriting afterwards would leave
  // every downstream reader — the portal gates, and the root layout deciding
  // whether the page paints its own footer — believing it is serving `/`.
  const marketing =
    request.nextUrl.pathname === "/" &&
    isMarketingHost(
      request.headers.get("host"),
      process.env.NEXT_PUBLIC_APP_DOMAIN,
    );

  requestHeaders.set(
    "x-pathname",
    marketing ? "/coming-soon" : request.nextUrl.pathname,
  );

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

  // ── THE APEX IS A MARKETING PAGE NOW ────────────────────────────────────
  //
  // yipyy.com and www.yipyy.com serve the coming-soon page at `/`; the software
  // is app.yipyy.com. A REWRITE rather than a redirect, so the address bar
  // still reads yipyy.com — a marketing front door that bounces to /coming-soon
  // is a worse link to hand anybody.
  //
  // ── WHY HERE AND NOT IN src/app/route.ts ────────────────────────────────
  //
  // Because that file cannot do it. It is a Route Handler, and its header
  // explains at length why: as a page calling redirect() it shipped React error
  // #310 to production. A Route Handler renders nothing, so it cannot serve a
  // page — and a page cannot share the segment with it. The proxy is the only
  // place that sees the Host header before routing decides anything.
  //
  // ── ONLY `/`, AND ONLY THOSE TWO HOSTS ──────────────────────────────────
  //
  // Every other path on the apex still serves the app, so no existing link or
  // bookmark breaks. Facility subdomains never match. Neither does localhost or
  // `*.test`, so `/` in development still opens the portal.
  //
  // No session is read to decide this: the page is the same for everybody, and
  // it carries a "Sign in" link to app.yipyy.com for whoever already has an
  // account. Deciding it per-identity would put a session branch on the most
  // cacheable URL we have, to save one click.
  if (marketing) {
    const target = request.nextUrl.clone();
    target.pathname = "/coming-soon";
    const rewritten = NextResponse.rewrite(target, {
      request: { headers: requestHeaders },
    });
    return applyResponseHeaders(rewritten, responseHeaders);
  }

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
     *   api/internal              — the TLS `ask` endpoint. Caddy calls it
     *                                DURING A TLS HANDSHAKE, before the
     *                                certificate exists, to decide whether to
     *                                issue one. There is no session and cannot
     *                                be one; running authkit() here would put a
     *                                WorkOS token refresh on the handshake
     *                                critical path of every first-time visitor
     *                                to a facility subdomain.
     *
     * api/webhooks is NOT excluded: the user-sync webhook wants the proxy to run
     * (it verifies by signature, not by session), and adding exclusions here is
     * how a route quietly stops being seen at all.
     *
     * /auth/callback is NOT excluded either — it must run so AuthKit can set the
     * session cookie it just earned.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/twilio|api/health|api/internal|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
