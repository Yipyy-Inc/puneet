"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Server,
  Database,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Gauge,
  Globe,
  Zap,
  Link,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  serverStatuses,
  databaseMetrics,
  apiEndpoints,
  serviceUptimes,
  performanceMetrics,
  resourceUtilizations,
  healthDashboardStats,
  type ServerStatus,
  type DatabaseMetric,
  type APIEndpoint,
  type ServiceUptime,
  type PerformanceMetric,
  type ResourceUtilization,
} from "@/data/system-health";

export function SystemStatus() {
  // Badge helpers
  const getServerStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Online: "default",
      Offline: "destructive",
      Degraded: "outline",
      Maintenance: "secondary",
    };
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      Online: CheckCircle2,
      Offline: XCircle,
      Degraded: AlertCircle,
      Maintenance: Clock,
    };
    const Icon = icons[status] || CheckCircle2;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getDBStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Healthy: "default",
      Degraded: "outline",
      Critical: "destructive",
      Maintenance: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getAPIStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Available: "default",
      Degraded: "outline",
      Down: "destructive",
      Maintenance: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getServiceStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Operational: "default",
      Degraded: "outline",
      "Partial Outage": "destructive",
      "Major Outage": "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getMetricStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      Normal: "default",
      Warning: "outline",
      Critical: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      Increasing: ArrowUp,
      Decreasing: ArrowDown,
      Stable: Minus,
    };
    const colors: Record<string, string> = {
      Increasing: "text-red-600",
      Decreasing: "text-green-600",
      Stable: "text-blue-600",
    };
    const Icon = icons[trend] || Minus;
    return <Icon className={`size-4 ${colors[trend]} `} />;
  };

  // Server Status Columns
  const serverColumns = [
    {
      key: "serverName",
      label: "Server",
      render: (item: ServerStatus) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium">
            <Server className="text-muted-foreground size-4" />
            {item.serverName}
          </div>
          <div className="text-muted-foreground text-xs">{item.region}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: ServerStatus) => (
        <div className="space-y-1">
          {getServerStatusBadge(item.status)}
          <div className="text-muted-foreground text-xs">{item.uptime}</div>
        </div>
      ),
    },
    {
      key: "resources",
      label: "Resources",
      render: (item: ServerStatus) => (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="h-3 w-3" />
            <span>CPU: {item.cpu}%</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-3 w-3" />
            <span>MEM: {item.memory}%</span>
          </div>
        </div>
      ),
    },
    {
      key: "performance",
      label: "Performance",
      render: (item: ServerStatus) => (
        <div className="space-y-1 text-sm">
          <div>{item.responseTime}ms</div>
          <div className="text-muted-foreground text-xs">
            {item.requestsPerMinute} req/min
          </div>
        </div>
      ),
    },
  ];

  // Database Metrics Columns
  const databaseColumns = [
    {
      key: "databaseName",
      label: "Database",
      render: (item: DatabaseMetric) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium">
            <Database className="text-muted-foreground size-4" />
            {item.databaseName}
          </div>
          <Badge variant="outline" className="mt-1 text-xs">
            {item.type}
          </Badge>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: DatabaseMetric) => getDBStatusBadge(item.status),
    },
    {
      key: "performance",
      label: "Performance",
      render: (item: DatabaseMetric) => (
        <div className="space-y-1 text-sm">
          <div>{item.queryPerformance.avgQueryTime}ms avg</div>
          <div className="text-muted-foreground text-xs">
            {item.queryPerformance.slowQueries} slow queries
          </div>
        </div>
      ),
    },
    {
      key: "storage",
      label: "Storage",
      render: (item: DatabaseMetric) => (
        <div className="space-y-1">
          <div className="text-sm">
            {item.storage.used}GB / {item.storage.total}GB
          </div>
          <Progress value={item.storage.percentage} className="h-1.5" />
        </div>
      ),
    },
  ];

  // API Endpoints Columns
  const apiColumns = [
    {
      key: "endpoint",
      label: "Endpoint",
      render: (item: APIEndpoint) => (
        <div className="min-w-0">
          <div className="truncate font-mono text-sm font-medium">
            {item.endpoint}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {item.method}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {item.service}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: APIEndpoint) => (
        <div className="space-y-1">
          {getAPIStatusBadge(item.status)}
          <div className="text-muted-foreground text-xs">{item.uptime}%</div>
        </div>
      ),
    },
    {
      key: "performance",
      label: "Performance",
      render: (item: APIEndpoint) => (
        <div className="space-y-1 text-sm">
          <div>{item.avgResponseTime}ms</div>
          <div className="text-muted-foreground text-xs">
            {item.errorRate}% error
          </div>
        </div>
      ),
    },
  ];

  // Service Uptime Columns
  const serviceColumns = [
    {
      key: "serviceName",
      label: "Service",
      render: (item: ServiceUptime) => (
        <div className="min-w-0">
          <div className="font-medium">{item.serviceName}</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {item.category}
          </Badge>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: ServiceUptime) => getServiceStatusBadge(item.status),
    },
    {
      key: "uptime",
      label: "Uptime",
      render: (item: ServiceUptime) => (
        <div className="space-y-1 text-sm">
          <div>24h: {item.uptime24h}%</div>
          <div className="text-muted-foreground text-xs">
            7d: {item.uptime7d}%
          </div>
        </div>
      ),
    },
    {
      key: "incidents",
      label: "Incidents",
      render: (item: ServiceUptime) => (
        <div className="text-sm">
          {item.incidents24h === 0 ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              None
            </Badge>
          ) : (
            <Badge variant="destructive">{item.incidents24h} today</Badge>
          )}
        </div>
      ),
    },
  ];

  // Performance Metrics Columns
  const performanceColumns = [
    {
      key: "metricName",
      label: "Metric",
      render: (item: PerformanceMetric) => (
        <div className="min-w-0">
          <div className="font-medium">{item.metricName}</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {item.category}
          </Badge>
        </div>
      ),
    },
    {
      key: "value",
      label: "Current / Avg",
      render: (item: PerformanceMetric) => (
        <div className="space-y-1 text-sm">
          <div className="font-medium">
            {item.currentValue} {item.unit}
          </div>
          <div className="text-muted-foreground text-xs">
            Avg: {item.averageValue} {item.unit}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: PerformanceMetric) => (
        <div className="flex items-center gap-2">
          {getMetricStatusBadge(item.status)}
          {getTrendIcon(item.trend)}
        </div>
      ),
    },
    {
      key: "threshold",
      label: "Threshold",
      render: (item: PerformanceMetric) => (
        <div className="text-sm">
          {item.threshold} {item.unit}
        </div>
      ),
    },
  ];

  // Resource Utilization Columns
  const resourceColumns = [
    {
      key: "resourceName",
      label: "Resource",
      render: (item: ResourceUtilization) => (
        <div className="min-w-0">
          <div className="font-medium">{item.resourceName}</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {item.resourceType}
          </Badge>
        </div>
      ),
    },
    {
      key: "utilization",
      label: "Utilization",
      render: (item: ResourceUtilization) => (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            {item.current}
            {item.unit}
          </div>
          <Progress value={item.current} className="h-2" />
          <div className="text-muted-foreground text-xs">
            Peak: {item.peak}
            {item.unit}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: ResourceUtilization) => getMetricStatusBadge(item.status),
    },
    {
      key: "forecast",
      label: "30d Forecast",
      render: (item: ResourceUtilization) => (
        <div className="text-sm">
          {item.forecast.days30}
          {item.unit}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">System Status</h3>
          <p className="text-muted-foreground text-sm">
            Monitor system health, performance, and resource utilization
          </p>
        </div>
      </div>

      {/* Health Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  System Health
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {healthDashboardStats.overallHealth}%
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  All systems operational
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-green-500/20 to-green-600/20">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Servers Online
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {healthDashboardStats.serversOnline}/
                  {healthDashboardStats.totalServers}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {(
                    (healthDashboardStats.serversOnline /
                      healthDashboardStats.totalServers) *
                    100
                  ).toFixed(1)}
                  % availability
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500/20 to-blue-600/20">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Response Time
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {healthDashboardStats.avgResponseTime}ms
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Average across all endpoints
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-purple-500/20 to-purple-600/20">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Incidents
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {healthDashboardStats.activeIncidents}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {healthDashboardStats.criticalAlerts} critical
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-orange-500/20 to-orange-600/20">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              System Uptime (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={healthDashboardStats.dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} domain={[99, 100]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Error Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={healthDashboardStats.dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="servers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="databases">Databases</TabsTrigger>
          <TabsTrigger value="apis">API Endpoints</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Servers Tab */}
        <TabsContent value="servers" className="space-y-6 overflow-x-hidden">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Server className="h-5 w-5" />
                Server Status Monitoring
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Real-time server health and resource utilization
              </p>
            </CardHeader>
            <CardContent>
              <DataTable columns={serverColumns} data={serverStatuses} />
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Gauge className="h-5 w-5" />
                Resource Utilization
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Monitor and forecast resource usage
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={resourceColumns}
                data={resourceUtilizations}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Databases Tab */}
        <TabsContent value="databases" className="space-y-6 overflow-x-hidden">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Database className="h-5 w-5" />
                Database Performance
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Monitor database health, performance, and storage
              </p>
            </CardHeader>
            <CardContent>
              <DataTable columns={databaseColumns} data={databaseMetrics} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* APIs Tab */}
        <TabsContent value="apis" className="space-y-6 overflow-x-hidden">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Link className="h-5 w-5" />
                API Availability
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Track API endpoint health and performance metrics
              </p>
            </CardHeader>
            <CardContent>
              <DataTable columns={apiColumns} data={apiEndpoints} />
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Response time, error rates, and throughput monitoring
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={performanceColumns}
                data={performanceMetrics}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6 overflow-x-hidden">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Globe className="h-5 w-5" />
                Service Uptime Tracking
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Monitor service availability and incident history
              </p>
            </CardHeader>
            <CardContent>
              <DataTable columns={serviceColumns} data={serviceUptimes} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
