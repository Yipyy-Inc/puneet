"use client";

import { type ReactNode } from "react";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { hasFormPermission, type FormPermission } from "@/lib/form-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface FormPermissionGuardProps {
  /** Required permission(s) — all must be granted */
  requires: FormPermission | FormPermission[];
  /** Content to render when permission is granted */
  children: ReactNode;
  /** Optional fallback when permission is denied (defaults to access denied card) */
  fallback?: ReactNode;
  /** If true, renders nothing instead of the fallback when denied */
  silent?: boolean;
}

/**
 * Guard component that checks form permissions before rendering children.
 * Uses the facility role from the role hook.
 *
 * Usage:
 *   <FormPermissionGuard requires="forms_create">
 *     <FormBuilder />
 *   </FormPermissionGuard>
 *
 *   <FormPermissionGuard requires={["forms_view_submissions", "forms_process_submissions"]} silent>
 *     <ProcessButton />
 *   </FormPermissionGuard>
 */
export function FormPermissionGuard({
  requires,
  children,
  fallback,
  silent = false,
}: FormPermissionGuardProps) {
  const { role, userId } = useFacilityRole();

  const permissions = Array.isArray(requires) ? requires : [requires];
  const allGranted = permissions.every((p) => hasFormPermission(role, p, userId ?? undefined));

  if (allGranted) {
    return <>{children}</>;
  }

  if (silent) return null;

  if (fallback) return <>{fallback}</>;

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-muted-foreground">Access Restricted</h3>
        <p className="text-xs text-muted-foreground mt-1">
          You don&apos;t have permission to access this feature.
          Contact your facility administrator.
        </p>
      </CardContent>
    </Card>
  );
}
