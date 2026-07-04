// Server-readable facility STAFF role, used by route guards.
//
// The facility portal's coarse auth uses the `user_role` cookie (facility_admin
// vs platform) — see src/app/facility/layout.tsx. This finer-grained cookie
// carries the acting facility staff role (owner / manager / staff / …) so server
// components can gate owner-only areas (the Yipyy Agreements documents) WITHOUT
// relying on client-side UI hiding. It is written by the RBAC provider from the
// active viewer; when absent it defaults to owner (the app's default viewer).
//
// This module is server-safe: `setFacilityRoleCookie` only touches `document`
// inside its body, so importing it from a server component is fine.

import type { FacilityStaffRole } from "@/types/facility-staff";

export const FACILITY_ROLE_COOKIE = "facility_role";

/**
 * Only the primary Facility Owner may access Yipyy agreement documents. An unset
 * cookie defaults to owner (matches the default viewer); any set role must be
 * exactly "owner".
 */
export function isFacilityOwnerRole(role: string | undefined | null): boolean {
  return role == null || role === "owner";
}

/** Client-only: mirror the active viewer's role into the server-readable cookie. */
export function setFacilityRoleCookie(role: FacilityStaffRole): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `${FACILITY_ROLE_COOKIE}=${role}; path=/; max-age=${maxAge}; samesite=lax`;
}
