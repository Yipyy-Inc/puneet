import type { AccessScope, PermissionKey } from "@/types/facility-staff";

// ============================================================================
// The viewer's permission map, as a query.
//
// Lives here rather than beside the hook because BOTH sides need it: the
// browser fetches it through `queryFn`, and the facility layout seeds the very
// same cache entry on the server from `my_permissions()` directly. Sharing one
// key is what makes the two agree — SSR renders the real map instead of an
// owner-shaped guess, and the hydration pass finds it already there.
//
// No "use client": a server component imports the key to seed it.
// ============================================================================

export type PermissionMap = Partial<Record<PermissionKey, AccessScope>>;

async function fetchPermissions(): Promise<PermissionMap | null> {
  const response = await fetch("/api/permissions");
  // Signed out — the caller falls back to the legacy client-side cascade.
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to load permissions (${response.status})`);
  }
  return (await response.json()) as PermissionMap;
}

export const permissionQueries = {
  mine: () => ({
    queryKey: ["permissions", "mine"] as const,
    queryFn: fetchPermissions,
    // Permissions change when an admin edits a role, not between renders.
    staleTime: 5 * 60_000,
  }),
};
