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
import { hasPermission, type Permission } from "@/lib/rbac";
import type { UserRole } from "@/types/scheduling";

interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  role: UserRole;
  /** Departments this user manages — empty for owners (full access). */
  departmentIds: string[];
}

interface CurrentUserContextValue {
  user: CurrentUser;
  setRole: (role: UserRole) => void;
  can: (permission: Permission) => boolean;
}

const STORAGE_KEY = "scheduling-current-user-role";

const DEFAULT_USER: CurrentUser = {
  id: "emp-1",
  name: "Sarah Johnson",
  initials: "SJ",
  role: "owner",
  departmentIds: [],
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(DEFAULT_USER.role);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY) as UserRole | null;
    if (stored) setRoleState(stored);
  }, []);

  const setRole = useCallback((next: UserRole) => {
    setRoleState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<CurrentUserContextValue>(() => {
    const user: CurrentUser = { ...DEFAULT_USER, role };
    return {
      user,
      setRole,
      can: (permission) => hasPermission(role, permission),
    };
  }, [role, setRole]);

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider — assume owner so
    // pre-RBAC features keep working.
    return {
      user: DEFAULT_USER,
      setRole: () => {},
      can: () => true,
    };
  }
  return ctx;
}

/** Hook variant that returns just the permission check function. */
export function usePermission() {
  return useCurrentUser().can;
}
