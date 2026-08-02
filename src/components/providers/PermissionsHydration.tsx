import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

import { myPermissions } from "@/lib/auth/permissions";
import { permissionQueries } from "@/lib/api/permissions";

// ============================================================================
// Hands the server's answer to the client before it renders.
//
// The server holds the session, so it can call `my_permissions()` directly —
// no HTTP hop, no waiting. Seeding the same cache entry the browser would have
// fetched means SSR renders the REAL permission map instead of the legacy
// fallback, and the hydration pass finds it already there.
//
// That closes two things at once:
//
//   • The flash. Every non-owner used to get a first paint resolved from the
//     mock roster — owner defaults — swapped a frame later for their own,
//     narrower set. Controls appeared and then vanished.
//
//   • The mismatch it forced. use-db-permissions had to withhold its answer
//     until after hydration, purely so the two passes would agree. They now
//     agree by having the same data.
//
// Signed out seeds `null`, which is what /api/permissions would have returned
// (401 -> null), so the legacy path still runs for the signed-out browsing that
// is most of the app until AUTH_ENFORCED flips.
//
// A FRESH QueryClient PER REQUEST is not optional. Reuse one across requests
// and one visitor's permission map is served to the next.
// ============================================================================

export async function PermissionsHydration({
  children,
}: {
  children: React.ReactNode;
}) {
  const map = await myPermissions().catch(() => null);

  const queryClient = new QueryClient();
  // setQueryData, not prefetchQuery: the queryFn is a browser `fetch` of a
  // relative URL, which has no meaning here. The value is already in hand.
  queryClient.setQueryData(
    permissionQueries.mine().queryKey,
    // An empty map means the RPC failed or there is no session. Both are "we
    // do not know", which is `null` — seeding `{}` would claim every
    // permission is denied and blank the UI for signed-out visitors.
    map && Object.keys(map).length > 0 ? map : null,
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
