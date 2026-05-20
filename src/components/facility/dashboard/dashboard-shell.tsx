"use client";

import { UnifiedBookingsProvider } from "@/hooks/use-unified-bookings";
import { DashboardFiltersProvider } from "@/components/facility/dashboard/dashboard-filters-context";
import { KpiRow } from "@/components/facility/dashboard/kpi-row";
import { ServiceBreakdown } from "@/components/facility/dashboard/service-breakdown";
import { BookingsBoard } from "@/components/facility/dashboard/bookings-board";
import { SmartInsightsWidget } from "@/components/facility/dashboard/SmartInsightsWidget";
import { LocationFilterBanner } from "@/components/hq/LocationFilterBanner";

export function DashboardShell() {
  return (
    <UnifiedBookingsProvider>
      <DashboardFiltersProvider>
        <div className="space-y-5">
          <LocationFilterBanner />
          <ServiceBreakdown />
          <KpiRow />
          <BookingsBoard />
          <SmartInsightsWidget />
        </div>
      </DashboardFiltersProvider>
    </UnifiedBookingsProvider>
  );
}
