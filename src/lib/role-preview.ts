"use client";

import {
  ALL_PERMISSION_KEYS,
  ALWAYS_ON_PERMISSIONS,
  resolveAllPermissions,
  type CustomRolesById,
  type EffectivePermissions,
  type FacilityStaffRole,
  type RolePresetOverrides,
  type StaffProfile,
} from "@/types/facility-staff";
import { facilityStaff } from "@/data/facility-staff";

// ============================================================================
// Section 7 — "Preview as employee".
//
// Resolves a ROLE (preset or custom) to the permission map a staff member
// carrying it would have, then hands it to the /employee shell so the manager
// sees the portal exactly as that role does.
//
// The studio writes permission edits straight through the RBAC provider
// (setPresetPermission / setCustomRolePermission), so the provider's LIVE
// presetOverrides + customRoles already are the current grid state — the
// preview therefore reflects unsaved edits, not just the saved role.
// ============================================================================

const PREVIEW_STORAGE_KEY = "facility-role-preview-v1";

export interface RolePreviewPayload {
  /** Human label shown in the "Previewing as …" bar. */
  label: string;
  permissions: EffectivePermissions;
}

/** All-denied baseline plus the non-removable personal permissions. */
function alwaysOnBaseline(): EffectivePermissions {
  const map = Object.fromEntries(
    ALL_PERMISSION_KEYS.map((k) => [k, false]),
  ) as EffectivePermissions;
  for (const k of ALWAYS_ON_PERMISSIONS) map[k] = "anytime";
  return map;
}

/**
 * Resolve a PRESET role to its effective map, including any live overrides the
 * manager has made in the grid. Uses the real engine via a synthetic profile.
 */
export function resolvePresetRolePermissions(
  role: FacilityStaffRole,
  ctx: { customRoles: CustomRolesById; presetOverrides: RolePresetOverrides },
): EffectivePermissions {
  const template = facilityStaff[0];
  const synthetic: StaffProfile = {
    ...template,
    id: "__preview__",
    primaryRole: role,
    additionalRoles: [],
    customRoleIds: [],
    permissionOverrides: {},
  };
  return resolveAllPermissions(synthetic, ctx);
}

/**
 * Resolve a CUSTOM role to its effective map: always-on personal permissions
 * plus exactly what the custom role grants. (Deliberately NOT routed through a
 * synthetic primaryRole — every preset carries its own grants, which would
 * leak permissions the custom role never gave.)
 */
export function resolveCustomRolePermissions(
  roleId: string,
  customRoles: CustomRolesById,
): EffectivePermissions {
  const map = alwaysOnBaseline();
  const role = customRoles[roleId];
  if (!role) return map;
  for (const [key, scope] of Object.entries(role.permissions)) {
    if (scope) map[key as keyof EffectivePermissions] = scope;
  }
  return map;
}

/**
 * Stash a preview payload for the /employee tab to pick up.
 * localStorage (not sessionStorage) because the preview opens in a NEW TAB —
 * sessionStorage isn't shared across tabs, and a `noopener` window.open gets a
 * fresh one. "Exit preview" clears it.
 */
export function startRolePreview(payload: RolePreviewPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/**
 * Read the active preview payload, if any.
 *
 * The map is NORMALISED so it fails closed: consumers test `perms[k] !== false`,
 * so any key missing from a partial/stale payload would otherwise read as
 * GRANTED. Every key absent from the payload is pinned to `false` here.
 */
export function readRolePreview(): RolePreviewPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RolePreviewPayload;
    if (!parsed?.permissions) return null;
    const normalised = Object.fromEntries(
      ALL_PERMISSION_KEYS.map((k) => [k, parsed.permissions[k] ?? false]),
    ) as EffectivePermissions;
    return { label: parsed.label, permissions: normalised };
  } catch {
    return null;
  }
}

/** Clear the preview (the "Exit preview" action). */
export function endRolePreview(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
