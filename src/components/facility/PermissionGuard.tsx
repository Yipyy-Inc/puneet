"use client";

import { ReactNode } from "react";

interface PermissionGuardProps {
  children: ReactNode;
}

/**
 * PermissionGuard component that now always renders children since permission system is removed.
 * Kept for backward compatibility.
 */
export function PermissionGuard({ children }: PermissionGuardProps) {
  // Since permission system is removed, always render children
  return <>{children}</>;
}
