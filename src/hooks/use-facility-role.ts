"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  type FacilityRole,
  getFacilityRole,
  setFacilityRole,
  getCurrentUserId,
  setCurrentUserId,
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

  const isOwner = role === "owner";

  return {
    role,
    userId,
    isLoading: false,
    switchRole,
    setUser,
    isOwner,
    refresh,
  };
}
