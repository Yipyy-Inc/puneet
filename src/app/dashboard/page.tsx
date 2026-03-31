"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useHydrated } from "@/hooks/use-hydrated";
import { ModuleRequestsInbox } from "@/components/admin/ModuleRequestsInbox";
import { facilities } from "@/data/facilities";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Building2,
  CalendarCheck,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  Users,
  CreditCard,
  MessageSquare,
  Scissors,
  User,
  Shield,
} from "lucide-react";
import { useTransition } from "react";
import { setUserRole } from "@/lib/role-utils";

// Mock data for charts
const revenueData = [
  { month: "Jan", revenue: 45000, profit: 31500 },
  { month: "Feb", revenue: 52000, profit: 36400 },
  { month: "Mar", revenue: 48000, profit: 33600 },
  { month: "Apr", revenue: 61000, profit: 42700 },
  { month: "May", revenue: 55000, profit: 38500 },
  { month: "Jun", revenue: 67000, profit: 46900 },
  { month: "Jul", revenue: 72000, profit: 50400 },
  { month: "Aug", revenue: 69000, profit: 48300 },
  { month: "Sep", revenue: 75000, profit: 52500 },
  { month: "Oct", revenue: 78000, profit: 54600 },
  { month: "Nov", revenue: 81000, profit: 56700 },
  { month: "Dec", revenue: 85000, profit: 59500 },
];

const reservationVolumeData = [
  { month: "Jan", reservations: 320 },
  { month: "Feb", reservations: 380 },
  { month: "Mar", reservations: 420 },
  { month: "Apr", reservations: 510 },
  { month: "May", reservations: 480 },
  { month: "Jun", reservations: 620 },
  { month: "Jul", reservations: 750 },
  { month: "Aug", reservations: 710 },
  { month: "Sep", reservations: 680 },
  { month: "Oct", reservations: 720 },
  { month: "Nov", reservations: 810 },
  { month: "Dec", reservations: 890 },
];

const activityData = [
  { name: "Completed", value: 542, color: "#22c55e" },
  { name: "Pending", value: 156, color: "#f59e0b" },
  { name: "Cancelled", value: 88, color: "#ef4444" },
];

// Churn rate data (monthly)

// Facility activity data (for Active Facilities card)
const facilityActivityData = [
  {
    name: "Pawsome Care NYC",
    lastActivity: "2 min ago",
    status: "active" as const,
  },
  {
    name: "Happy Tails LA",
    lastActivity: "5 min ago",
    status: "active" as const,
  },
  {
    name: "Pet Paradise Miami",
    lastActivity: "12 min ago",
    status: "active" as const,
  },
  {
    name: "Bark & Play Chicago",
    lastActivity: "18 min ago",
    status: "active" as const,
  },
];

// Top facilities by reservations
const topFacilitiesByReservations = [
  { name: "Pawsome Care NYC", reservations: 1842, trend: "+12%" },
  { name: "Happy Tails LA", reservations: 1567, trend: "+8%" },
  { name: "Pet Paradise Miami", reservations: 1234, trend: "+15%" },
  { name: "Bark & Play Chicago", reservations: 1089, trend: "+5%" },
];

// Module health data
const moduleHealthData = [
  {
    name: "Booking",
    icon: Calendar,
    status: "operational" as const,
    uptime: 99.9,
  },
  {
    name: "Staff Scheduling",
    icon: Users,
    status: "operational" as const,
    uptime: 99.8,
  },
  {
    name: "Customer Management",
    icon: Users,
    status: "degraded" as const,
    uptime: 98.2,
  },
  {
    name: "Financial Reporting",
    icon: CreditCard,
    status: "operational" as const,
    uptime: 99.9,
  },
  {
    name: "Communication",
    icon: MessageSquare,
    status: "operational" as const,
    uptime: 99.7,
  },
  {
    name: "Grooming",
    icon: Scissors,
    status: "operational" as const,
    uptime: 99.9,
  },
];

function SystemHealthCard({ overallHealth }: { overallHealth: number }) {
  const getStatusIcon = (status: "operational" | "degraded" | "down") => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="text-success size-3.5" />;
      case "degraded":
        return <AlertCircle className="text-warning size-3.5" />;
      case "down":
        return <XCircle className="text-destructive size-3.5" />;
    }
  };

  return (
    <Card className="hover:shadow-elevated group shadow-card relative overflow-hidden border-0 transition-all duration-300">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              System Health
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">
                {overallHealth}%
              </h3>
              <span className="text-muted-foreground inline-flex items-center text-xs font-medium">
                Operational
              </span>
            </div>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
            }}
          >
            <Activity className="size-5 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          {moduleHealthData.map((module) => (
            <div
              key={module.name}
              className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-md px-2 py-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <module.icon className="text-muted-foreground size-3.5" />
                <span className="text-xs font-medium">{module.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px]">
                  {module.uptime}%
                </span>
                {getStatusIcon(module.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveFacilitiesCard({
  activeFacilities,
  totalFacilities,
}: {
  activeFacilities: number;
  totalFacilities: number;
}) {
  return (
    <Card className="hover:shadow-elevated group shadow-card relative overflow-hidden border-0 transition-all duration-300">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              Active Facilities
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">
                {activeFacilities}
              </h3>
              <span className="text-success inline-flex items-center text-xs font-medium">
                <TrendingUp className="mr-0.5 size-3" />
                +2 new
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              of {totalFacilities} total
            </p>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            }}
          >
            <Building2 className="size-5 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Latest Activity
          </p>
          {facilityActivityData.map((facility) => (
            <div
              key={facility.name}
              className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-md px-2 py-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="bg-success h-1.5 w-1.5 animate-pulse rounded-full" />
                <span className="max-w-[120px] truncate text-xs font-medium">
                  {facility.name}
                </span>
              </div>
              <span className="text-muted-foreground text-[10px]">
                {facility.lastActivity}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReservationsCard({
  totalReservations,
}: {
  totalReservations: number;
}) {
  const isMounted = useHydrated();

  // Format number only on client to avoid hydration issues
  const formattedNumber = isMounted
    ? totalReservations.toLocaleString("en-US")
    : totalReservations.toString();

  return (
    <Card className="hover:shadow-elevated group shadow-card relative overflow-hidden border-0 transition-all duration-300">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              Total Reservations
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">
                {formattedNumber}
              </h3>
              <span className="text-success inline-flex items-center text-xs font-medium">
                <TrendingUp className="mr-0.5 size-3" />
                +8.2%
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              vs last month 7,660
            </p>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            }}
          >
            <CalendarCheck className="size-5 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Top Facilities
          </p>
          {topFacilitiesByReservations.map((facility) => (
            <div
              key={facility.name}
              className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-md px-2 py-1 transition-colors"
            >
              <span className="max-w-[120px] truncate text-xs font-medium">
                {facility.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium">
                  {isMounted
                    ? facility.reservations.toLocaleString("en-US")
                    : facility.reservations.toString()}
                </span>
                <span className="text-success text-[10px]">
                  {facility.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  subtitle?: string;
  icon: React.ElementType;
  iconBgStyle: React.CSSProperties;
  chart?: React.ReactNode;
}

function StatCard({
  title,
  value,
  change,
  changeType,
  subtitle,
  icon: Icon,
  iconBgStyle,
  chart,
}: StatCardProps) {
  return (
    <Card className="hover:shadow-elevated group shadow-card relative overflow-hidden border-0 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              <span
                className={`inline-flex items-center text-xs font-medium ${
                  changeType === "up"
                    ? "text-success"
                    : changeType === "down"
                      ? "text-destructive"
                      : "text-muted-foreground"
                } `}
              >
                {changeType === "up" ? (
                  <TrendingUp className="mr-0.5 size-3" />
                ) : changeType === "down" ? (
                  <TrendingDown className="mr-0.5 size-3" />
                ) : null}
                {change}
              </span>
            </div>
            {subtitle && (
              <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
            )}
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={iconBgStyle}
          >
            <Icon className="size-5 text-white" />
          </div>
        </div>
        {chart && <div className="mt-4 h-12">{chart}</div>}
      </CardContent>
    </Card>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const sparkData = data.map((value, index) => ({ value, index }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sparkData}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${color})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "12m">(
    "12m",
  );
  const [isPending, startTransition] = useTransition();

  const switchToFacility = () => {
    startTransition(() => {
      setUserRole("facility_admin");
      window.location.href = "/facility/dashboard";
    });
  };

  const switchToCustomer = () => {
    startTransition(() => {
      window.location.href = "/customer/dashboard";
    });
  };

  // Calculate key metrics from facilities data
  const metrics = useMemo(() => {
    const activeFacilities = facilities.filter((f) => f.status === "active");
    const totalClients = facilities.reduce(
      (sum, f) => sum + f.clients.length,
      0,
    );
    const totalUsers = facilities.reduce(
      (sum, f) => sum + f.usersList.length,
      0,
    );

    return {
      totalFacilities: facilities.length,
      activeFacilities: activeFacilities.length,
      totalReservations: 8290,
      totalRevenue: 788000,
      activeUsers: totalUsers + totalClients,
      systemHealth: 99.8,
      totalClients,
    };
  }, []);

  // Generate facility performance data
  const facilityPerformance = useMemo(() => {
    const totalClients = facilities.reduce(
      (sum, f) => sum + f.clients.length,
      0,
    );

    return facilities.map((facility, index) => {
      const proportion = facility.clients.length / totalClients;
      const revenue = Math.round(788000 * proportion);
      const reservations = Math.round(8290 * proportion);
      const occupancy = Math.round(65 + ((index * 7) % 30));
      const growth = Math.round(-10 + ((index * 13) % 35));

      return {
        id: facility.id,
        name: facility.name,
        status: facility.status,
        plan: facility.plan,
        revenue,
        reservations,
        clients: facility.clients.length,
        staff: facility.usersList.length,
        locations: facility.locationsList.length,
        occupancy,
        growth,
      };
    });
  }, []);

  // Sort facilities for top performers
  const sortedByRevenue = [...facilityPerformance].sort(
    (a, b) => b.revenue - a.revenue,
  );
  const topPerformers = sortedByRevenue.slice(0, 5);

  return (
    <div className="bg-gradient-mesh bg-background min-h-screen flex-1 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">
            {"Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {"Welcome back! Here's what's happening today 🐾"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as typeof timeRange)}
          >
            <SelectTrigger className="border-border/50 bg-card h-10 w-36 rounded-xl shadow-sm">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Module Requests */}
      <div className="mb-8">
        <ModuleRequestsInbox />
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${(metrics.totalRevenue / 1000).toFixed(0)}K`}
          change="+12.5%"
          changeType="up"
          subtitle="vs last month $702K"
          icon={DollarSign}
          iconBgStyle={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          }}
          chart={
            <MiniSparkline
              data={revenueData.map((d) => d.revenue)}
              color="#0ea5e9"
            />
          }
        />
        <ReservationsCard totalReservations={metrics.totalReservations} />
        <ActiveFacilitiesCard
          activeFacilities={metrics.activeFacilities}
          totalFacilities={metrics.totalFacilities}
        />
        <SystemHealthCard overallHealth={metrics.systemHealth} />
      </div>

      {/* Portal Switcher - Quick Actions */}
      <Card className="shadow-card mb-8 border-0">
        <CardHeader>
          <CardTitle>Portal Switcher</CardTitle>
          <CardDescription>
            Switch between different portals to test the user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={switchToFacility}
              disabled={isPending}
            >
              <Building2 className="mr-2 size-4" />
              Switch to Facility
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={switchToCustomer}
              disabled={isPending}
            >
              <User className="mr-2 size-4" />
              Switch to Customer
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => {
                startTransition(() => {
                  setUserRole("super_admin");
                  window.location.href = "/dashboard";
                });
              }}
              disabled={isPending}
            >
              <Shield className="mr-2 size-4" />
              Switch to Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart - Takes 2 columns */}
        <Card className="shadow-card border-0 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                Revenue Overview
              </CardTitle>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Monthly revenue and profit trends
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="monthly">
                <SelectTrigger className="h-8 w-28 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold">$788K</p>
                <p className="text-muted-foreground text-xs">Total Revenue</p>
              </div>
              <div className="bg-border h-8 w-px" />
              <div>
                <p className="text-success text-2xl font-bold">$551K</p>
                <p className="text-muted-foreground text-xs">Total Profit</p>
              </div>
              <div className="text-success ml-auto flex items-center gap-1 text-sm">
                <TrendingUp className="size-4" />
                <span className="font-medium">+18.2%</span>
                <span className="text-muted-foreground">vs last year</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorProfit"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(value) => `$${value / 1000}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow:
                        "0 4px 16px -2px rgba(0, 0, 0, 0.1), 0 8px 32px -4px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: unknown) => [
                      `$${typeof value === "number" ? (value || 0).toLocaleString() : "0"}`,
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: "16px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fill="url(#colorRevenue)"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fill="url(#colorProfit)"
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity Donut Chart */}
        <Card className="shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                Reservation Status
              </CardTitle>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Current month breakdown
              </p>
            </div>
            <Select defaultValue="monthly">
              <SelectTrigger className="h-8 w-24 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold">786</p>
                <p className="text-muted-foreground text-xs">Total</p>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-6">
              {activityData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold">{item.value}</p>
                    <p className="text-muted-foreground text-xs">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Reservations Chart */}
        <Card className="shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                Reservation Trends
              </CardTitle>
              <p className="text-muted-foreground mt-0.5 text-sm">
                <span className="text-success font-medium">+178%</span> growth
                this year
              </p>
            </div>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reservationVolumeData} barSize={32}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow:
                        "0 4px 16px -2px rgba(0, 0, 0, 0.1), 0 8px 32px -4px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="reservations"
                    fill="#8b5cf6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-semibold">
                Top Performers
              </CardTitle>
              <p className="text-muted-foreground mt-0.5 text-sm">By revenue</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href="/dashboard/facilities">
                View All
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map((facility, index) => (
                <div
                  key={facility.id}
                  className="hover:bg-muted/30 flex items-center gap-3 rounded-lg p-2 transition-colors"
                >
                  <div
                    className={`flex size-7 items-center justify-center rounded-md text-xs font-bold ${
                      index === 0
                        ? "bg-amber-100 text-amber-700"
                        : index === 1
                          ? "bg-slate-100 text-slate-600"
                          : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-muted text-muted-foreground"
                    } `}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {facility.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {facility.clients} clients
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ${(facility.revenue / 1000).toFixed(1)}K
                    </p>
                    <div
                      className={`flex items-center justify-end gap-0.5 text-xs ${
                        facility.growth > 0
                          ? "text-success"
                          : "text-destructive"
                      } `}
                    >
                      {facility.growth > 0 ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {facility.growth > 0 ? "+" : ""}
                      {facility.growth}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facility Cards Grid */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">All Facilities</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1">
            <Link href="/dashboard/facilities">
              View All {facilities.length}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facilityPerformance.slice(0, 8).map((facility) => (
            <Card
              key={facility.id}
              className="hover:shadow-elevated group shadow-card cursor-pointer border-0 transition-all duration-300"
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="group-hover:text-primary truncate text-sm/tight font-semibold transition-colors">
                      {facility.name}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge
                        variant={
                          facility.status === "active" ? "default" : "secondary"
                        }
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {facility.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {facility.plan}
                      </Badge>
                    </div>
                  </div>
                  <div
                    className={`flex size-7 items-center justify-center rounded-lg ${
                      facility.growth > 0
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    } `}
                  >
                    {facility.growth > 0 ? (
                      <TrendingUp className="size-3.5" />
                    ) : (
                      <TrendingDown className="size-3.5" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Revenue</p>
                    <p className="mt-0.5 font-semibold">
                      ${(facility.revenue / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Occupancy</p>
                    <p className="mt-0.5 font-semibold">
                      {facility.occupancy}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Growth</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                        <div
                          className={`h-full rounded-full ${
                            facility.growth > 0
                              ? `bg-success`
                              : `bg-destructive`
                          } `}
                          style={{
                            width: `${Math.min(Math.abs(facility.growth) * 3, 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`font-semibold ${
                          facility.growth > 0
                            ? `text-success`
                            : `text-destructive`
                        } `}
                      >
                        {facility.growth > 0 ? "+" : ""}
                        {facility.growth}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-border/50 text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-xs">
                  <span>
                    {facility.staff} staff • {facility.clients} clients
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
