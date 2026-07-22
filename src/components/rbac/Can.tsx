"use client";

import type { ReactNode } from "react";
import type { PermissionKey } from "@/types/facility-staff";
import { usePermission } from "@/hooks/use-facility-rbac";

// ============================================================================
// Section 3B / Table 4 — the shared action gate
//
// Wrap an action control (button, menu item, notes field, payment section…) so
// it renders only when the acting viewer has the permission — i.e.
// `usePermission(permKey)` is true, which holds for BOTH granted and
// assigned_only scopes (only not_granted is false).
//
// These gates live in the components ADMIN and EMPLOYEE share. Outside the
// FacilityRbacProvider (most admin routes) usePermission falls back to
// all-access, so admin keeps every control; the employee portal, wrapped by the
// provider, gets real per-viewer gating. One implementation, both portals.
//
// For the "only on the viewer's own records when assigned_only" nuance
// (e.g. perform_grooming on a groomer's own cards), read the scope directly with
// useCan(key) at the call site instead of this all-or-nothing wrapper.
// ============================================================================

export function Can({
  permKey,
  children,
  fallback = null,
}: {
  permKey: PermissionKey;
  /** Rendered when the viewer HAS the permission. */
  children: ReactNode;
  /** Rendered when they don't. Defaults to nothing (control omitted). */
  fallback?: ReactNode;
}) {
  return usePermission(permKey) ? <>{children}</> : <>{fallback}</>;
}
