"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Building2, DollarSign, Repeat, TrendingUp, Users } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BusinessReport } from "@/lib/api/business-report";

function ChartSkeleton() {
  return (
    <div className="bg-muted/40 text-muted-foreground flex h-[300px] w-full items-center justify-center rounded-md text-sm">
      Loading chart…
    </div>
  );
}

const MrrTrendChart = dynamic(
  () => import("./mrr-trend-chart").then((m) => m.MrrTrendChart),
  { ssr: false, loading: ChartSkeleton },
);
const RevenueByTierChart = dynamic(
  () => import("./revenue-by-tier-chart").then((m) => m.RevenueByTierChart),
  { ssr: false, loading: ChartSkeleton },
);
const FacilityGrowthChart = dynamic(
  () => import("./facility-growth-chart").then((m) => m.FacilityGrowthChart),
  { ssr: false, loading: ChartSkeleton },
);

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const signedMoney = (n: number) =>
  `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString()}`;

const RANGES = [
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "24", label: "Last 24 months" },
];

export function BusinessReportClient({ report }: { report: BusinessReport }) {
  const [range, setRange] = useState("12");
  const n = Number(range);
  const trend = useMemo(() => report.mrrTrend.slice(-n), [report.mrrTrend, n]);
  const growth = useMemo(
    () => report.facilityGrowth.slice(-n),
    [report.facilityGrowth, n],
  );
  const { kpis, revenueByTier, forecast } = report;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile
          label="MRR"
          value={money(kpis.mrr)}
          icon={DollarSign}
          tone="emerald"
        />
        <KpiTile
          label="ARR"
          value={money(kpis.arr)}
          hint="MRR × 12"
          icon={TrendingUp}
          tone="indigo"
        />
        <KpiTile
          label="Active Facilities"
          value={kpis.activeFacilities}
          icon={Building2}
          tone="violet"
        />
        <KpiTile
          label="Avg Revenue / Facility"
          value={money(kpis.avgRevenuePerFacility)}
          hint="per month"
          icon={Users}
          tone="slate"
        />
        <KpiTile
          label="Net Revenue Retention"
          value={`${kpis.nrr}%`}
          icon={Repeat}
          tone={kpis.nrr >= 100 ? "emerald" : "amber"}
          alert={
            kpis.nrr < 100 ? { label: "Below 100%", tone: "amber" } : undefined
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Date range controls the time-series charts below
        </p>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MRR Trend</CardTitle>
          <CardDescription>
            New, expansion, churned and net MRR per month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MrrTrendChart data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Tier</CardTitle>
            <CardDescription>
              Share of current MRR by subscription tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByTierChart data={revenueByTier} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facility Growth</CardTitle>
            <CardDescription>
              Cumulative active facilities over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FacilityGrowthChart data={growth} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast</CardTitle>
          <CardDescription>
            3-month projection at the trailing 6-month net run-rate (
            {signedMoney(forecast[0]?.netNewMrr ?? 0)}/mo)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs">
                <th className="px-2 py-2 text-left font-medium">Month</th>
                <th className="px-2 py-2 text-right font-medium">
                  Projected MRR
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  Projected ARR
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  Net New MRR
                </th>
                <th className="px-2 py-2 text-right font-medium">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {forecast.map((f) => (
                <tr key={f.month}>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">
                    {f.month}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">
                    {money(f.projectedMrr)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {money(f.projectedArr)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums ${
                      f.netNewMrr < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {signedMoney(f.netNewMrr)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {f.growthPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted-foreground mt-3 text-xs">
            Projection assumes the trailing run-rate continues; not a guarantee.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
