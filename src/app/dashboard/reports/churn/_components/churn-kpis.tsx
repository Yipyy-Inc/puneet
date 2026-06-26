"use client";

import { Clock, Repeat, TrendingDown } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import type { ChurnKpis as ChurnKpisData } from "@/lib/api/churn";

export function ChurnKpis({ kpis }: { kpis: ChurnKpisData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <KpiTile
        label="Monthly Churn Rate"
        value={`${kpis.monthlyChurnRate}%`}
        hint={`12-mo avg ${kpis.avgChurnRate12mo}%`}
        icon={TrendingDown}
        tone={kpis.monthlyChurnRate > 4 ? "rose" : "amber"}
      />
      <KpiTile
        label="Avg Customer Lifetime"
        value={`${kpis.avgLifetimeMonths} mo`}
        hint={`≈ ${(kpis.avgLifetimeMonths / 12).toFixed(1)} years`}
        icon={Clock}
        tone="indigo"
      />
      <KpiTile
        label="Net Revenue Retention"
        value={`${kpis.nrr}%`}
        hint={`Gross retention ${kpis.grr}%`}
        icon={Repeat}
        tone={kpis.nrr >= 100 ? "emerald" : "amber"}
        alert={
          kpis.nrr < 100 ? { label: "Below 100%", tone: "amber" } : undefined
        }
      />
    </div>
  );
}
