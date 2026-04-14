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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import {
  memberships,
  membershipPlans,
} from "@/data/services-pricing";

const PALETTE = [
  "#D4AF37",
  "#6B46C1",
  "#3B82F6",
  "#14B8A6",
  "#F97316",
  "#EC4899",
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function InsightsTab() {
  const mrr = useMemo(
    () =>
      memberships
        .filter((m) => m.status === "active")
        .reduce((sum, m) => sum + m.monthlyPrice, 0),
    [],
  );

  const activeCount = memberships.filter((m) => m.status === "active").length;
  const churnRate = (
    (memberships.filter((m) => m.status === "cancelled").length /
      Math.max(memberships.length, 1)) *
    100
  ).toFixed(1);

  // Synthetic 12-month trend derived from seed data for visual demo
  const trend = useMemo(() => {
    const months = [
      "May", "Jun", "Jul", "Aug", "Sep", "Oct",
      "Nov", "Dec", "Jan", "Feb", "Mar", "Apr",
    ];
    return months.map((m, i) => {
      const pct = 0.55 + i * 0.04;
      return {
        month: m,
        mrr: Math.round(mrr * pct),
        subscribers: Math.round(activeCount * pct),
        churn: Math.max(0, 4 - Math.round(i / 3)),
      };
    });
  }, [mrr, activeCount]);

  const planDistribution = useMemo(() => {
    return membershipPlans
      .map((p) => ({
        name: p.name,
        value: memberships.filter((m) => m.planId === p.id).length,
        color: p.badgeColor,
      }))
      .filter((p) => p.value > 0);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="MRR"
          value={fmt(mrr)}
          icon={<DollarSign className="size-4" />}
          trend={<TrendingUp className="size-3 text-emerald-600" />}
          delta="+12.4% vs last mo"
        />
        <KpiCard
          label="Active subscribers"
          value={activeCount.toString()}
          icon={<Users className="size-4" />}
          trend={<TrendingUp className="size-3 text-emerald-600" />}
          delta="+7 this month"
        />
        <KpiCard
          label="Churn rate"
          value={`${churnRate}%`}
          icon={<TrendingDown className="size-4" />}
          delta="Trailing 30 days"
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
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#D4AF37"
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
                  stroke="#6B46C1"
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
                      <Cell
                        key={p.name}
                        fill={p.color ?? PALETTE[i % PALETTE.length]}
                      />
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
                <Bar dataKey="churn" fill="#EF4444" radius={[4, 4, 0, 0]} />
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
