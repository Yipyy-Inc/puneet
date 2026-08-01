"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  AccessScope,
  EffectivePermissions,
  PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// The viewer's permissions, as the database resolves them.
//
// This is the seam that lets the client stop being the authority on what it
// may do. The provider in use-facility-rbac.tsx computes the same cascade from
// a mock staff array plus overrides in localStorage — editable from devtools,
// and a second implementation of rules that already exist in SQL.
//
// WHILE IT LOADS, AND WHEN SIGNED OUT, callers keep the legacy answer. That is
// deliberate: switching hard would blank guarded UI for anyone browsing
// signed-out, which is most of the app until AUTH_ENFORCED flips. Returning
// `null` rather than an empty map is what makes "not known yet" distinguishable
// from "denied" — an empty map would read as "you may do nothing" and hide
// every guarded control for a frame.
//
// None of this is enforcement. RLS refuses the row whatever the client thinks.
// This only decides which controls are worth drawing.
// ============================================================================

type PermissionMap = Partial<Record<PermissionKey, AccessScope>>;

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

/**
 * The database's answer, or `null` when there is no session / it has not
 * arrived yet. Callers treat `null` as "use the legacy path".
 */
export function useDbPermissions(): EffectivePermissions | null {
  const { data } = useQuery(permissionQueries.mine());
  if (!data) return null;

  // 'none' is how the database says "not granted"; the client type says
  // `false`. Translated here so no consumer has to know both spellings.
  const out = {} as EffectivePermissions;
  for (const [key, scope] of Object.entries(data)) {
    out[key as PermissionKey] =
      scope === "none" ? false : (scope as AccessScope);
  }
  return out;
}
