"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { facilityRolesStore } from "@/lib/facility-roles-store";
import type {
  AccessScope,
  CustomFacilityRole,
  CustomRolesById,
  PermissionKey,
} from "@/types/facility-staff";

// Roles domain query layer. Facility custom roles are read through
// `roleQueries.customRoles()` and written through the mutation hooks below, so
// the TanStack Query cache is the single source of truth. The underlying
// persistence lives in @/lib/facility-roles-store (the mock "backend").

export const roleKeys = {
  all: ["facility-roles"] as const,
  custom: () => [...roleKeys.all, "custom"] as const,
};

export const roleQueries = {
  customRoles: () => ({
    queryKey: roleKeys.custom(),
    queryFn: async (): Promise<CustomRolesById> => facilityRolesStore.getAll(),
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
