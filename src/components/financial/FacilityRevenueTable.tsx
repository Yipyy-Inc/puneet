"use client";

import { RevenueReport } from "@/components/financial/RevenueReport";

/**
 * Day-by-day revenue tracking with the service split, reconciled to the raw
 * transaction totals. Driven by the report-data-sources selectors.
 */
export function FacilityRevenueTable() {
  return (
    <RevenueReport
      title="Revenue Tracking"
      subtitle="Daily revenue and service mix, reconciled to transaction totals"
      sections={["service", "dailyTable"]}
    />
  );
}
