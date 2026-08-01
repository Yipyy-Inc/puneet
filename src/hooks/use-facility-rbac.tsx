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
import { useDbPermissions } from "@/hooks/use-db-permissions";
import {
  roleQueries,
  useCreateCustomRole,
  useDeleteCustomRole,
  useSetCustomRolePermission,
  useSetFacilityRolePermission,
  useSetStaffPermission,
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
  // the mutations below. viewerId stays local to this provider.
  const { data: customRolesData } = useQuery(roleQueries.customRoles());
  const customRoles = customRolesData?.roles ?? EMPTY_CUSTOM_ROLES;
  const customAssignments = customRolesData?.assignments;

  // The two DB-backed layers of the cascade. `undefined` while loading and
  // `null` when signed out; in both cases the local state below is what the UI
  // shows, for the same reason use-db-permissions falls back — most of the app
  // is still browsed signed-out until AUTH_ENFORCED flips, and blanking the
  // editor would look like a bug rather than a sign-in prompt.
  const { data: dbOverrides } = useQuery(roleQueries.overrides());

  const { mutate: createRoleMutate } = useCreateCustomRole();
  const { mutate: updateRoleMutate } = useUpdateCustomRole();
  const { mutate: deleteRoleMutate } = useDeleteCustomRole();
  const { mutate: setRolePermissionMutate } = useSetCustomRolePermission();
  const { mutate: setFacilityRolePermissionMutate } =
    useSetFacilityRolePermission();
  const { mutate: setStaffPermissionMutate } = useSetStaffPermission();

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

  // What a role means at this facility. The database's answer wins when there
  // is one, because that is what RLS will enforce; the local blob is only the
  // signed-out fallback.
  const presetOverrides = dbOverrides?.facilityRoles ?? state.presetOverrides;

  // A staff member's effective override map, most authoritative first: the
  // database, then this browser's edits, then the profile's baked seed.
  const staffOverridesFor = useCallback(
    (staffId: string): Partial<Record<PermissionKey, PermissionSetting>> => {
      const stored = dbOverrides?.staff[staffId];
      if (stored) return stored;
      // Deliberately NOT consulted once the database has answered: a stale
      // local edit that Postgres does not know about must not resurface as
      // though it were in force.
      const edited = dbOverrides ? undefined : state.staffOverrides[staffId];
      if (edited) return edited;
      return (
        facilityStaff.find((s) => s.id === staffId)?.permissionOverrides ?? {}
      );
    },
    [dbOverrides, state.staffOverrides],
  );

  // Overlay the provider's per-staff overrides onto the profile before resolving
  // so guards/sidebar/masks reflect per-staff edits, not just the baked seed.
  //
  // Custom-role assignments are overlaid the same way and for the same reason:
  // once the database has answered, staff_custom_roles is who actually holds a
  // role. The mock profile's own customRoleIds is a seed, and showing it while
  // Postgres says otherwise is the bug this whole change is about.
  const withOverrides = useCallback(
    (staff: StaffProfile): StaffProfile => ({
      ...staff,
      permissionOverrides: staffOverridesFor(staff.id),
      customRoleIds: customAssignments
        ? (customAssignments[staff.id] ?? [])
        : staff.customRoleIds,
    }),
    [staffOverridesFor, customAssignments],
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
        presetOverrides,
      });
    },
    [customRoles, presetOverrides, withOverrides, previewPermissions],
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
        presetOverrides,
      });
    },
    [customRoles, presetOverrides, withOverrides, previewPermissions],
  );

  const setStaffPermission = useCallback(
    (
      staffId: string,
      key: PermissionKey,
      setting: PermissionSetting | null,
    ) => {
      // Postgres is where this has to land — staff_permissions is layer 3 of
      // the cascade RLS evaluates. The local edit below is what the editor
      // shows while signed out.
      setStaffPermissionMutate({ staffId, key, setting });

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
    [setStaffPermissionMutate],
  );

  const resetStaffOverrides = useCallback(
    (staffId: string) => {
      // Only the keys the database actually holds — the baked mock seed has no
      // row to delete, and issuing deletes for it would be noise.
      for (const key of Object.keys(
        dbOverrides?.staff[staffId] ?? {},
      ) as PermissionKey[]) {
        setStaffPermissionMutate({ staffId, key, setting: null });
      }
      setState((prev) => ({
        ...prev,
        staffOverrides: { ...prev.staffOverrides, [staffId]: {} },
      }));
    },
    [dbOverrides, setStaffPermissionMutate],
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
      // The edit that counts: facility_role_permissions is what
      // private.resolve_permission reads. Everything below is presentation.
      setFacilityRolePermissionMutate({ role, key, scope });

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
    [setFacilityRolePermissionMutate],
  );

  // Resetting is a delete per key rather than one call, because the override
  // tables are keyed per permission. Clearing them only in local state would
  // leave the row in Postgres still in force — the same lie this change exists
  // to remove, just behind a different button.
  const resetPresetRole = useCallback(
    (role: FacilityStaffRole) => {
      for (const key of Object.keys(
        presetOverrides[role] ?? {},
      ) as PermissionKey[]) {
        setFacilityRolePermissionMutate({ role, key, scope: null });
      }
      setState((prev) => {
        const next = { ...prev.presetOverrides };
        delete next[role];
        return { ...prev, presetOverrides: next };
      });
    },
    [presetOverrides, setFacilityRolePermissionMutate],
  );

  const resetAllPresets = useCallback(() => {
    for (const [role, keys] of Object.entries(presetOverrides)) {
      for (const key of Object.keys(keys) as PermissionKey[]) {
        setFacilityRolePermissionMutate({
          role: role as FacilityStaffRole,
          key,
          scope: null,
        });
      }
    }
    setState((prev) => ({ ...prev, presetOverrides: {} }));
  }, [presetOverrides, setFacilityRolePermissionMutate]);

  const setViewerId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, viewerId: id }));
  }, []);

  const value = useMemo<RbacContextValue>(
    () => ({
      viewer,
      viewerId: state.viewerId,
      setViewerId,
      customRoles,
      presetOverrides,
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
      presetOverrides,
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
 *
 * The DATABASE is that source when there is a session — see
 * use-db-permissions.ts. The client-side cascade below it computes the same
 * rules from a mock staff array and overrides held in localStorage, which is
 * both a second implementation and an editable one.
 *
 * The legacy path stays as the fallback while AUTH_ENFORCED is off, because
 * most of the app is still browsed signed-out and blanking every guarded
 * control would look like a bug rather than a policy.
 */
export function useEffectivePermissions(): EffectivePermissions {
  const { viewer, resolvePermissions } = useFacilityRbac();
  const fromDb = useDbPermissions();

  const legacy = useMemo(
    () => resolvePermissions(viewer.id),
    [resolvePermissions, viewer.id],
  );

  return fromDb ?? legacy;
}

/**
 * Does the acting viewer have `key` (with any scope)? The ergonomic check every
 * guard/sidebar/mask should call.
 */
export function usePermission(key: PermissionKey): boolean {
  const { can } = useFacilityRbac();
  const fromDb = useDbPermissions();

  if (fromDb) return fromDb[key] !== false && fromDb[key] !== undefined;
  return can(key);
}

/**
 * The acting viewer's effective ACCESS SCOPE for `key` — the granted
 * {@link AccessScope} (e.g. "assigned_shifts") or `false` when not granted.
 * Use when a caller needs the scope, not just a yes/no.
 */
export function useCan(key: PermissionKey): AccessScope | false {
  const { viewer, resolveFor } = useFacilityRbac();
  const fromDb = useDbPermissions();

  if (fromDb) return fromDb[key] ?? false;

  const { granted, scope } = resolveFor(viewer, key);
  return granted ? scope : false;
}
