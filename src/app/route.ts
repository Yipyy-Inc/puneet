import { NextResponse, type NextRequest } from "next/server";

import {
  getViewer,
  landingPathFor,
  landingPathForClaims,
} from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { facilitySlugFromHost } from "@/lib/facility-host";
import { redirectUrl } from "@/lib/request-origin";

// ============================================================================
// The front door. It resolves where you belong ONCE, and answers with a REAL
// HTTP redirect.
//
// ── WHY THIS IS A ROUTE HANDLER AND NOT A PAGE ────────────────────────────
//
// It was `src/app/page.tsx` calling `redirect()`, and that shipped a crash to
// production. A page renders inside the root layout, the root layout streams, so
// headers are already sent by the time `redirect()` throws. Next cannot answer
// 307 at that point, so it answers **200 with a NEXT_REDIRECT instruction in the
// RSC payload** and asks the CLIENT ROUTER to perform the navigation (the same
// mechanism the portal gates hit — see the long note in src/lib/auth/viewer.ts).
//
// Handing that navigation to the client router is what broke. Next's App Router
// component takes this branch:
//
//     if (pushRef.mpaNavigation) {
//       location.replace(canonicalUrl)
//       throw unresolvedThenable      // <- abandons the render HERE
//     }
//     useEffect(...)                  // <- four more hooks live below this line
//
// The throw abandons the render before the remaining hooks run, so that render
// executes FEWER hooks than the one before it and React tears the tree down with
// error #310, "Rendered more hooks than during the previous render". The browser
// shows Next's built-in global-error screen — "Reload to try again, or go back."
// — and then the `location.replace()` that was already in flight completes and
// the correct page appears. That is exactly the reported symptom: yipyy.com
// fails, then works three or four seconds later. Reproduced by Vercel's own
// deployment screenshot bot, so it was never anything local.
//
// A Route Handler has no layout, renders no React, and streams nothing. Nothing
// is flushed before the response, so `NextResponse.redirect` is a genuine 307:
// the browser follows it itself and the client router never sees a navigation to
// perform. The crashing code path is not fixed here, it is no longer reachable
// from the front door.
//
// A route handler and a page cannot share a segment, which is why page.tsx is
// gone rather than kept alongside this.
//
// ── WHY NOT DECIDE THIS IN src/proxy.ts ───────────────────────────────────
//
// The proxy could answer the signed-out half from the session cookie alone, but
// not the signed-in half: naming the right portal needs the two membership
// reads below. proxy.ts deliberately holds no session logic and runs at the edge
// on every request, so putting a database round trip in it to serve one URL is
// the wrong swap. Here the cost lands only on requests to `/`.
//
// ── COST FOR THE COMMON CASE ──────────────────────────────────────────────
//
// A signed-out visitor is the common case at this URL and pays nothing extra:
// `getViewer()` calls `withAuth()`, finds no session, and returns ANONYMOUS
// without touching Postgres. Only a signed-in visitor pays the two RLS-scoped
// reads, and that is the request that would otherwise have loaded an entire
// portal shell it had no right to see.
//
// It also removes a document load outright. Measured on production before this
// change, reaching sign-in from yipyy.com cost THREE 200s and three sets of JS
// chunks (`/` -> `/dashboard` -> `/sign-in`). It is now one 307 and one page.
//
// `landingPathFor` is the same helper the portal gates use, so the front door
// and the gates cannot disagree about where somebody belongs.
// ============================================================================

/**
 * Never cache this. The response is per-identity: a cached 307 would send every
 * visitor to whichever portal the first one belonged in. Reading cookies already
 * opts a handler out of static evaluation — this says so out loud, because the
 * failure mode is silent and severe.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const viewer = await getViewer();

  // `source`, not `userId !== null` — the gates read the same field, and it is
  // what shows up in logs.
  let destination =
    viewer.source === "anonymous" ? "/sign-in" : landingPathFor(viewer);

  // ── THE ADDRESS NAMES A FACILITY, SO HONOUR IT ──────────────────────────
  //
  // `landingPathFor` answers from the identity alone, and `isPlatformAdmin`
  // wins there unconditionally. That is right at the apex and wrong at
  // pawradise.yipyy.com: a platform admin who is also a member of a facility
  // opened THAT facility's address and was sent to the platform-wide Command
  // Center, showing other tenants' invoices at a tenant's own front door.
  //
  // Reported from production 2026-08-24. Not a data leak — /dashboard is gated
  // on is_platform_admin and a facility owner is refused it — but the address
  // meant one thing and the app did another.
  //
  // One extra read, and only for a signed-in visitor on a facility host. The
  // apex, www, localhost and previews resolve no slug and skip it entirely,
  // which is the ordinary case this file was optimised for.
  const slug = facilitySlugFromHost(
    request.headers.get("host"),
    process.env.NEXT_PUBLIC_APP_DOMAIN,
  );

  if (slug && viewer.source === "session" && viewer.memberships.length > 0) {
    const supabase = await createServerClient();
    const { data: named } = await supabase
      .from("facilities")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    const membership = named
      ? viewer.memberships.find((m) => m.facilityId === named.id)
      : undefined;

    // Only when they actually belong here.
    if (membership) {
      destination = landingPathForClaims(false, [membership]);
    } else if (viewer.isPlatformAdmin) {
      // ── A PLATFORM ADMIN WHO IS NOT A MEMBER GOES TO THE APEX ───────────
      //
      // A facility subdomain is that facility's front door. It should never
      // paint platform-wide figures, whoever is looking — so rather than
      // choosing between two wrong portals at this address, send them to the
      // address where the platform portal belongs.
      //
      // GUARDED, because crossing hosts can sign somebody out. The AuthKit
      // cookie only spans yipyy.com and pawradise.yipyy.com when
      // WORKOS_COOKIE_DOMAIN widens it to a leading-dot domain; without that it
      // is host-only and this redirect would land them on a sign-in page. So
      // the redirect happens only when the configuration actually permits it,
      // and otherwise nothing changes. A fix that logs people out is not a fix,
      // and this is the kind of cookie trap that fails silently in production
      // and looks like a session bug.
      const cookieDomain = process.env.WORKOS_COOKIE_DOMAIN?.trim() ?? "";
      const apex = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim() ?? "";

      if (cookieDomain.startsWith(".") && apex) {
        const away = new URL(`https://${apex}/dashboard`);
        return NextResponse.redirect(away, 307);
      }
    }
  }

  // ── BUILT FROM THE HOST HEADER, NOT FROM nextUrl ──────────────────────────
  //
  // This was `request.nextUrl.clone()`, on the stated grounds that it "carries
  // the origin Next itself resolved, which is what keeps this pointing at
  // www.yipyy.com behind Vercel's proxy". That was true on Vercel and ONLY
  // there. Self-hosted, Next resolves that origin from the address the server
  // is listening on, so this redirected every sign-in to
  // `https://0.0.0.0:3000/sign-in` — not a wrong host, not an address at all.
  //
  // `requestOrigin()` uses the same `host` header that decided the facility
  // slug fifty lines above, so the visitor is returned to precisely the host
  // they arrived on and their session cookie follows them.
  //
  // The query is still cleared: `/` takes none, and forwarding an arbitrary one
  // into a portal is a surprise nobody asked for.
  const url = redirectUrl(request, destination);
  url.search = "";

  // 307 rather than 308: this is a decision about the current session, not a
  // permanent fact about the URL, and a browser that cached a 308 would keep
  // sending a signed-out visitor to a portal after they signed in.
  return NextResponse.redirect(url, 307);
}
