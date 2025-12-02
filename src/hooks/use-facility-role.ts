"use client";

import { useCallback, useSyncExternalStore } from "react";
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

// Store for role state with subscription support
let roleListeners: Array<() => void> = [];

function subscribeToRole(callback: () => void) {
  roleListeners.push(callback);
  return () => {
    roleListeners = roleListeners.filter((l) => l !== callback);
  };
}

function notifyRoleListeners() {
  roleListeners.forEach((listener) => listener());
}

function getRoleSnapshot(): FacilityRole {
  return getFacilityRole();
}

function getRoleServerSnapshot(): FacilityRole {
  return "owner"; // Default for SSR
}

// Store for user ID
function getUserIdSnapshot(): string | null {
  return getCurrentUserId();
}

function getUserIdServerSnapshot(): string | null {
  return null;
}

// Store for custom permissions
let permissionListeners: Array<() => void> = [];

function subscribeToPermissions(callback: () => void) {
  permissionListeners.push(callback);
  return () => {
    permissionListeners = permissionListeners.filter((l) => l !== callback);
  };
}

function notifyPermissionListeners() {
  permissionListeners.forEach((listener) => listener());
}

function getCustomPermissionsSnapshot(): Record<
  FacilityRole,
  Permission[]
> | null {
  return getCustomRolePermissions();
}

function getCustomPermissionsServerSnapshot(): Record<
  FacilityRole,
  Permission[]
> | null {
  return null;
}

function getUserOverridesSnapshot(): UserPermissionOverride[] {
  return getUserPermissionOverrides();
}

function getUserOverridesServerSnapshot(): UserPermissionOverride[] {
  return [];
}

export function useFacilityRole() {
  const role = useSyncExternalStore(
    subscribeToRole,
    getRoleSnapshot,
    getRoleServerSnapshot,
  );

  const userId = useSyncExternalStore(
    subscribeToRole,
    getUserIdSnapshot,
    getUserIdServerSnapshot,
  );

  const switchRole = useCallback((newRole: FacilityRole) => {
    setFacilityRole(newRole);
    notifyRoleListeners();
    // Reload to apply new role across the app
    window.location.reload();
  }, []);

  const setUser = useCallback((newUserId: string) => {
    setCurrentUserId(newUserId);
    notifyRoleListeners();
  }, []);

  const refresh = useCallback(() => {
    notifyRoleListeners();
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
    isLoading: false,
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
  const customRolePermissions = useSyncExternalStore(
    subscribeToPermissions,
    getCustomPermissionsSnapshot,
    getCustomPermissionsServerSnapshot,
  );

  const userOverrides = useSyncExternalStore(
    subscribeToPermissions,
    getUserOverridesSnapshot,
    getUserOverridesServerSnapshot,
  );

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
      notifyPermissionListeners();
    },
    [],
  );

  const resetRole = useCallback((role?: FacilityRole) => {
    resetRolePermissions(role);
    notifyPermissionListeners();
  }, []);

  const setOverride = useCallback((override: UserPermissionOverride) => {
    setUserPermissionOverride(override);
    notifyPermissionListeners();
  }, []);

  const removeUserOverride = useCallback((userId: string) => {
    resetUserOverrides(userId);
    notifyPermissionListeners();
  }, []);

  const saveAllRolePermissions = useCallback(
    (permissions: Record<FacilityRole, Permission[]>) => {
      saveCustomRolePermissions(permissions);
      notifyPermissionListeners();
    },
    [],
  );

  const saveAllUserOverrides = useCallback(
    (overrides: UserPermissionOverride[]) => {
      saveUserPermissionOverrides(overrides);
      notifyPermissionListeners();
    },
    [],
  );

  return {
    customRolePermissions,
    userOverrides,
    isLoading: false,
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
