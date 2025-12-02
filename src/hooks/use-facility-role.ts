"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type FacilityRole,
  type Permission,
  type UserPermissionOverride,
  getFacilityRole,
  setFacilityRole,
  hasPermission,
  canAccessRoute,
  getEffectivePermissions,
  getCustomRolePermissions,
  saveCustomRolePermissions,
  getUserPermissionOverrides,
  saveUserPermissionOverrides,
  getCurrentUserId,
  setCurrentUserId,
  updateRolePermission,
  setUserPermissionOverride,
  resetRolePermissions,
  resetUserOverrides,
  DEFAULT_ROLE_PERMISSIONS,
  canManagePermissions,
} from "@/lib/role-utils";

export function useFacilityRole() {
  const [role, setRole] = useState<FacilityRole>(() => getFacilityRole());
  const [userId, setUserId] = useState<string | null>(() => getCurrentUserId());
  const [refreshKey, setRefreshKey] = useState(0);
  const isLoading = false;

  useEffect(() => {
    if (refreshKey > 0) {
      // Use a microtask to avoid the React strict mode warning
      const timer = setTimeout(() => {
        setRole(getFacilityRole());
        setUserId(getCurrentUserId());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const switchRole = useCallback((newRole: FacilityRole) => {
    setFacilityRole(newRole);
    setRole(newRole);
    // Reload to apply new role across the app
    window.location.reload();
  }, []);

  const setUser = useCallback((newUserId: string) => {
    setCurrentUserId(newUserId);
    setUserId(newUserId);
  }, []);

  const can = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(role, permission, userId ?? undefined);
    },
    [role, userId],
  );

  const canAccess = useCallback(
    (route: string): boolean => {
      return canAccessRoute(role, route, userId ?? undefined);
    },
    [role, userId],
  );

  const permissions = getEffectivePermissions(role, userId ?? undefined);

  const isOwner = role === "owner";
  const canEditPermissions = canManagePermissions(role, userId ?? undefined);

  return {
    role,
    userId,
    isLoading,
    switchRole,
    setUser,
    can,
    canAccess,
    permissions,
    isOwner,
    canEditPermissions,
    refresh,
  };
}

// Hook for managing permissions (owner only)
export function usePermissionManagement() {
  const [customRolePermissions, setCustomRolePermissions] = useState<Record<
    FacilityRole,
    Permission[]
  > | null>(() => getCustomRolePermissions());
  const [userOverrides, setUserOverrides] = useState<UserPermissionOverride[]>(
    () => getUserPermissionOverrides(),
  );
  const isLoading = false;

  const getRolePerms = useCallback(
    (role: FacilityRole): Permission[] => {
      if (customRolePermissions && customRolePermissions[role]) {
        return customRolePermissions[role];
      }
      return DEFAULT_ROLE_PERMISSIONS[role];
    },
    [customRolePermissions],
  );

  const updatePermission = useCallback(
    (role: FacilityRole, permission: Permission, granted: boolean) => {
      updateRolePermission(role, permission, granted);
      // Refresh state
      const custom = getCustomRolePermissions();
      setCustomRolePermissions(custom);
    },
    [],
  );

  const resetRole = useCallback((role?: FacilityRole) => {
    resetRolePermissions(role);
    const custom = getCustomRolePermissions();
    setCustomRolePermissions(custom);
  }, []);

  const setOverride = useCallback((override: UserPermissionOverride) => {
    setUserPermissionOverride(override);
    setUserOverrides(getUserPermissionOverrides());
  }, []);

  const removeUserOverride = useCallback((userId: string) => {
    resetUserOverrides(userId);
    setUserOverrides(getUserPermissionOverrides());
  }, []);

  const saveAllRolePermissions = useCallback(
    (permissions: Record<FacilityRole, Permission[]>) => {
      saveCustomRolePermissions(permissions);
      setCustomRolePermissions(permissions);
    },
    [],
  );

  const saveAllUserOverrides = useCallback(
    (overrides: UserPermissionOverride[]) => {
      saveUserPermissionOverrides(overrides);
      setUserOverrides(overrides);
    },
    [],
  );

  return {
    customRolePermissions,
    userOverrides,
    isLoading,
    getRolePerms,
    updatePermission,
    resetRole,
    setOverride,
    removeUserOverride,
    saveAllRolePermissions,
    saveAllUserOverrides,
    defaultPermissions: DEFAULT_ROLE_PERMISSIONS,
  };
}
