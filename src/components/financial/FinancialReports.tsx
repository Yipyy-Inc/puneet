"use client";

import { RevenueReport } from "@/components/financial/RevenueReport";

/**
 * Full financial report: reconciled gross→net breakdown, revenue trend
 * (day/week/month), service mix, tender mix and a day-by-day revenue table.
 * Driven entirely by the report-data-sources selectors.
 */
export function FinancialReports() {
  return (
    <RevenueReport
      title="Financial Report"
      subtitle="Complete revenue breakdown, reconciled to transaction totals"
    />
  );
}
