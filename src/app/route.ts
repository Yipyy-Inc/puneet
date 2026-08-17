import { NextResponse, type NextRequest } from "next/server";

import { getViewer, landingPathFor } from "@/lib/auth/viewer";

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
  const destination =
    viewer.source === "anonymous" ? "/sign-in" : landingPathFor(viewer);

  // `nextUrl.clone()` rather than `new URL(dest, request.url)`: it carries the
  // origin Next itself resolved, which is what keeps this pointing at
  // www.yipyy.com behind Vercel's proxy instead of at the deployment hostname.
  // The query is cleared because `/` takes none and forwarding an arbitrary one
  // into a portal is a surprise nobody asked for.
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = "";

  // 307 rather than 308: this is a decision about the current session, not a
  // permanent fact about the URL, and a browser that cached a 308 would keep
  // sending a signed-out visitor to a portal after they signed in.
  return NextResponse.redirect(url, 307);
}
