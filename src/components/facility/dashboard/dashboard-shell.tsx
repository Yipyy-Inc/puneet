"use client";

import { UnifiedBookingsProvider } from "@/hooks/use-unified-bookings";
import { DashboardFiltersProvider } from "@/components/facility/dashboard/dashboard-filters-context";
import { KpiRow } from "@/components/facility/dashboard/kpi-row";
import { ServiceBreakdown } from "@/components/facility/dashboard/service-breakdown";
import { BookingsBoard } from "@/components/facility/dashboard/bookings-board";
import { SmartInsightsWidget } from "@/components/facility/dashboard/SmartInsightsWidget";
import { usePermission } from "@/hooks/use-facility-rbac";
import { LayoutDashboard } from "lucide-react";

/**
 * The ONE facility dashboard. The same shell renders for an owner and for a
 * reception employee — each tile/widget is gated on the permission key that
 * guards its underlying screen, so a viewer simply doesn't see what they can't
 * open. "Same as facility, minus permissions."
 *
 * Every gate resolves through the acting RBAC viewer (`usePermission`): the
 * owner default is all-access, so the facility admin sees the full dashboard
 * exactly as before; the /employee portal fixes the viewer to the signed-in
 * staff member, so their dashboard drops what their role can't reach.
 *
 * Gating is per widget-TYPE, keyed as the product spec lays out:
 *   • booking widgets (arrivals, guests, live board) → `view_bookings`
 *   • smart-insights feed                            → `ops_smart_insights`
 * The shell currently composes only these two families. As the richer tiles
 * arrive they slot in under the same pattern — revenue → `financial_view_amounts`,
 * today's calendar → `view_all_calendars`, grooming queue → `view_grooming_queue`,
 * occupancy → `boarding_view_dashboard`/`daycare_view_dashboard`, staff/labor →
 * `view_staff`/`financial_view_labor_cost`, incidents → `ops_incidents_view`.
 */
export function DashboardShell() {
  // Booking widgets. Gated on view_bookings (NOT the boarding/daycare dashboard
  // keys) so reception — which has view_bookings but not the occupancy
  // dashboards — keeps its arrivals, guests, and Live Activity Board.
  const canViewBookings = usePermission("view_bookings");
  // The operational insight feed carries its own key.
  const canViewInsights = usePermission("ops_smart_insights");

  const hasAnyWidget = canViewBookings || canViewInsights;

  return (
    <UnifiedBookingsProvider>
      <DashboardFiltersProvider>
        <div className="space-y-5">
          {canViewBookings && (
            <>
              <ServiceBreakdown />
              <KpiRow />
              <BookingsBoard />
            </>
          )}

          {canViewInsights && <SmartInsightsWidget />}

          {/* A role with none of the dashboard's widgets still lands on a real
              screen, not a blank one. */}
          {!hasAnyWidget && <DashboardEmptyState />}
        </div>
      </DashboardFiltersProvider>
    </UnifiedBookingsProvider>
  );
}

function DashboardEmptyState() {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-16 text-center">
      <LayoutDashboard className="size-6 opacity-60" />
      <p className="text-sm font-medium">Nothing to show here yet</p>
      <p className="max-w-sm text-xs">
        Your role doesn&apos;t include any of the dashboard&apos;s widgets. Use
        the sidebar to jump to the tools you do have access to.
      </p>
    </div>
  );
}
