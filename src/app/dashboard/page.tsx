"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Clock,
  Megaphone,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  MoreHorizontal,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  Users,
  CreditCard,
  MessageSquare,
  Scissors,
  UserMinus,
  UserCheck,
  Mail,
  Headphones,
} from "lucide-react";

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
const churnRateData = [
  { month: "Jan", rate: 2.1 },
  { month: "Feb", rate: 1.9 },
  { month: "Mar", rate: 2.3 },
  { month: "Apr", rate: 1.8 },
  { month: "May", rate: 1.6 },
  { month: "Jun", rate: 1.5 },
];

// Daily active users data (last 7 days)
const dailyActiveUsersData = [
  { day: "Mon", staff: 165, customers: 1540 },
  { day: "Tue", staff: 172, customers: 1620 },
  { day: "Wed", staff: 168, customers: 1580 },
  { day: "Thu", staff: 175, customers: 1710 },
  { day: "Fri", staff: 180, customers: 1820 },
  { day: "Sat", staff: 155, customers: 1650 },
  { day: "Sun", staff: 172, customers: 1680 },
];

// SMS/Email communication usage data (last 6 months)
const communicationUsageData = [
  { month: "Jan", sms: 1200, email: 3200 },
  { month: "Feb", sms: 1350, email: 3500 },
  { month: "Mar", sms: 1280, email: 3800 },
  { month: "Apr", sms: 1450, email: 4100 },
  { month: "May", sms: 1680, email: 4500 },
  { month: "Jun", sms: 1540, email: 4300 },
];

// Facility performance heatmap data (metrics across facilities)
const allHeatmapMetrics = [
  { key: "revenue", label: "Revenue" },
  { key: "occupancy", label: "Occupancy" },
  { key: "bookings", label: "Bookings" },
  { key: "retention", label: "Retention" },
] as const;

type HeatmapMetricKey = (typeof allHeatmapMetrics)[number]["key"];
const facilityHeatmapData = [
  {
    facility: "Downtown Spa",
    revenue: 92,
    occupancy: 78,
    bookings: 85,
    retention: 88,
  },
  {
    facility: "Uptown Wellness",
    revenue: 65,
    occupancy: 82,
    bookings: 71,
    retention: 76,
  },
  {
    facility: "Metro Fitness",
    revenue: 88,
    occupancy: 91,
    bookings: 79,
    retention: 82,
  },
  {
    facility: "Harbor Health",
    revenue: 45,
    occupancy: 58,
    bookings: 52,
    retention: 61,
  },
  {
    facility: "Valley Care",
    revenue: 73,
    occupancy: 69,
    bookings: 81,
    retention: 77,
  },
  {
    facility: "Summit Studio",
    revenue: 81,
    occupancy: 75,
    bookings: 88,
    retention: 85,
  },
];

const getHeatmapColor = (value: number) => {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 70) return "bg-emerald-400";
  if (value >= 55) return "bg-amber-400";
  if (value >= 40) return "bg-orange-400";
  return "bg-red-400";
};

// Mock support requests count
const pendingSupportRequests = 5;

// Quick actions data
const quickActions = [
  {
    id: 1,
    label: "Add Facility",
    icon: Plus,
    href: "/dashboard/facilities/new",
  },
  {
    id: 2,
    label: "View Activity",
    icon: Clock,
    href: "/dashboard/analytics",
  },
  {
    id: 3,
    label: "Support Requests",
    icon: Headphones,
    href: "/dashboard/system-admin/support-ticketing",
    badge: pendingSupportRequests,
  },
  {
    id: 4,
    label: "Announce",
    icon: Megaphone,
    href: "/dashboard/announcements",
  },
];

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
                {totalReservations.toLocaleString()}
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
                  {facility.reservations.toLocaleString()}
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
  const t = useTranslations("dashboard");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "12m">(
    "12m",
  );
  const [selectedHeatmapMetrics, setSelectedHeatmapMetrics] = useState<
    HeatmapMetricKey[]
  >(["revenue", "occupancy", "bookings", "retention"]);

  const toggleHeatmapMetric = (metric: HeatmapMetricKey) => {
    setSelectedHeatmapMetrics((prev) =>
      prev.includes(metric)
        ? prev.length > 1
          ? prev.filter((m) => m !== metric)
          : prev
        : [...prev, metric],
    );
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
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("welcome")}</p>
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

      {/* Additional Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Churn Rate */}
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Churn Rate
              </CardTitle>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">1.5%</span>
                <span className="inline-flex items-center text-xs font-medium text-success">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  -0.3%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs last month 1.8%
              </p>
            </div>
            <div
              className="flex items-center justify-center w-11 h-11 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              }}
            >
              <UserMinus className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={churnRateData}>
                  <defs>
                    <linearGradient
                      id="churnGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#churnGradient)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Churn Rate"]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Active Users */}
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Daily Active Users
              </CardTitle>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">1,852</span>
                <span className="inline-flex items-center text-xs font-medium text-success">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +8.4%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                172 staff • 1,680 customers
              </p>
            </div>
            <div
              className="flex items-center justify-center w-11 h-11 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              }}
            >
              <UserCheck className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActiveUsersData} barSize={12}>
                  <Bar
                    dataKey="customers"
                    fill="#8b5cf6"
                    radius={[2, 2, 0, 0]}
                    stackId="stack"
                  />
                  <Bar
                    dataKey="staff"
                    fill="#c4b5fd"
                    radius={[2, 2, 0, 0]}
                    stackId="stack"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                <span className="text-muted-foreground">Customers</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#c4b5fd]" />
                <span className="text-muted-foreground">Staff</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS/Email Usage */}
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Communication Volume
              </CardTitle>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">31.9K</span>
                <span className="inline-flex items-center text-xs font-medium text-success">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +15.2%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                8.5K SMS • 23.4K emails
              </p>
            </div>
            <div
              className="flex items-center justify-center w-11 h-11 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
              }}
            >
              <Mail className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={communicationUsageData}>
                  <defs>
                    <linearGradient
                      id="smsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="emailGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="email"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#emailGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sms"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#smsGradient)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                <span className="text-muted-foreground">Email</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <span className="text-muted-foreground">SMS</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    formatter={(value: number) => [
                      `$${value.toLocaleString()}`,
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
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Reservations Chart */}
        <Card className="lg:col-span-2 border-0 shadow-card">
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

        {/* Quick Actions */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                  "badge" in action && action.badge
                    ? "bg-destructive/5 hover:bg-destructive/10 border border-destructive/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                    "badge" in action && action.badge
                      ? "bg-destructive/10 group-hover:bg-destructive/20"
                      : "bg-muted group-hover:bg-primary/10"
                  }`}
                >
                  <action.icon
                    className={`h-5 w-5 transition-colors ${
                      "badge" in action && action.badge
                        ? "text-destructive"
                        : "text-muted-foreground group-hover:text-primary"
                    }`}
                  />
                </div>
                <span className="font-medium text-sm flex-1">
                  {action.label}
                </span>
                {"badge" in action && action.badge ? (
                  <Badge variant="destructive" className="text-xs">
                    {action.badge}
                  </Badge>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Facility Performance Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Facility Performance Heatmap */}
        <Card className="lg:col-span-2 border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-semibold">
                Performance Heatmap
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Multi-metric comparison across facilities
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {allHeatmapMetrics.map((metric) => (
                <Button
                  key={metric.key}
                  variant={
                    selectedHeatmapMetrics.includes(metric.key)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleHeatmapMetric(metric.key)}
                >
                  {metric.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {/* Header row */}
              <div
                className="grid gap-2 mb-2"
                style={{
                  gridTemplateColumns: `minmax(120px, 1fr) repeat(${selectedHeatmapMetrics.length}, 1fr)`,
                }}
              >
                <div className="text-sm font-medium text-muted-foreground px-2" />
                {allHeatmapMetrics
                  .filter((m) => selectedHeatmapMetrics.includes(m.key))
                  .map((metric) => (
                    <div
                      key={metric.key}
                      className="text-sm font-medium text-muted-foreground text-center px-2"
                    >
                      {metric.label}
                    </div>
                  ))}
              </div>
              {/* Data rows */}
              <div className="space-y-2">
                {facilityHeatmapData.map((facility) => (
                  <div
                    key={facility.facility}
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `minmax(120px, 1fr) repeat(${selectedHeatmapMetrics.length}, 1fr)`,
                    }}
                  >
                    <div className="text-sm font-medium text-foreground truncate px-2 flex items-center">
                      {facility.facility}
                    </div>
                    {selectedHeatmapMetrics.map((metric) => (
                      <div
                        key={metric}
                        className={`relative h-10 rounded-md flex items-center justify-center text-sm font-semibold text-white cursor-pointer transition-transform hover:scale-105 ${getHeatmapColor(facility[metric])}`}
                        title={`${facility.facility} - ${metric}: ${facility[metric]}%`}
                      >
                        {facility[metric]}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-border/50">
                <span className="text-sm text-muted-foreground">Low</span>
                <div className="flex gap-1">
                  <div className="w-6 h-4 rounded-sm bg-red-400" />
                  <div className="w-6 h-4 rounded-sm bg-orange-400" />
                  <div className="w-6 h-4 rounded-sm bg-amber-400" />
                  <div className="w-6 h-4 rounded-sm bg-emerald-400" />
                  <div className="w-6 h-4 rounded-sm bg-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">High</span>
              </div>
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
