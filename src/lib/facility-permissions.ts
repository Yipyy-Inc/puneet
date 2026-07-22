// ============================================================================
// Facility permissions — thin readability aliases over the RBAC engine (8A/8C)
//
// This file adds NO new permission logic and NO parallel resolver. The single
// source of truth is the FacilityRbacProvider in `@/hooks/use-facility-rbac`
// and its resolver in `@/types/facility-staff` (resolvePermission /
// resolveAllPermissions). Everything here just re-shapes what those already
// expose:
//   • can(key) / usePermission(key)      → boolean
//   • useCan(key) / resolveFor(staff,k)  → AccessScope | false
//   • useEffectivePermissions()          → the full effective map
//
// Do not add a competing util. If you need a new decision, add it to the engine.
// ============================================================================

import type { AccessScope, PermissionKey } from "@/types/facility-staff";
import { useCan, useFacilityViewer } from "@/hooks/use-facility-rbac";

/**
 * The three UI buckets from spec 8A. A scope carries *when* access applies;
 * most screens only need to branch three ways: full access, shift-limited
 * access, or none.
 */
export type PermissionBucket = "granted" | "assigned_only" | "not_granted";

/**
 * Collapse an {@link AccessScope} — or the `false` that `useCan` / `resolveFor`
 * return when a permission isn't granted — into the three 8A buckets:
 *   • `anytime` | `operating_hours` → "granted"
 *   • `assigned_shifts`             → "assigned_only"
 *   • `none` | `false`             → "not_granted"
 *
 * Pure and hook-free on purpose, so non-React callers (e.g. the future
 * `/api/employee/me/permissions` route handler, see below) can map a resolved
 * scope with the same rule the UI uses. Feed it the output of `useCan(key)` or
 * `resolveFor(staff, key).scope`.
 */
export function permissionCheck(scope: AccessScope | false): PermissionBucket {
  if (scope === false || scope === "none") return "not_granted";
  if (scope === "assigned_shifts") return "assigned_only";
  return "granted"; // anytime | operating_hours
}

/**
 * Render-time ergonomic alias: `usePermissionCheck("view_bookings")` →
 * "granted" | "assigned_only" | "not_granted". A one-line composition of
 * `useCan(key)` + {@link permissionCheck} — it makes no independent permission
 * decision. (Kept `use`-prefixed so rules-of-hooks stays satisfied; the bare
 * `permissionCheck` mapper above is for values you already resolved.)
 */
export function usePermissionCheck(key: PermissionKey): PermissionBucket {
  return permissionCheck(useCan(key));
}

/**
 * Section 8B — data-layer scoping. When `key` resolves to the assigned_only
 * scope (`assigned_shifts`), returns the acting viewer's staff id so a query
 * factory / data helper can restrict results to that viewer's ASSIGNED records.
 * Returns `undefined` for full-access scopes (anytime / operating_hours) — the
 * factory then returns the unscoped set, exactly as admin sees it (and outside
 * the RBAC provider useCan falls back to "anytime", so admin is never scoped).
 *
 * `not_granted` never reaches here — that case is handled upstream by
 * RequirePermission → AccessRestricted. Pass the returned id into the SAME
 * factory the admin uses (e.g. `bookingQueries.all({ assignedStaffId: scope })`);
 * a scoped record fetched by URL that isn't in the viewer's set is a 403.
 */
export function useAssignedScope(key: PermissionKey): string | undefined {
  const scope = useCan(key);
  const { viewer } = useFacilityViewer();
  return scope === "assigned_shifts" ? viewer.id : undefined;
}

// ============================================================================
// Spec 8C — "GET /api/employee/me/permissions"
//
// In this mock-driven prototype there is no backend, so the endpoint's role is
// played by the provider hook: on session start the FacilityRbacProvider seeds
// the acting viewer from the `employee_staff_id` cookie and resolves the full
// map, which every screen reads via:
//
//     const permissions = useEffectivePermissions(); // === the 8C payload
//
// THE HOOK IS THE ENDPOINT here. It is deliberately shaped so a real fetch can
// back it later without touching call sites: `useEffectivePermissions()`
// already returns exactly `EffectivePermissions` (the JSON body the route would
// send), so swapping its body from the in-memory resolver to
// `useQuery({ queryKey: ["employee","me","permissions"], queryFn: () =>
// fetch("/api/employee/me/permissions").then(r => r.json()) })` is a
// one-function change — the map shape and all consumers stay identical.
//
// "Fetched fresh each session; manager edits appear on refresh" holds today:
// the provider re-resolves from the current mock stores on mount, and
// `useEffectivePermissions()` is memoized on `viewer.id` + the resolver's deps
// (preset / staff / custom-role overrides), so it re-runs whenever the acting
// viewer changes OR a manager's override edit lands — no stale snapshot. On a
// fresh employee session the provider re-reads those overrides (persisted by
// the facility portal) from localStorage, so manager changes are reflected on
// the employee's next load, exactly as a real per-session fetch would behave.
// ============================================================================
