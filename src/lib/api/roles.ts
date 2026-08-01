"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { facilityRolesStore } from "@/lib/facility-roles-store";
import { liveWrite } from "@/lib/api/live-fetch";
import { permissionQueries } from "@/hooks/use-db-permissions";
import type {
  RoleOverrides,
  RoleOverrideWrite,
} from "@/app/api/roles/overrides/route";
import type {
  AccessScope,
  CustomFacilityRole,
  CustomRolesById,
  FacilityStaffRole,
  PermissionKey,
  PermissionSetting,
} from "@/types/facility-staff";

// Roles domain query layer. Facility custom roles are read through
// `roleQueries.customRoles()` and written through the mutation hooks below, so
// the TanStack Query cache is the single source of truth. The underlying
// persistence lives in @/lib/facility-roles-store (the mock "backend").
//
// The two DB-backed layers are separate: `roleQueries.overrides()` reads what
// Postgres will actually enforce, and the override mutations write it. Custom
// roles are still browser-local — they have no home in the schema yet, because
// facility_role_permissions.role is an enum. See the migration for why.

export const roleKeys = {
  all: ["facility-roles"] as const,
  custom: () => [...roleKeys.all, "custom"] as const,
  overrides: () => [...roleKeys.all, "overrides"] as const,
};

/** `null` when signed out — the caller keeps the legacy client-side state. */
async function fetchOverrides(): Promise<RoleOverrides | null> {
  const response = await fetch("/api/roles/overrides");
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to load role overrides (${response.status})`);
  }
  return (await response.json()) as RoleOverrides;
}

export const roleQueries = {
  customRoles: () => ({
    queryKey: roleKeys.custom(),
    queryFn: async (): Promise<CustomRolesById> => facilityRolesStore.getAll(),
  }),
  /** What the database will enforce, as opposed to what this browser remembers. */
  overrides: () => ({
    queryKey: roleKeys.overrides(),
    queryFn: fetchOverrides,
    staleTime: 5 * 60_000,
  }),
};

/** Optimistically patch the cached custom-role map so the UI stays instant. */
function patchCache(
  queryClient: QueryClient,
  updater: (prev: CustomRolesById) => CustomRolesById,
): void {
  queryClient.setQueryData<CustomRolesById>(roleKeys.custom(), (prev) =>
    updater(prev ?? {}),
  );
}

function invalidate(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: roleKeys.custom() });
}

export type UpdateCustomRoleVars = {
  id: string;
  patch: Partial<CustomFacilityRole>;
};

export type SetCustomRolePermissionVars = {
  id: string;
  key: PermissionKey;
  scope: AccessScope | null;
};

/** Create a custom role. The caller builds the full role (id + createdAt) so it
 *  can select the new role synchronously; the mutation persists it. */
export function useCreateCustomRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: CustomFacilityRole) =>
      facilityRolesStore.put(role),
    onMutate: (role) => {
      patchCache(queryClient, (prev) => ({ ...prev, [role.id]: role }));
    },
    onSettled: () => invalidate(queryClient),
  });
}

export function useUpdateCustomRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateCustomRoleVars) =>
      facilityRolesStore.update(id, patch),
    onMutate: ({ id, patch }) => {
      patchCache(queryClient, (prev) => {
        const existing = prev[id];
        if (!existing) return prev;
        return {
          ...prev,
          [id]: { ...existing, ...patch, id, createdAt: existing.createdAt },
        };
      });
    },
    onSettled: () => invalidate(queryClient),
  });
}

export function useDeleteCustomRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => facilityRolesStore.remove(id),
    onMutate: (id) => {
      patchCache(queryClient, (prev) => {
        if (!(id in prev)) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    },
    onSettled: () => invalidate(queryClient),
  });
}

// ── The DB-backed cascade ───────────────────────────────────────────────────
// Both mutations invalidate the viewer's own permission map as well as the
// override list: editing what Groomer means changes what a groomer may do, and
// the guard drawing the screen reads the resolved map, not this one.

function patchOverrides(
  queryClient: QueryClient,
  updater: (prev: RoleOverrides) => RoleOverrides,
): void {
  queryClient.setQueryData<RoleOverrides | null>(
    roleKeys.overrides(),
    // Null means signed out. Don't invent a map the server never sent — the
    // legacy client-side state is what the UI is showing in that case.
    (prev) => (prev ? updater(prev) : prev),
  );
}

function invalidateResolved(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: roleKeys.overrides() }),
    queryClient.invalidateQueries({
      queryKey: permissionQueries.mine().queryKey,
    }),
  ]);
}

export type SetFacilityRolePermissionVars = {
  role: FacilityStaffRole;
  key: PermissionKey;
  /** `null` resets to the global preset; "revoked" denies it here. */
  scope: AccessScope | "revoked" | null;
};

/** Layer 2 — what a preset role means at this facility. */
export function useSetFacilityRolePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: SetFacilityRolePermissionVars) =>
      liveWrite<{ ok: true }>("/api/roles/overrides", "PUT", {
        kind: "facility-role",
        ...vars,
      } satisfies RoleOverrideWrite),
    onMutate: ({ role, key, scope }) => {
      patchOverrides(queryClient, (prev) => {
        const forRole = { ...(prev.facilityRoles[role] ?? {}) };
        if (scope === null) {
          delete forRole[key];
        } else {
          forRole[key] = scope;
        }
        return {
          ...prev,
          facilityRoles: { ...prev.facilityRoles, [role]: forRole },
        };
      });
    },
    onSettled: () => invalidateResolved(queryClient),
  });
}

export type SetStaffPermissionVars = {
  /** The staff legacy id, e.g. "fs-groom-01". */
  staffId: string;
  key: PermissionKey;
  /** `null` clears the override so their roles decide again. */
  setting: PermissionSetting | null;
};

/** Layer 3 — one person, regardless of the roles they hold. */
export function useSetStaffPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: SetStaffPermissionVars) =>
      liveWrite<{ ok: true }>("/api/roles/overrides", "PUT", {
        kind: "staff",
        ...vars,
      } satisfies RoleOverrideWrite),
    onMutate: ({ staffId, key, setting }) => {
      patchOverrides(queryClient, (prev) => {
        const forStaff = { ...(prev.staff[staffId] ?? {}) };
        if (setting === null) {
          delete forStaff[key];
        } else {
          forStaff[key] = setting;
        }
        return { ...prev, staff: { ...prev.staff, [staffId]: forStaff } };
      });
    },
    onSettled: () => invalidateResolved(queryClient),
  });
}

export function useSetCustomRolePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, key, scope }: SetCustomRolePermissionVars) =>
      facilityRolesStore.setPermission(id, key, scope),
    onMutate: ({ id, key, scope }) => {
      patchCache(queryClient, (prev) => {
        const role = prev[id];
        if (!role) return prev;
        const permissions = { ...role.permissions };
        if (scope === null) {
          delete permissions[key];
        } else {
          permissions[key] = scope;
        }
        return { ...prev, [id]: { ...role, permissions } };
      });
    },
    onSettled: () => invalidate(queryClient),
  });
}
