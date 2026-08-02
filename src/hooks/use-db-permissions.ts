"use client";

import { useQuery } from "@tanstack/react-query";

import { permissionQueries } from "@/lib/api/permissions";

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
// WHEN SIGNED OUT, callers keep the legacy answer. That mattered while most of
// the app was browsed without a session; every portal requires one now, so the
// case is unreachable from the UI. Returning `null` rather than an empty map is
// still what makes "no session" distinguishable from "denied" — an empty map
// would read as "you may do nothing" and hide every guarded control.
//
// None of this is enforcement. RLS refuses the row whatever the client thinks.
// This only decides which controls are worth drawing.
// ============================================================================

/**
 * The database's answer, or `null` when there is no session. Callers treat
 * `null` as "use the legacy path".
 *
 * NO HYDRATION GATE, AND THAT IS THE POINT.
 *
 * This used to withhold its answer until after hydration. It had to: the server
 * had no map, so SSR always rendered the legacy fallback — mock roster,
 * effectively OWNER defaults — and letting the client use the real map during
 * the hydration render would have made the two passes disagree for everyone who
 * is not that mock owner.
 *
 * The facility layout now resolves permissions on the SERVER and seeds this
 * exact cache entry (lib/api/permissions.ts, app/facility/layout.tsx), so both
 * passes read the same map. They agree by having the same data rather than by
 * both being wrong — and the first paint stops being owner-shaped UI that gets
 * replaced a frame later.
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
