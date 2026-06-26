"use client";

import { BadgePercent, DollarSign, FileClock, Receipt } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import type { FinancialReport } from "@/lib/api/financial-report";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function FinancialKpis({ kpis }: { kpis: FinancialReport["kpis"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label="Total Revenue (12 mo)"
        value={money(kpis.totalRevenue12mo)}
        icon={DollarSign}
        tone="emerald"
      />
      <KpiTile
        label="Transaction Fees (12 mo)"
        value={money(kpis.transactionFees12mo)}
        icon={Receipt}
        tone="indigo"
      />
      <KpiTile
        label="Outstanding A/R"
        value={money(kpis.outstanding)}
        hint="Unpaid invoices"
        icon={FileClock}
        tone={kpis.outstanding > 0 ? "amber" : "slate"}
      />
      <KpiTile
        label="Credits & Discounts"
        value={money(kpis.creditsCost)}
        hint="Cost to Yipyy"
        icon={BadgePercent}
        tone="rose"
      />
    </div>
  );
}
