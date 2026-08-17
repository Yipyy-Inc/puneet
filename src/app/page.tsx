import { redirect } from "next/navigation";

import { getViewer, landingPathFor } from "@/lib/auth/viewer";

// ============================================================================
// The front door. It resolves where you belong ONCE.
//
// It used to be `redirect("/dashboard")` unconditionally, which sent every
// visitor — pet owners included — into the platform super-admin portal and let
// that portal's gate bounce them back out. Measured on production, a signed-out
// visitor to yipyy.com paid for THREE full document loads to reach sign-in:
//
//   /                  200, 6.0 kB shell   -> client router to /dashboard
//   /dashboard         200, 7.0 kB shell   -> client router to /sign-in
//   /sign-in?next=...  200, 8.5 kB
//
// plus a separate set of JS chunks for each. This resolves the session here and
// names the destination directly, so the /dashboard hop is gone.
//
// ── WHY THESE ARE 200s AND NOT 307s ───────────────────────────────────────
//
// `redirect()` here is a SOFT redirect for the same reason it is in the portal
// gates (see the long note in src/lib/auth/viewer.ts): the root layout streams,
// so headers are already sent and Next answers 200 with a NEXT_REDIRECT in the
// RSC payload for the client router to act on. Removing the remaining hop would
// mean deciding in src/proxy.ts instead — and that file deliberately holds no
// session logic and runs at the edge on every request. Trading a cheap query
// here for a database round trip on every asset request is the wrong swap, so
// this stops at two hops rather than one.
//
// ── COST FOR THE COMMON CASE ──────────────────────────────────────────────
//
// A signed-out visitor is the common case at this URL and pays nothing extra:
// `getViewer()` calls `withAuth()`, finds no session, and returns ANONYMOUS
// without touching Postgres. Only a signed-in visitor pays the two RLS-scoped
// reads, and that is the request that would otherwise have loaded an entire
// portal shell it had no right to see.
//
// `landingPathFor` is the same helper the portal gates use, so the front door
// and the gates cannot disagree about where somebody belongs.
// ============================================================================

export default async function Home() {
  const viewer = await getViewer();

  // `source`, not `userId !== null` — the gates read the same field, and it is
  // what shows up in logs.
  if (viewer.source === "anonymous") redirect("/sign-in");

  redirect(landingPathFor(viewer));
}
