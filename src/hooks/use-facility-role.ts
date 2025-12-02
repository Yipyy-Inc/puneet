"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type FacilityRole,
  type Permission,
  getFacilityRole,
  setFacilityRole,
  hasPermission,
  canAccessRoute,
  ROLE_PERMISSIONS,
} from "@/lib/role-utils";

export function useFacilityRole() {
  const [role, setRole] = useState<FacilityRole>("owner");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRole(getFacilityRole());
    setIsLoading(false);
  }, []);

  const switchRole = useCallback((newRole: FacilityRole) => {
    setFacilityRole(newRole);
    setRole(newRole);
    // Reload to apply new role across the app
    window.location.reload();
  }, []);

  const can = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(role, permission);
    },
    [role],
  );

  const canAccess = useCallback(
    (route: string): boolean => {
      return canAccessRoute(role, route);
    },
    [role],
  );

  const permissions = ROLE_PERMISSIONS[role];

  return {
    role,
    isLoading,
    switchRole,
    can,
    canAccess,
    permissions,
  };
}
