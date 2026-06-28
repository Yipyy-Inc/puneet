"use client";

import dynamic from "next/dynamic";
import { Building2, DollarSign, Package, TrendingUp } from "lucide-react";

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
  FacilitiesReport,
  FacilityMrrRow,
} from "@/lib/api/facilities-report";

function ChartSkeleton() {
  return (
    <div className="bg-muted/40 text-muted-foreground flex h-[300px] w-full items-center justify-center rounded-md text-sm">
      Loading chart…
    </div>
  );
}

const FeatureAdoptionChart = dynamic(
  () => import("./feature-adoption-chart").then((m) => m.FeatureAdoptionChart),
  { ssr: false, loading: ChartSkeleton },
);
const LoginFrequencyChart = dynamic(
  () => import("./login-frequency-chart").then((m) => m.LoginFrequencyChart),
  { ssr: false, loading: ChartSkeleton },
);
const BookingTrendChart = dynamic(
  () => import("./booking-trend-chart").then((m) => m.BookingTrendChart),
  { ssr: false, loading: ChartSkeleton },
);

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const signedPct = (n: number) =>
  `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}%`;

export function FacilitiesReportClient({
  report,
}: {
  report: FacilitiesReport;
}) {
  const { kpis, topByMrr, moduleAdoption, loginDistribution, bookingTrend } =
    report;

  const columns: ColumnDef<FacilityMrrRow>[] = [
    {
      key: "facility",
      label: "Facility",
      sortable: true,
      sortValue: (r) => r.facility,
      render: (r) => <span className="font-medium">{r.facility}</span>,
    },
    {
      key: "plan",
      label: "Plan",
      render: (r) => (
        <Badge variant="secondary" className="font-normal">
          {r.plan}
        </Badge>
      ),
    },
    {
      key: "mrr",
      label: "MRR",
      sortable: true,
      sortValue: (r) => r.mrr,
      render: (r) => (
        <span className="font-semibold tabular-nums">{money(r.mrr)}/mo</span>
      ),
    },
    {
      key: "pctOfRevenue",
      label: "% of Revenue",
      sortable: true,
      sortValue: (r) => r.pctOfRevenue,
      render: (r) => (
        <span className="tabular-nums">{r.pctOfRevenue.toFixed(1)}%</span>
      ),
    },
    {
      key: "growthPct",
      label: "MRR Growth",
      sortable: true,
      sortValue: (r) => r.growthPct,
      render: (r) => (
        <span
          className={`tabular-nums ${
            r.growthPct > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : r.growthPct < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
          }`}
        >
          {signedPct(r.growthPct)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Facilities"
          value={kpis.totalFacilities}
          icon={Building2}
          tone="violet"
        />
        <KpiTile
          label="Total MRR"
          value={money(kpis.totalMrr)}
          hint="Across all facilities"
          icon={DollarSign}
          tone="emerald"
        />
        <KpiTile
          label="Avg MRR / Facility"
          value={money(kpis.avgMrr)}
          hint="Paying facilities"
          icon={TrendingUp}
          tone="indigo"
        />
        <KpiTile
          label="Modules Tracked"
          value={kpis.modulesTracked}
          icon={Package}
          tone="slate"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Facilities by MRR</CardTitle>
          <CardDescription>
            Ranked by monthly recurring revenue, with each facility&apos;s share
            of platform revenue and month-over-month change
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={topByMrr}
            columns={columns}
            searchKey="facility"
            searchPlaceholder="Search facilities…"
            itemsPerPage={11}
            emptyState={{
              icon: Building2,
              title: "No facility revenue yet",
              description:
                "Once facilities start paying, they'll be ranked here by monthly recurring revenue.",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Adoption</CardTitle>
          <CardDescription>
            Per module — % of facilities with it enabled vs. % actively using it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeatureAdoptionChart data={moduleAdoption} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Frequency Distribution</CardTitle>
          <CardDescription>
            Facilities grouped by how recently they were last active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginFrequencyChart data={loginDistribution} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Volume Trend</CardTitle>
          <CardDescription>
            Platform-wide weekly bookings over the last 12 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingTrendChart data={bookingTrend} />
        </CardContent>
      </Card>
    </div>
  );
}
