import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import type { AccessScope, PermissionKey } from "@/types/facility-staff";

// ============================================================================
// The caller's permissions, on the SERVER, from the database.
//
// /api/permissions already hands this map to the browser so it can draw the
// right controls. This is the same map resolved server-side, where it can
// decide what leaves the building rather than what gets rendered.
//
// The distinction matters for route handlers: RLS gates ROWS, not COLUMNS. It
// can say "you may read your colleague" — which is correct, rotas need it —
// but it cannot say "and not the salary column". Anything column-level has to
// be enforced above it, which means here.
// ============================================================================

export type PermissionMap = Partial<Record<PermissionKey, AccessScope>>;

/**
 * Every permission the database grants the caller, keyed by permission.
 *
 * `my_permissions()` returns a row for EVERY key, using the scope `'none'` to
 * mean "not granted" — so a missing key means the RPC failed or there is no
 * session, and an explicit `'none'` means denied. Both read as "no" through
 * `holds`, which is what callers want; the difference only matters if you are
 * debugging why a map is empty.
 */
export async function myPermissions(): Promise<PermissionMap> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("my_permissions");
  if (error || !data) return {};

  const map: PermissionMap = {};
  for (const row of data) {
    map[row.permission_key as PermissionKey] = row.scope;
  }
  return map;
}

/**
 * Whether the caller holds `key` at all.
 *
 * Deliberately ignores WHICH scope. Scope answers "over whose records" —
 * assigned shifts, operating hours, anytime — and the row-level part of that
 * is RLS's job. Here the question is only whether a column may be seen, so any
 * scope other than 'none' is a yes.
 */
export function holds(map: PermissionMap, key: PermissionKey): boolean {
  const scope = map[key];
  return scope != null && scope !== "none";
}
