"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case "degraded":
        return <AlertCircle className="h-3.5 w-3.5 text-warning" />;
      case "down":
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    }
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              System Health
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">
                {overallHealth}%
              </h3>
              <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                Operational
              </span>
            </div>
          </div>
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
            }}
          >
            <Activity className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          {moduleHealthData.map((module) => (
            <div
              key={module.name}
              className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <module.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{module.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
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
    <Card className="relative overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Active Facilities
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">
                {activeFacilities}
              </h3>
              <span className="inline-flex items-center text-xs font-medium text-success">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +2 new
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              of {totalFacilities} total
            </p>
          </div>
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">
            Latest Activity
          </p>
          {facilityActivityData.map((facility) => (
            <div
              key={facility.name}
              className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {facility.name}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format number only on client to avoid hydration issues
  const formattedNumber = isMounted 
    ? totalReservations.toLocaleString("en-US")
    : totalReservations.toString();

  return (
    <Card className="relative overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Total Reservations
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">
                {formattedNumber}
              </h3>
              <span className="inline-flex items-center text-xs font-medium text-success">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                +8.2%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              vs last month 7,660
            </p>
          </div>
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            }}
          >
            <CalendarCheck className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">
            Top Facilities
          </p>
          {topFacilitiesByReservations.map((facility) => (
            <div
              key={facility.name}
              className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-xs font-medium truncate max-w-[120px]">
                {facility.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium">
                  {isMounted 
                    ? facility.reservations.toLocaleString("en-US")
                    : facility.reservations.toString()}
                </span>
                <span className="text-[10px] text-success">
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
    <Card className="relative overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
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
                }`}
              >
                {changeType === "up" ? (
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                ) : changeType === "down" ? (
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                ) : null}
                {change}
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={iconBgStyle}
          >
            <Icon className="h-5 w-5 text-white" />
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
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
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
            <SelectTrigger className="w-36 h-10 rounded-xl border-border/50 bg-card shadow-sm">
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

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
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
      <Card className="mb-8 border-0 shadow-card">
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
              <Building2 className="mr-2 h-4 w-4" />
              Switch to Facility
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={switchToCustomer}
              disabled={isPending}
            >
              <User className="mr-2 h-4 w-4" />
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
              <Shield className="mr-2 h-4 w-4" />
              Switch to Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Revenue Chart - Takes 2 columns */}
        <Card className="lg:col-span-2 border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                Revenue Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Monthly revenue and profit trends
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="monthly">
                <SelectTrigger className="w-28 h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-2xl font-bold">$788K</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-success">$551K</p>
                <p className="text-xs text-muted-foreground">Total Profit</p>
              </div>
              <div className="flex items-center gap-1 ml-auto text-sm text-success">
                <TrendingUp className="h-4 w-4" />
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
                    formatter={(value: number | undefined) => [
                      `$${(value || 0).toLocaleString()}`,
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
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                Reservation Status
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Current month breakdown
              </p>
            </div>
            <Select defaultValue="monthly">
              <SelectTrigger className="w-24 h-8 text-xs rounded-lg">
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
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {activityData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Reservations Chart */}
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                Reservation Trends
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                <span className="text-success font-medium">+178%</span> growth
                this year
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
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
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-semibold">
                Top Performers
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">By revenue</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href="/dashboard/facilities">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map((facility, index) => (
                <div
                  key={facility.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${
                      index === 0
                        ? "bg-amber-100 text-amber-700"
                        : index === 1
                          ? "bg-slate-100 text-slate-600"
                          : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {facility.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {facility.clients} clients
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      ${(facility.revenue / 1000).toFixed(1)}K
                    </p>
                    <div
                      className={`flex items-center justify-end gap-0.5 text-xs ${
                        facility.growth > 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {facility.growth > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">All Facilities</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1">
            <Link href="/dashboard/facilities">
              View All {facilities.length}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facilityPerformance.slice(0, 8).map((facility) => (
            <Card
              key={facility.id}
              className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate leading-tight group-hover:text-primary transition-colors">
                      {facility.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge
                        variant={
                          facility.status === "active" ? "default" : "secondary"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {facility.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {facility.plan}
                      </Badge>
                    </div>
                  </div>
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                      facility.growth > 0
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {facility.growth > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Revenue</p>
                    <p className="font-semibold mt-0.5">
                      ${(facility.revenue / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Occupancy</p>
                    <p className="font-semibold mt-0.5">
                      {facility.occupancy}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Growth</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${facility.growth > 0 ? "bg-success" : "bg-destructive"}`}
                          style={{
                            width: `${Math.min(Math.abs(facility.growth) * 3, 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`font-semibold ${facility.growth > 0 ? "text-success" : "text-destructive"}`}
                      >
                        {facility.growth > 0 ? "+" : ""}
                        {facility.growth}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
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
