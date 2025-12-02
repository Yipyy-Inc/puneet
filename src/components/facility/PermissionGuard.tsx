"use client";

import { ReactNode } from "react";
import { type Permission } from "@/lib/role-utils";
import { useFacilityRole } from "@/hooks/use-facility-role";

interface PermissionGuardProps {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, all permissions required. If false (default), any permission grants access.
}

/**
 * PermissionGuard component that conditionally renders children based on user permissions.
 * Use this to hide buttons, forms, or other UI elements based on user's role permissions.
 *
 * @example
 * // Single permission
 * <PermissionGuard permission="process_refund">
 *   <Button>Refund</Button>
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (any)
 * <PermissionGuard permission={["view_revenue", "view_financials"]}>
 *   <RevenueChart />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGuard permission={["view_revenue", "export_reports"]} requireAll>
 *   <ExportRevenueButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  requireAll = false,
}: PermissionGuardProps) {
  const { can, isLoading } = useFacilityRole();

  if (isLoading) {
    return null; // Don't show anything during loading
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasPermission = requireAll
    ? permissions.every((p) => can(p))
    : permissions.some((p) => can(p));

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

interface RouteGuardProps {
  route: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * RouteGuard component that conditionally renders children based on route access.
 * Use this for page-level access control.
 */
export function RouteGuard({ route, children, fallback }: RouteGuardProps) {
  const { canAccess, isLoading } = useFacilityRole();

  if (isLoading) {
    return null;
  }

  return canAccess(route) ? <>{children}</> : <>{fallback}</>;
}
