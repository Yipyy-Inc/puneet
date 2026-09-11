"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import { useMembershipPlans, useMemberships } from "@/lib/api/memberships";
import {
  churnRate as churnRateOf,
  monthlyRevenue,
  monthlyTrend,
} from "@/lib/memberships/figures";
import {
  formatDateISO,
  formatMoney,
  formatMonthShort,
} from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { NO_ITEMS } from "@/lib/no-items";

// The desaturated chart families (§1) — never a plan's badge colour, which is
// the facility's choice and was never measured against anything.
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// ── EVERY LINE ON THIS TAB IS COUNTED ──────────────────────────────────────
//
// The KPI tiles read the fixture, and the four charts drew a "12-month trend"
// that was today's total multiplied by 0.55, 0.59, 0.63… — a line that
// always rose — beside "+12.4% vs last mo" and "+7 this month", typed in.
// Everything below is counted from the facility's subscriptions by
// lib/memberships/figures, and the deltas compare this month with the last.
export function InsightsTab() {
  const { t, fill, locale } = useStaffText("memberships");
  const { data: subs } = useMemberships();
  const { data: planRows } = useMembershipPlans();
  const memberships = subs ?? NO_ITEMS;
  const membershipPlans = planRows ?? NO_ITEMS;
  const fmt = (n: number) => formatMoney(n, locale, { whole: true });

  const mrr = monthlyRevenue(memberships);
  const activeCount = memberships.filter((m) => m.status === "active").length;
  const churnRate = churnRateOf(memberships).toFixed(1);

  const trend = useMemo(
    () =>
      monthlyTrend(memberships, formatDateISO(new Date())).map((p) => ({
        ...p,
        month: formatMonthShort(p.month, locale),
      })),
    [memberships, locale],
  );
  const thisMonth = trend[trend.length - 1];
  const lastMonth = trend[trend.length - 2];
  const newThisMonth = memberships.filter(
    (m) => m.startDate.slice(0, 7) === formatDateISO(new Date()).slice(0, 7),
  ).length;
  const mrrDelta =
    lastMonth && lastMonth.mrr > 0
      ? ((thisMonth.mrr - lastMonth.mrr) / lastMonth.mrr) * 100
      : null;

  const planDistribution = useMemo(() => {
    return membershipPlans
      .map((p) => ({
        name: p.name,
        value: memberships.filter(
          (m) =>
            m.planId === p.id &&
            (m.status === "active" || m.status === "paused"),
        ).length,
      }))
      .filter((p) => p.value > 0);
  }, [membershipPlans, memberships]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="MRR"
          value={fmt(mrr)}
          icon={<DollarSign className="size-4" />}
          delta={
            mrrDelta === null
              ? t("noLastMonth")
              : fill("vsLastMonth", {
                  change: `${mrrDelta >= 0 ? "+" : ""}${mrrDelta.toFixed(1)}`,
                })
          }
        />
        <KpiCard
          label="Active subscribers"
          value={activeCount.toString()}
          icon={<Users className="size-4" />}
          trend={
            newThisMonth > 0 ? (
              <TrendingUp className="size-3 text-emerald-600" />
            ) : undefined
          }
          delta={fill("newThisMonth", { count: newThisMonth })}
        />
        <KpiCard
          label="Churn rate"
          value={`${churnRate}%`}
          icon={<TrendingDown className="size-4" />}
          delta={t("everSubscribed")}
        />
        <KpiCard
          label="ARPU"
          value={fmt(activeCount > 0 ? mrr / activeCount : 0)}
          icon={<DollarSign className="size-4" />}
          delta="Avg. per subscriber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">MRR trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="mrrG" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#mrrG)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Subscriber growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="subscribers"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Plan distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {planDistribution.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                No subscribers yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {planDistribution.map((p, i) => (
                      <Cell key={p.name} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly churn (count)</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="churn"
                  fill="var(--chart-5)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  trend,
  delta,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: React.ReactNode;
  delta: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-4">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            {icon}
            {label}
          </span>
          {trend}
        </div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-muted-foreground text-xs">{delta}</div>
      </CardContent>
    </Card>
  );
}
