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
  resolvePermission,
  type AccessScope,
  type CustomFacilityRole,
  type CustomRolesById,
  type FacilityStaffRole,
  type PermissionKey,
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

interface RbacState {
  viewerId: string;
  presetOverrides: RolePresetOverrides;
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
}

const STORAGE_KEY = "facility-rbac-state-v1";

const DEFAULT_STATE: RbacState = {
  // Default to the owner profile so everything is visible out of the box.
  viewerId: "fs-owner-01",
  presetOverrides: {},
};

// Custom roles now live in the TanStack Query cache (see @/lib/api/roles); a
// stable empty map keeps memoized values referentially stable while loading.
const EMPTY_CUSTOM_ROLES: CustomRolesById = {};

const RbacContext = createContext<RbacContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function FacilityRbacProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RbacState>(DEFAULT_STATE);
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
          viewerId: parsed.viewerId ?? prev.viewerId,
          presetOverrides: parsed.presetOverrides ?? prev.presetOverrides,
        }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

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

  const resolveFor = useCallback(
    (staff: StaffProfile, key: PermissionKey) =>
      resolvePermission(staff, key, {
        customRoles,
        presetOverrides: state.presetOverrides,
      }),
    [customRoles, state.presetOverrides],
  );

  const can = useCallback(
    (key: PermissionKey) => resolveFor(viewer, key).granted,
    [viewer, resolveFor],
  );

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
      createCustomRole,
      updateCustomRole,
      deleteCustomRole,
      setCustomRolePermission,
      setPresetPermission,
      resetPresetRole,
      resetAllPresets,
    }),
    [
      viewer,
      state.viewerId,
      customRoles,
      state.presetOverrides,
      setViewerId,
      can,
      resolveFor,
      createCustomRole,
      updateCustomRole,
      deleteCustomRole,
      setCustomRolePermission,
      setPresetPermission,
      resetPresetRole,
      resetAllPresets,
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
      createCustomRole: () => {
        throw new Error("FacilityRbacProvider missing");
      },
      updateCustomRole: () => {},
      deleteCustomRole: () => {},
      setCustomRolePermission: () => {},
      setPresetPermission: () => {},
      resetPresetRole: () => {},
      resetAllPresets: () => {},
    };
  }
  return ctx;
}

export function useFacilityViewer() {
  const { viewer, viewerId, setViewerId, can } = useFacilityRbac();
  return { viewer, viewerId, setViewerId, can };
}
