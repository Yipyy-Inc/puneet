"use client";

import dynamic from "next/dynamic";
import { Cpu, DollarSign, Gauge, Server, Users } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import type {
  AiFacilityTokenRow,
  ModuleUsageRow,
  UsageReport,
} from "@/lib/api/usage-report";

function ChartSkeleton() {
  return (
    <div className="bg-muted/40 text-muted-foreground flex h-[280px] w-full items-center justify-center rounded-md text-sm">
      Loading chart…
    </div>
  );
}

const DauChart = dynamic(() => import("./dau-chart").then((m) => m.DauChart), {
  ssr: false,
  loading: ChartSkeleton,
});
const ApiVolumeChart = dynamic(
  () => import("./api-volume-chart").then((m) => m.ApiVolumeChart),
  { ssr: false, loading: ChartSkeleton },
);
const AiCostChart = dynamic(
  () => import("./ai-cost-chart").then((m) => m.AiCostChart),
  { ssr: false, loading: ChartSkeleton },
);

const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
};
const money = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function UsageReportClient({ report }: { report: UsageReport }) {
  const { kpis, dau, moduleUsage, apiVolume, aiTopFacilities, aiCostTrend } =
    report;

  const moduleColumns: ColumnDef<ModuleUsageRow>[] = [
    {
      key: "module",
      label: "Module",
      sortable: true,
      sortValue: (r) => r.module,
      render: (r) => <span className="font-medium">{r.module}</span>,
    },
    {
      key: "enabled",
      label: "Enabled",
      sortable: true,
      sortValue: (r) => r.enabled,
      render: (r) => <span className="tabular-nums">{r.enabled}</span>,
    },
    {
      key: "activelyUsing",
      label: "Actively Using",
      sortable: true,
      sortValue: (r) => r.activelyUsing,
      render: (r) => <span className="tabular-nums">{r.activelyUsing}</span>,
    },
    {
      key: "usageRate",
      label: "Usage Rate",
      sortable: true,
      sortValue: (r) => r.usageRate,
      render: (r) => (
        <span
          className={`tabular-nums ${
            r.usageRate >= 80
              ? "text-emerald-600 dark:text-emerald-400"
              : r.usageRate < 60
                ? "text-amber-600 dark:text-amber-400"
                : ""
          }`}
        >
          {r.usageRate}%
        </span>
      ),
    },
  ];

  const aiColumns: ColumnDef<AiFacilityTokenRow>[] = [
    {
      key: "facility",
      label: "Facility",
      sortable: true,
      sortValue: (r) => r.facility,
      render: (r) => <span className="font-medium">{r.facility}</span>,
    },
    {
      key: "tokens",
      label: "Tokens (mo)",
      sortable: true,
      sortValue: (r) => r.tokens,
      render: (r) => (
        <span className="font-semibold tabular-nums">{compact(r.tokens)}</span>
      ),
    },
    {
      key: "requests",
      label: "Requests",
      sortable: true,
      sortValue: (r) => r.requests,
      render: (r) => <span className="tabular-nums">{r.requests}</span>,
    },
    {
      key: "cost",
      label: "Est. Cost",
      sortable: true,
      sortValue: (r) => r.cost,
      render: (r) => <span className="tabular-nums">{money(r.cost)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile
          label="Avg Daily Active Users"
          value={kpis.avgDau}
          hint="Facility staff, 30-day avg"
          icon={Users}
          tone="indigo"
        />
        <KpiTile
          label="API Requests (30d)"
          value={compact(kpis.apiRequests30d)}
          icon={Server}
          tone="slate"
        />
        <KpiTile
          label="Avg API Response"
          value={`${kpis.avgApiResponseMs} ms`}
          icon={Gauge}
          tone="amber"
        />
        <KpiTile
          label="AI Tokens This Month"
          value={compact(kpis.aiTokensThisMonth)}
          icon={Cpu}
          tone="violet"
        />
        <KpiTile
          label="AI Cost This Month"
          value={money(kpis.aiCostThisMonth)}
          icon={DollarSign}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Active Users</CardTitle>
          <CardDescription>
            Facility staff active per day — 30-day rolling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DauChart data={dau} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Volume</CardTitle>
          <CardDescription>
            Daily request count and average response time over 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiVolumeChart data={apiVolume} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Usage</CardTitle>
          <CardDescription>
            Enabled and actively-using facility counts per module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={moduleUsage}
            columns={moduleColumns}
            searchKey="module"
            searchPlaceholder="Search modules…"
            itemsPerPage={10}
            emptyState={{
              icon: Gauge,
              title: "No module usage yet",
              description: "Module adoption will appear once facilities start using features.",
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Top Facilities by AI Tokens
              <Badge variant="secondary" className="text-[10px]">
                Top 10
              </Badge>
            </CardTitle>
            <CardDescription>
              Token consumption this month, by facility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={aiTopFacilities}
              columns={aiColumns}
              searchKey="facility"
              searchPlaceholder="Search facilities…"
              itemsPerPage={10}
              emptyState={{
                icon: Cpu,
                title: "No AI usage yet",
                description: "Facility AI token consumption will appear here once usage is recorded.",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Cost Per Month</CardTitle>
            <CardDescription>
              Platform-wide estimated AI cost over 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiCostChart data={aiCostTrend} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
