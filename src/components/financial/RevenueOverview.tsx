"use client";

import { RevenueReport } from "@/components/financial/RevenueReport";

/**
 * Transaction-driven revenue overview — gross→net breakdown, trend, tender mix
 * and service split, all reconciled to the raw transaction totals. Driven by
 * the report-data-sources selectors (revenueByPeriod / revenueSummary).
 */
export function RevenueOverview() {
  return (
    <RevenueReport
      title="Revenue Overview"
      subtitle="Gross, net, tax, tips and tender mix for the selected period"
      sections={["breakdown", "trend", "paymentMethods", "service"]}
    />
  );
}
