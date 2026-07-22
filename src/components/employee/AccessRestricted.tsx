"use client";

// ============================================================================
// Section 8D — Access Restricted
//
// A clean, branded, full-page "you can't see this" screen for the employee
// portal, plus a <RequirePermission> wrapper that gates a whole module page.
//
// This is NOT the gutted src/components/facility/PermissionGuard.tsx (a no-op) —
// it renders EITHER the children OR this screen, never both, so no restricted
// content is mounted behind it. Permission decisions come solely from the RBAC
// engine via usePermissionCheck (8A buckets over useCan / the provider).
// ============================================================================

import type { ReactNode } from "react";
import Link from "next/link";
import { PawPrint, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissionCheck } from "@/lib/facility-permissions";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import type { PermissionKey } from "@/types/facility-staff";

/**
 * Full-page, self-contained access-denied screen. Centered on a plain white
 * page: the Yipyy mark, a large headline, a small grey line, and a single way
 * out (→ /employee). Intentionally carries NO nav, back button, or breadcrumbs.
 */
export function AccessRestricted() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center bg-white px-6 py-16 text-center">
      {/* Yipyy mark */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-amber-600">
          <PawPrint className="size-5 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-neutral-900">
          Yipyy
        </span>
      </div>

      <h1 className="max-w-md text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        You don&apos;t have access to this section.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-neutral-500">
        Contact your manager if you believe this is an error.
      </p>

      <Button
        asChild
        className="mt-8 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <Link href="/employee">
          <LayoutDashboard className="size-4" />
          Go to my dashboard
        </Link>
      </Button>
    </div>
  );
}

/**
 * Gate a whole module page (Part 4). Renders {@link AccessRestricted} when the
 * viewer lacks `permKey` entirely; renders `children` when the permission is
 * granted OR scoped to their assigned shifts (`"assigned_only"`) — page-level
 * access is allowed for scoped grants; per-record 403s are handled below.
 *
 *   <RequirePermission permKey="daycare_view_dashboard">
 *     <DaycarePage />
 *   </RequirePermission>
 *
 * Note: this only covers whole-page keys. When a *scoped* data call would 403
 * in the mock — i.e. the requested record isn't in the viewer's assigned set —
 * render <AccessRestricted /> from the page directly (RequirePermission can't
 * see record identity), e.g.
 *
 *   if (booking && !isAssignedToViewer(booking)) return <AccessRestricted />;
 */
export function RequirePermission({
  permKey,
  children,
}: {
  permKey: PermissionKey;
  children: ReactNode;
}) {
  const bucket = usePermissionCheck(permKey);
  if (bucket === "not_granted") return <AccessRestricted />;
  return <>{children}</>;
}

/**
 * OR-variant of {@link RequirePermission}: renders `children` when ANY of
 * `permKeys` is granted or assigned_only. Used where the spec defines a section
 * by an OR of keys (e.g. Daily Care = log_feedings OR boarding_daily_care_log,
 * so both boarding staff and daycare attendants reach it). Reads the effective
 * map once rather than calling a hook per key.
 */
export function RequireAnyPermission({
  permKeys,
  children,
}: {
  permKeys: PermissionKey[];
  children: ReactNode;
}) {
  const permissions = useEffectivePermissions();
  const allowed = permKeys.some((k) => permissions[k] !== false);
  if (!allowed) return <AccessRestricted />;
  return <>{children}</>;
}
