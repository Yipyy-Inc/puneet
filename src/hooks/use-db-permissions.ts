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

/**
 * Whether the database has actually ANSWERED the permission question.
 *
 * ── WHY THIS EXISTS SEPARATELY FROM THE MAP ───────────────────────────────
 *
 * `useDbPermissions()` collapses three different situations into one `null`:
 * no session, the query still in flight, and the query having failed. That is
 * the right shape for the question it answers — "which controls are worth
 * drawing" — because all three mean the same thing there: fall back.
 *
 * It is the wrong shape for REFUSING. A refusal has to distinguish "you may
 * not open this" from "we could not find out", and on a `null` those are
 * identical. The settings shell said so in its own header and redirected
 * instead of refusing for exactly that reason: refusing on an RPC failure
 * would lock an owner out of their own settings on one bad round trip.
 *
 * So this reports the query's own status rather than its data. True only when
 * a fetch has succeeded AND returned a map — the one state in which a denial
 * is the database's answer rather than the absence of one.
 *
 * `useQuery` on the same key as `useDbPermissions` is one request, not two:
 * react-query dedupes by key, and the facility layout has already seeded this
 * cache entry on the server, so in practice this is true on the first render.
 */
export function usePermissionsResolved(): boolean {
  const { isSuccess, data } = useQuery(permissionQueries.mine());
  return isSuccess && Boolean(data);
}
