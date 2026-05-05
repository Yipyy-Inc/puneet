"use client";

import { ReactNode } from "react";
import { Lock, MapPin } from "lucide-react";
import { useLocationScope } from "@/hooks/use-location-scope";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /**
   * Restrict to specific location IDs. If user's accessibleLocations
   * doesn't include all of them, the page is blocked.
   */
  requireLocations?: string[];
  /**
   * Require HQ-view capability (owner / general manager only).
   */
  requireHq?: boolean;
  /**
   * Custom fallback to render when access is denied.
   */
  fallback?: ReactNode;
}

/**
 * Wraps a page with role + location-aware permission enforcement.
 *
 * Use cases:
 *   <LocationAccessGuard requireHq>
 *     <HqOnlyContent />
 *   </LocationAccessGuard>
 *
 *   <LocationAccessGuard requireLocations={["loc-dv-laval"]}>
 *     <LavalSpecificContent />
 *   </LocationAccessGuard>
 *
 * When the active location is changed (via the switcher), this re-evaluates.
 */
export function LocationAccessGuard({
  children,
  requireLocations,
  requireHq,
  fallback,
}: Props) {
  const scope = useLocationScope();

  if (requireHq && !scope.canViewHq) {
    return <DeniedCard reason="hq" fallback={fallback} />;
  }

  if (requireLocations && requireLocations.length > 0) {
    const hasAll = requireLocations.every((id) =>
      scope.accessibleLocationIds.includes(id),
    );
    if (!hasAll) {
      return <DeniedCard reason="location" fallback={fallback} />;
    }
  }

  return <>{children}</>;
}

function DeniedCard({
  reason,
  fallback,
}: {
  reason: "hq" | "location";
  fallback?: ReactNode;
}) {
  if (fallback !== undefined) return <>{fallback}</>;
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            {reason === "hq" ? (
              <Lock className="size-6" />
            ) : (
              <MapPin className="size-6" />
            )}
          </div>
          <h3 className="text-lg font-semibold">
            {reason === "hq" ? "HQ-level access required" : "Location not accessible"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {reason === "hq"
              ? "Only the owner or HQ manager can view this page. Ask the owner to delegate HQ access in HQ Settings."
              : "This page is scoped to a location you don't have access to. Switch locations in the top bar or contact your manager."}
          </p>
          <Button asChild variant="outline" size="sm">
            <a href="/facility/dashboard">Back to dashboard</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
