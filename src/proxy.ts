import {
  applyResponseHeaders,
  authkit,
  partitionAuthkitHeaders,
} from "@workos-inc/authkit-nextjs";
import {
  facilityCustomerOrigin,
  facilityStaffOrigin,
  platformOriginFor,
  resolveHost,
  type HostAudience,
} from "@/lib/app-host";
import { isStaging } from "@/lib/deployment";
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
// returns the response itself, which leaves nowhere to add the request headers
// below. `partitionAuthkitHeaders` splits AuthKit's output into headers bound
// for the app and headers bound for the browser, so we can add ours to the first
// set and still let AuthKit set its cookies on the second. Measured, not
// assumed: it seeds `requestHeaders` from `new Headers(request.headers)`, so the
// incoming headers survive.
//
// ── WHAT IT DECIDES, AND WHAT IT STILL DOES NOT ───────────────────────────
//
// It decides WHICH ADDRESS a request belongs at. Yipyy answers on four shapes
// and they mean different things to different people:
//
//   yipyy.com, www          marketing
//   hq.yipyy.com            Yipyy's own staff — the platform portal
//   <slug>.app.yipyy.com    that facility's staff
//   <slug>.yipyy.com        that facility's CUSTOMERS
//
// It still decides nothing about authorisation. RLS scopes every row from the
// JWT and `getFacilityContext()` resolves the facility from the caller's
// membership, so a forged Host buys a wrong-looking page and no data. Identity
// still picks the portal — `guardPortal` does that, after this runs.
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
// Keeping this thin is also what keeps self-hosting cheap: it runs at the edge
// and is the least portable part of the platform.
// ============================================================================

/**
 * Which audience each top-level path belongs to.
 *
 * Longest prefix wins, and anything not listed is reachable from EVERY host —
 * which is the important half. `/sign-in` has to answer on all four addresses,
 * because each audience signs in at its own; `/api/*` must never be redirected
 * because a machine caller does not follow one the way a browser does; and
 * `/setup/*`, `/onboard/*` and `/sign/*` carry invitation tokens whose links
 * were minted for a specific host.
 */
const PORTAL_AUDIENCE: ReadonlyArray<readonly [string, HostAudience]> = [
  ["/dashboard", "platform"],
  ["/facility", "staff"],
  ["/employee", "staff"],
  ["/staff", "staff"],
  ["/groomer", "staff"],
  ["/customer", "customer"],
  ["/join", "customer"],
  ["/book", "customer"],
  ["/review", "customer"],
  ["/forms", "customer"],
  ["/pay", "customer"],
];

function audienceForPath(pathname: string): HostAudience | null {
  for (const [prefix, audience] of PORTAL_AUDIENCE) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return audience;
    }
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { headers: authkitHeaders } = await authkit(request);
  const { requestHeaders, responseHeaders } = partitionAuthkitHeaders(
    request,
    authkitHeaders,
  );

  const rawHost = request.headers.get("host");
  const apex = process.env.NEXT_PUBLIC_APP_DOMAIN;
  const here = resolveHost(rawHost, apex);
  const pathname = request.nextUrl.pathname;

  // ── WHICH PATH IS ACTUALLY BEING SERVED ─────────────────────────────────
  //
  // The apex rewrite below changes that, so this is computed first and stamped
  // once. Setting the incoming `/` here and rewriting afterwards would leave
  // every downstream reader — the portal gates, and the root layout deciding
  // whether the page paints its own footer — believing it is serving `/`.
  const marketing = pathname === "/" && here.audience === "marketing";

  requestHeaders.set("x-pathname", marketing ? "/coming-soon" : pathname);

  // Which facility this hostname names — from EITHER of its two addresses.
  //
  // `set`, never `append`, and set UNCONDITIONALLY: a client that sends its own
  // x-facility-slug must not be able to smuggle one past this, and only writing
  // the header when a facility resolves would leave theirs in place on the apex.
  //
  // It is a ROUTING HINT. RLS still scopes every row from the token and
  // getFacilityContext() still resolves from the membership, so a forged value
  // buys a wrong-looking login page and no data whatsoever.
  requestHeaders.set("x-facility-slug", here.slug ?? "");

  // Who this address is for, so a Server Component can ask without re-parsing
  // the Host header — and so only one file knows how a hostname is decoded.
  requestHeaders.set("x-portal-audience", here.audience);

  // ── THE APEX IS A MARKETING PAGE ────────────────────────────────────────
  //
  // yipyy.com and www.yipyy.com serve the coming-soon page at `/`. A REWRITE
  // rather than a redirect, so the address bar still reads yipyy.com — a
  // marketing front door that bounces to /coming-soon is a worse link to hand
  // anybody.
  //
  // WHY HERE AND NOT IN src/app/route.ts: that file cannot do it. It is a Route
  // Handler, and its header explains at length why — as a page calling
  // redirect() it shipped React error #310 to production. A Route Handler
  // renders nothing, so it cannot serve a page, and a page cannot share the
  // segment with it. The proxy is the only place that sees the Host header
  // before routing decides anything.
  //
  // Only `/`: every other path on the apex still serves the app, so no existing
  // link or bookmark breaks. No session is read to decide it, because the page
  // is the same for everybody and carries a "Sign in" link for whoever has an
  // account.
  if (marketing) {
    const target = request.nextUrl.clone();
    target.pathname = "/coming-soon";
    return applyResponseHeaders(
      NextResponse.rewrite(target, { request: { headers: requestHeaders } }),
      responseHeaders,
    );
  }

  // ── A PORTAL IS SERVED AT ITS OWN ADDRESS, AND NOWHERE ELSE ─────────────
  //
  // `/customer/*` on the staff host, `/facility/*` on the customer host and
  // `/dashboard/*` anywhere but hq are all sent to the address that owns them,
  // carrying the same path so the visitor lands where they were going.
  //
  // A 307, and a REDIRECT rather than a rewrite: the address bar has to change,
  // or a customer bookmarks a staff hostname that happens to render their
  // portal. 307 rather than 308 because which portal lives where is a decision
  // this deployment makes, not a permanent fact about the URL — a browser that
  // cached a 308 would keep obeying it after the mapping changed.
  //
  // ── WHY NOT IN guardPortal ──────────────────────────────────────────────
  //
  // `src/lib/auth/portal-gate.ts` redirects from a LAYOUT, which is a soft
  // redirect: the layout streams, headers are already sent, so Next answers 200
  // with a NEXT_REDIRECT instruction and asks the client router to navigate.
  // For a cross-ORIGIN target that is an MPA navigation, which is precisely the
  // path that produced React error #310 in production — the crash documented at
  // length in src/app/route.ts. The proxy renders nothing and issues a genuine
  // 307, so it cannot hit that. guardPortal keeps doing exactly what it does
  // today: routing by identity, after the host question is settled here.
  const wants = audienceForPath(pathname);

  // ── STAGING IS ONE HOST, SO THERE IS NOWHERE TO SEND ANYBODY ────────────
  //
  // The four-host split is a production arrangement. Staging has exactly one
  // address, `staging.yipyy.com`, and it has to serve every audience from it —
  // that is the whole point of a review deployment.
  //
  // Left in, this block did the one thing staging must never do: it threw the
  // reviewer onto PRODUCTION. `staging` is a reserved subdomain, so
  // `resolveHost` correctly refuses to read it as a facility and answers
  // `{ audience: "staff", slug: null }`. `/dashboard` then asks for
  // `platform`, and `platform` is the ONE audience whose origin needs no slug
  // — `platformOriginFor("yipyy.com")` is `https://hq.yipyy.com` whatever
  // deployment is asking. So a platform admin signing in at staging.yipyy.com
  // was 307'd straight to production's platform portal, still signed in
  // because the AuthKit cookie is `.yipyy.com` and spans both, and every click
  // from there was a real production write against the shared database.
  //
  // The other two audiences were saved only by an accident of shape: with
  // `slug: null`, `facilityStaffOrigin` and `facilityCustomerOrigin` both
  // return null and the redirect falls through. It was never the guard, and it
  // would stop being true the moment staging got a slug.
  //
  // Reported from the staging review, 2026-09-03: "we sign in with my admin
  // account and it takes me to hq.yipyy.com, and I don't think it's staging
  // there". It was not.
  //
  // `isStaging()` reads YIPYY_DEPLOYMENT, which is set on the staging
  // container's `environment:` block and nowhere else, so production is
  // unchanged and an unset variable still means production (ADR 0007).
  if (wants && wants !== here.audience && !isStaging()) {
    const destination = originForAudience(wants, here.slug, apex);

    // Only when we can name the address with certainty. `/customer/*` reached
    // on bare app.yipyy.com names no facility, and guessing one would send
    // somebody to a stranger's business — so it falls through and lets
    // guardPortal route by identity instead.
    // ── AND ONLY WHEN THE SESSION CAN FOLLOW ─────────────────────────────
    //
    // The AuthKit cookie spans every host in the table above only when
    // WORKOS_COOKIE_DOMAIN is a leading-dot domain (`.yipyy.com`). Without
    // that it is host-only, and moving somebody between hosts signs them out —
    // a trap this repo has documented since src/app/route.ts was written, and
    // one that fails silently and looks like a session bug.
    //
    // So a deployment that has not widened its cookie degrades to what this
    // was before: routing only, portals reachable from any host. That is worse
    // than the split but far better than logging everybody out to enforce it.
    const cookieSpansHosts = (
      process.env.WORKOS_COOKIE_DOMAIN?.trim() ?? ""
    ).startsWith(".");

    if (destination && cookieSpansHosts) {
      // Built from the Host header, never `request.url`: self-hosted, Next
      // resolves that from the address the server is LISTENING on, which is how
      // a redirect once pointed at `https://0.0.0.0:3000` (see
      // src/lib/request-origin.ts). And the port is carried across explicitly,
      // because development runs on :3100 and production on none.
      const moved = new URL(destination);

      // ── SCHEME AND PORT FOLLOW THE REQUEST, NOT THE CONSTANT ─────────────
      //
      // `destination` is built as `https://…` because that is what production
      // serves. Development is `http://` on :3100, and a redirect to an https
      // URL there points at a scheme the local server does not answer — the
      // same class of mistake `src/lib/request-origin.ts` exists to prevent,
      // and its `isLocal` rule is the one mirrored here.
      const local =
        !rawHost ||
        rawHost.includes("localhost") ||
        rawHost.startsWith("127.0.0.1") ||
        rawHost.endsWith(".test") ||
        rawHost.includes(".test:");
      const forwarded = request.headers
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim();
      moved.protocol = forwarded ? `${forwarded}:` : local ? "http:" : "https:";

      const port = rawHost?.includes(":") ? rawHost.split(":")[1] : "";
      if (port) moved.port = port;
      moved.pathname = pathname;
      moved.search = request.nextUrl.search;
      return applyResponseHeaders(
        NextResponse.redirect(moved, 307),
        responseHeaders,
      );
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyResponseHeaders(response, responseHeaders);
}

/** Where an audience's portal is served, given the facility we are looking at. */
function originForAudience(
  audience: HostAudience,
  slug: string | null,
  apex: string | undefined,
): string | null {
  if (audience === "platform") return platformOriginFor(apex);
  if (!slug) return null;
  if (audience === "staff") return facilityStaffOrigin(slug, apex);
  if (audience === "customer") return facilityCustomerOrigin(slug, apex);
  return null;
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   _next/static, _next/image  — build output, no auth context needed
     *   favicon / image files      — static assets
     *   the five signed webhook    — machine-to-machine. Each verifies an HMAC
     *   paths, api/health            signature over its own body before doing
     *                                anything (verifyTwilioWebhook), and
     *                                carries no session, so establishing one
     *                                would be pure latency.
     *
     *                                NAMED INDIVIDUALLY, and that is the point.
     *                                This excluded all of `api/twilio` on the
     *                                stated grounds that "Twilio signs its own
     *                                webhooks" — true of ONE of the five at the
     *                                time. The other four verified nothing, and
     *                                `api/twilio/call` was an outbound-call
     *                                endpoint that took both legs from an
     *                                unauthenticated request body. A prefix
     *                                exclusion covers routes nobody has written
     *                                yet; a list has to be edited on purpose.
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
    "/((?!_next/static|_next/image|favicon.ico|api/twilio/sms|api/twilio/voice|api/twilio/dial|api/twilio/status|api/twilio/recording|api/health|api/internal|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
