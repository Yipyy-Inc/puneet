"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ALL_PERMISSION_KEYS,
  resolveAllPermissions,
  resolvePermission,
  type AccessScope,
  type CustomFacilityRole,
  type CustomRolesById,
  type EffectivePermissions,
  type FacilityStaffRole,
  type PermissionKey,
  type PermissionSetting,
  type RolePresetOverrides,
  type StaffProfile,
} from "@/types/facility-staff";
import { facilityStaff } from "@/data/facility-staff";
import { setFacilityRoleCookie } from "@/lib/facility-role";
import {
  roleQueries,
  useCreateCustomRole,
  useDeleteCustomRole,
  useSetCustomRolePermission,
  useUpdateCustomRole,
} from "@/lib/api/roles";

// ============================================================================
// Types
// ============================================================================

/** Per-staff permission overrides layered over the profile's baked seed. */
type StaffOverrides = Record<
  string,
  Partial<Record<PermissionKey, PermissionSetting>>
>;

interface RbacState {
  viewerId: string;
  presetOverrides: RolePresetOverrides;
  staffOverrides: StaffOverrides;
}

interface RbacContextValue {
  viewer: StaffProfile;
  viewerId: string;
  setViewerId: (id: string) => void;
  /** All custom roles, keyed by id. */
  customRoles: CustomRolesById;
  /** Preset permission overrides, keyed by role then permission. */
  presetOverrides: RolePresetOverrides;
  /** Check whether the current viewer has a permission (with any scope). */
  can: (key: PermissionKey) => boolean;
  /** Resolve a single permission for any staff member. */
  resolveFor: (
    staff: StaffProfile,
    key: PermissionKey,
  ) => { granted: boolean; scope: AccessScope };
  /**
   * Resolve the FULL effective permission map for a staff member by id — the
   * one resolver every guard / sidebar / mask ultimately calls. Missing staff
   * resolve to an all-denied map.
   */
  resolvePermissions: (staffId: string) => EffectivePermissions;
  /** Custom role CRUD. */
  createCustomRole: (
    role: Omit<CustomFacilityRole, "id" | "createdAt">,
  ) => CustomFacilityRole;
  updateCustomRole: (id: string, patch: Partial<CustomFacilityRole>) => void;
  deleteCustomRole: (id: string) => void;
  setCustomRolePermission: (
    id: string,
    key: PermissionKey,
    scope: AccessScope | null,
  ) => void;
  /** Preset-role overrides. `scope = null` → reset to preset default. */
  setPresetPermission: (
    role: FacilityStaffRole,
    key: PermissionKey,
    scope: AccessScope | "revoked" | null,
  ) => void;
  resetPresetRole: (role: FacilityStaffRole) => void;
  resetAllPresets: () => void;
  /**
   * A staff member's effective override map — the provider's edited overrides if
   * any exist for that staff, else the profile's baked `permissionOverrides`.
   */
  staffOverridesFor: (
    staffId: string,
  ) => Partial<Record<PermissionKey, PermissionSetting>>;
  /**
   * Set one per-staff override. `setting = null` clears the key (inherit the
   * role default); a PermissionSetting GRANTs or REVOKEs it.
   */
  setStaffPermission: (
    staffId: string,
    key: PermissionKey,
    setting: PermissionSetting | null,
  ) => void;
  /** Clear all of a staff member's overrides → inherit the role defaults. */
  resetStaffOverrides: (staffId: string) => void;
}

const STORAGE_KEY = "facility-rbac-state-v1";

const DEFAULT_STATE: RbacState = {
  // Default to the owner profile so everything is visible out of the box.
  viewerId: "fs-owner-01",
  presetOverrides: {},
  staffOverrides: {},
};

// Custom roles now live in the TanStack Query cache (see @/lib/api/roles); a
// stable empty map keeps memoized values referentially stable while loading.
const EMPTY_CUSTOM_ROLES: CustomRolesById = {};

const RbacContext = createContext<RbacContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function FacilityRbacProvider({
  children,
  /**
   * Fixes the acting viewer to a specific staff id — used by the /employee
   * portal, where the signed-in employee (the `employee_staff_id` cookie) is
   * authoritative. When set, this always wins over any stored "viewing as" id
   * and the provider does not persist to the shared localStorage key. Omit it
   * (the facility staff layout does) to keep the switchable, persisted viewer.
   */
  initialViewerId,
  previewPermissions,
}: {
  children: ReactNode;
  initialViewerId?: string;
  /**
   * Section 7 — "Preview as employee". When set, EVERY permission decision in
   * the tree resolves from this map instead of a real staff profile, so the
   * portal renders exactly as a staff member carrying this role's resolved
   * permissions would see it (same nav, same modules, same scoped data).
   */
  previewPermissions?: EffectivePermissions | null;
}) {
  const [state, setState] = useState<RbacState>(
    initialViewerId
      ? { ...DEFAULT_STATE, viewerId: initialViewerId }
      : DEFAULT_STATE,
  );
  const [hydrated, setHydrated] = useState(false);

  // Custom roles are read through the roles query layer; their writes go through
  // the mutations below. viewerId + presetOverrides stay local to this provider.
  const { data: customRolesData } = useQuery(roleQueries.customRoles());
  const customRoles = customRolesData ?? EMPTY_CUSTOM_ROLES;

  const { mutate: createRoleMutate } = useCreateCustomRole();
  const { mutate: updateRoleMutate } = useUpdateCustomRole();
  const { mutate: deleteRoleMutate } = useDeleteCustomRole();
  const { mutate: setRolePermissionMutate } = useSetCustomRolePermission();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Older blobs may still carry a `customRoles` field — it now lives in
        // the query store, so only pull the fields this provider still owns.
        const parsed = JSON.parse(raw) as Partial<RbacState>;
        setState((prev) => ({
          // In fixed-viewer (employee) mode the identity comes from the session
          // cookie — never let a stored "viewing as" id override it.
          viewerId: initialViewerId ?? parsed.viewerId ?? prev.viewerId,
          presetOverrides: parsed.presetOverrides ?? prev.presetOverrides,
          staffOverrides: parsed.staffOverrides ?? prev.staffOverrides,
        }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [initialViewerId]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    // Don't write the employee portal's cookie-driven viewer back into the
    // shared key (it would bleed into the facility "viewing as" switcher).
    if (initialViewerId) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated, initialViewerId]);

  const viewer = useMemo<StaffProfile>(() => {
    return (
      facilityStaff.find((s) => s.id === state.viewerId) ?? facilityStaff[0]
    );
  }, [state.viewerId]);

  // Mirror the active viewer's role into a server-readable cookie so server-side
  // route guards (e.g. the owner-only Documents / Yipyy Agreements area) can
  // enforce access — not just hide it in the UI.
  useEffect(() => {
    if (!hydrated) return;
    setFacilityRoleCookie(viewer.primaryRole);
  }, [viewer.primaryRole, hydrated]);

  // A staff member's effective override map: the provider's edited overrides if
  // an entry exists, otherwise the profile's baked seed.
  const staffOverridesFor = useCallback(
    (staffId: string): Partial<Record<PermissionKey, PermissionSetting>> => {
      const edited = state.staffOverrides[staffId];
      if (edited) return edited;
      return (
        facilityStaff.find((s) => s.id === staffId)?.permissionOverrides ?? {}
      );
    },
    [state.staffOverrides],
  );

  // Overlay the provider's per-staff overrides onto the profile before resolving
  // so guards/sidebar/masks reflect per-staff edits, not just the baked seed.
  const withOverrides = useCallback(
    (staff: StaffProfile): StaffProfile => ({
      ...staff,
      permissionOverrides: staffOverridesFor(staff.id),
    }),
    [staffOverridesFor],
  );

  const resolveFor = useCallback(
    (staff: StaffProfile, key: PermissionKey) => {
      // Section 7: in preview mode every decision comes from the previewed
      // role's resolved map, not the acting profile.
      if (previewPermissions) {
        const scope = previewPermissions[key];
        return scope === false
          ? { granted: false, scope: "none" as AccessScope }
          : { granted: true, scope };
      }
      return resolvePermission(withOverrides(staff), key, {
        customRoles,
        presetOverrides: state.presetOverrides,
      });
    },
    [customRoles, state.presetOverrides, withOverrides, previewPermissions],
  );

  const can = useCallback(
    (key: PermissionKey) => resolveFor(viewer, key).granted,
    [viewer, resolveFor],
  );

  // TODO: move to server/JWT — resolve against the mock stores for now.
  const resolvePermissions = useCallback(
    (staffId: string): EffectivePermissions => {
      // Section 7: preview short-circuits — the whole tree sees the role's map.
      if (previewPermissions) return previewPermissions;
      const staff = facilityStaff.find((s) => s.id === staffId);
      if (!staff) {
        return Object.fromEntries(
          ALL_PERMISSION_KEYS.map((k) => [k, false]),
        ) as EffectivePermissions;
      }
      return resolveAllPermissions(withOverrides(staff), {
        customRoles,
        presetOverrides: state.presetOverrides,
      });
    },
    [customRoles, state.presetOverrides, withOverrides, previewPermissions],
  );

  const setStaffPermission = useCallback(
    (
      staffId: string,
      key: PermissionKey,
      setting: PermissionSetting | null,
    ) => {
      setState((prev) => {
        // Seed a fresh entry from the profile's baked overrides so edits build
        // on top of any pre-existing seed rather than wiping it.
        const base =
          prev.staffOverrides[staffId] ??
          facilityStaff.find((s) => s.id === staffId)?.permissionOverrides ??
          {};
        const current = { ...base };
        if (setting === null) {
          delete current[key];
        } else {
          current[key] = setting;
        }
        return {
          ...prev,
          staffOverrides: { ...prev.staffOverrides, [staffId]: current },
        };
      });
    },
    [],
  );

  const resetStaffOverrides = useCallback((staffId: string) => {
    setState((prev) => ({
      ...prev,
      staffOverrides: { ...prev.staffOverrides, [staffId]: {} },
    }));
  }, []);

  const createCustomRole = useCallback(
    (
      role: Omit<CustomFacilityRole, "id" | "createdAt">,
    ): CustomFacilityRole => {
      // Build the full role here so callers can select it synchronously; the
      // mutation persists it and optimistically updates the query cache.
      const id = `custom-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const full: CustomFacilityRole = {
        ...role,
        id,
        createdAt: new Date().toISOString(),
      };
      createRoleMutate(full);
      return full;
    },
    [createRoleMutate],
  );

  const updateCustomRole = useCallback(
    (id: string, patch: Partial<CustomFacilityRole>) => {
      updateRoleMutate({ id, patch });
    },
    [updateRoleMutate],
  );

  const deleteCustomRole = useCallback(
    (id: string) => {
      deleteRoleMutate(id);
    },
    [deleteRoleMutate],
  );

  const setCustomRolePermission = useCallback(
    (id: string, key: PermissionKey, scope: AccessScope | null) => {
      setRolePermissionMutate({ id, key, scope });
    },
    [setRolePermissionMutate],
  );

  const setPresetPermission = useCallback(
    (
      role: FacilityStaffRole,
      key: PermissionKey,
      scope: AccessScope | "revoked" | null,
    ) => {
      setState((prev) => {
        const current = { ...(prev.presetOverrides[role] ?? {}) };
        if (scope === null) {
          delete current[key];
        } else {
          current[key] = scope;
        }
        const nextOverrides = { ...prev.presetOverrides };
        if (Object.keys(current).length === 0) {
          delete nextOverrides[role];
        } else {
          nextOverrides[role] = current;
        }
        return { ...prev, presetOverrides: nextOverrides };
      });
    },
    [],
  );

  const resetPresetRole = useCallback((role: FacilityStaffRole) => {
    setState((prev) => {
      const next = { ...prev.presetOverrides };
      delete next[role];
      return { ...prev, presetOverrides: next };
    });
  }, []);

  const resetAllPresets = useCallback(() => {
    setState((prev) => ({ ...prev, presetOverrides: {} }));
  }, []);

  const setViewerId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, viewerId: id }));
  }, []);

  const value = useMemo<RbacContextValue>(
    () => ({
      viewer,
      viewerId: state.viewerId,
      setViewerId,
      customRoles,
      presetOverrides: state.presetOverrides,
      can,
      resolveFor,
      resolvePermissions,
      createCustomRole,
      updateCustomRole,
      deleteCustomRole,
      setCustomRolePermission,
      setPresetPermission,
      resetPresetRole,
      resetAllPresets,
      staffOverridesFor,
      setStaffPermission,
      resetStaffOverrides,
    }),
    [
      viewer,
      state.viewerId,
      customRoles,
      state.presetOverrides,
      setViewerId,
      can,
      resolveFor,
      resolvePermissions,
      createCustomRole,
      updateCustomRole,
      deleteCustomRole,
      setCustomRolePermission,
      setPresetPermission,
      resetPresetRole,
      resetAllPresets,
      staffOverridesFor,
      setStaffPermission,
      resetStaffOverrides,
    ],
  );

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

export function useFacilityRbac(): RbacContextValue {
  const ctx = useContext(RbacContext);
  if (!ctx) {
    // Fallback — assume owner/all-access. Used when a component renders outside
    // the provider tree (e.g. Storybook or tests).
    const owner =
      facilityStaff.find((s) => s.primaryRole === "owner") ?? facilityStaff[0];
    return {
      viewer: owner,
      viewerId: owner.id,
      setViewerId: () => {},
      customRoles: {},
      presetOverrides: {},
      can: () => true,
      resolveFor: (staff, key) =>
        resolvePermission(staff, key, {
          customRoles: {},
          presetOverrides: {},
        }),
      resolvePermissions: () => resolveAllPermissions(owner, {}),
      createCustomRole: () => {
        throw new Error("FacilityRbacProvider missing");
      },
      updateCustomRole: () => {},
      deleteCustomRole: () => {},
      setCustomRolePermission: () => {},
      setPresetPermission: () => {},
      resetPresetRole: () => {},
      resetAllPresets: () => {},
      staffOverridesFor: (staffId) =>
        facilityStaff.find((s) => s.id === staffId)?.permissionOverrides ?? {},
      setStaffPermission: () => {},
      resetStaffOverrides: () => {},
    };
  }
  return ctx;
}

export function useFacilityViewer() {
  const { viewer, viewerId, setViewerId, can } = useFacilityRbac();
  return { viewer, viewerId, setViewerId, can };
}

/**
 * The full effective permission map for the acting viewer. Guards, the dynamic
 * sidebar, and field-masking read from this single source of truth.
 */
export function useEffectivePermissions(): EffectivePermissions {
  const { viewer, resolvePermissions } = useFacilityRbac();
  return useMemo(
    () => resolvePermissions(viewer.id),
    [resolvePermissions, viewer.id],
  );
}

/**
 * Does the acting viewer have `key` (with any scope)? The ergonomic check every
 * guard/sidebar/mask should call. Delegates to the provider's single resolver.
 */
export function usePermission(key: PermissionKey): boolean {
  const { can } = useFacilityRbac();
  return can(key);
}

/**
 * The acting viewer's effective ACCESS SCOPE for `key` — the granted
 * {@link AccessScope} (e.g. "assigned_shifts") or `false` when not granted.
 * Use when a caller needs the scope, not just a yes/no.
 */
export function useCan(key: PermissionKey): AccessScope | false {
  const { viewer, resolveFor } = useFacilityRbac();
  const { granted, scope } = resolveFor(viewer, key);
  return granted ? scope : false;
}
