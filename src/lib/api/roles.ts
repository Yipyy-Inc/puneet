"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { facilityRolesStore } from "@/lib/facility-roles-store";
import { liveWriteOptional } from "@/lib/api/live-fetch";
import { permissionQueries } from "@/hooks/use-db-permissions";
import type {
  RoleOverrides,
  RoleOverrideWrite,
} from "@/app/api/roles/overrides/route";
import type {
  CustomRolesResponse,
  CustomRoleWrite,
} from "@/app/api/roles/custom/route";
import type {
  AccessScope,
  CustomFacilityRole,
  CustomRolesById,
  FacilityStaffRole,
  PermissionKey,
  PermissionSetting,
} from "@/types/facility-staff";

// Roles domain query layer. Every layer of the cascade is read and written
// through here, so the TanStack Query cache is the single source of truth for
// the UI and Postgres is the single source of truth for enforcement.
//
//   roleQueries.overrides()    facility_role_permissions + staff_permissions
//   roleQueries.customRoles()  facility_custom_roles + their permissions and
//                              assignments
//
// @/lib/facility-roles-store (localStorage) survives as the SIGNED-OUT
// fallback only. Most of the app is still browsed without a session until
// AUTH_ENFORCED flips, and an editor that blanked itself would read as a bug
// rather than a sign-in prompt.

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

async function fetchCustomRoles(): Promise<CustomRolesResponse> {
  const response = await fetch("/api/roles/custom");
  // Signed out: the browser's own roles, and assignments UNKNOWN — they live
  // on staff rows, which need a session to read. `null` rather than `{}` so
  // the caller keeps each profile's seeded assignments instead of concluding
  // that nobody holds anything.
  if (response.status === 401) {
    return { roles: facilityRolesStore.getAll(), assignments: null };
  }
  if (!response.ok) {
    throw new Error(`Failed to load custom roles (${response.status})`);
  }
  return (await response.json()) as CustomRolesResponse;
}

export const roleQueries = {
  customRoles: () => ({
    queryKey: roleKeys.custom(),
    queryFn: fetchCustomRoles,
  }),
  /** What the database will enforce, as opposed to what this browser remembers. */
  overrides: () => ({
    queryKey: roleKeys.overrides(),
    queryFn: fetchOverrides,
    staleTime: 5 * 60_000,
  }),
};

// Only used as the seed for an optimistic patch that lands before the first
// fetch. `assignments: null` keeps the "not known" meaning intact.
const EMPTY_CUSTOM: CustomRolesResponse = { roles: {}, assignments: null };

/** Optimistically patch the cached custom-role map so the UI stays instant. */
function patchCache(
  queryClient: QueryClient,
  updater: (prev: CustomRolesById) => CustomRolesById,
): void {
  queryClient.setQueryData<CustomRolesResponse>(
    roleKeys.custom(),
    (prev = EMPTY_CUSTOM) => ({ ...prev, roles: updater(prev.roles) }),
  );
}

/**
 * Custom-role edits go to Postgres AND to the localStorage store. The store is
 * what a signed-out browser reads back; the database is what RLS enforces and
 * what every other browser will see. `liveWriteOptional` is what makes the
 * signed-out case a no-op rather than a thrown error.
 */
function write(body: CustomRoleWrite) {
  return liveWriteOptional<{ ok: true }>("/api/roles/custom", "PUT", body);
}

function invalidate(queryClient: QueryClient) {
  // A custom role's permissions feed the cascade, so the viewer's own resolved
  // map can move when one changes.
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: roleKeys.custom() }),
    queryClient.invalidateQueries({
      queryKey: permissionQueries.mine().queryKey,
    }),
  ]);
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
    mutationFn: async (role: CustomFacilityRole) => {
      await write({ kind: "upsert", role });
      return facilityRolesStore.put(role);
    },
    onMutate: (role) => {
      patchCache(queryClient, (prev) => ({ ...prev, [role.id]: role }));
    },
    onSettled: () => invalidate(queryClient),
  });
}

export function useUpdateCustomRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateCustomRoleVars) => {
      const next = facilityRolesStore.update(id, patch);
      // The route upserts a whole role, so send the merged result rather than
      // the patch — a partial upsert would blank the fields left out.
      const merged = next[id];
      if (merged) await write({ kind: "upsert", role: merged });
      return next;
    },
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
    mutationFn: async (id: string) => {
      await write({ kind: "delete", id });
      return facilityRolesStore.remove(id);
    },
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

export type SetStaffCustomRolesVars = {
  /** Staff legacy id, e.g. "fs-groom-01". */
  staffId: string;
  /** The complete set the person should hold. */
  roleIds: string[];
};

/**
 * Who holds a custom role. Separate from the role's definition because it is a
 * different question edited on a different screen — the staff profile, not the
 * roles studio — and because the assignment is what actually moves someone's
 * permissions.
 */
export function useSetStaffCustomRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, roleIds }: SetStaffCustomRolesVars) =>
      write({ kind: "assignments", staffId, roleIds }),
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
      liveWriteOptional<{ ok: true }>("/api/roles/overrides", "PUT", {
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
      liveWriteOptional<{ ok: true }>("/api/roles/overrides", "PUT", {
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
    mutationFn: async ({ id, key, scope }: SetCustomRolePermissionVars) => {
      await write({ kind: "permission", id, key, scope });
      return facilityRolesStore.setPermission(id, key, scope);
    },
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
