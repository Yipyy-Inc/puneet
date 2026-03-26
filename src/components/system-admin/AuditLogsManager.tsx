"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { auditLogs, auditStatistics } from "@/data/system-administration";
import {
  Shield,
  AlertTriangle,
  Activity,
  Eye,
  Download,
  Filter,
  User,
  FileText,
  Building,
  Package,
  CreditCard,
  Settings,
  Database,
  Key,
  Search,
  ChevronRight,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Resource type icons and colors
const resourceTypeConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  Facility: {
    icon: Building,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  User: { icon: User, color: "text-purple-600", bgColor: "bg-purple-500/10" },
  Subscription: {
    icon: Package,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
  Payment: {
    icon: CreditCard,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
  Setting: {
    icon: Settings,
    color: "text-gray-600",
    bgColor: "bg-gray-500/10",
  },
  Data: { icon: Database, color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
  API: { icon: Key, color: "text-pink-600", bgColor: "bg-pink-500/10" },
  Module: {
    icon: Layers,
    color: "text-indigo-600",
    bgColor: "bg-indigo-500/10",
  },
};

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  category: string;
  entityType: string;
  entityId: string;
  entityName: string;
  changes: { field: string; oldValue: string; newValue: string }[];
  ipAddress: string;
  userAgent: string;
  facilityId?: string;
  facilityName?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Success" | "Failed" | "Pending";
  description: string;
}

export function AuditLogsManager() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedResourceType, setSelectedResourceType] = useState<
    string | null
  >(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  );
  const [resourceSearch, setResourceSearch] = useState("");

  // Export audit logs to CSV
  const exportToCSV = () => {
    const headers = [
      "Timestamp",
      "User",
      "Role",
      "Action",
      "Category",
      "Entity Type",
      "Entity Name",
      "Severity",
      "Status",
      "IP Address",
    ];

    const csvContent = [
      headers.join(","),
      ...auditLogs.map((log: AuditLog) =>
        [
          log.timestamp,
          `"${log.userName}"`,
          log.userRole,
          `"${log.action}"`,
          log.category,
          log.entityType,
          `"${log.entityName}"`,
          log.severity,
          log.status,
          log.ipAddress,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `audit_logs_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate resource index data
  const resourceIndex = useMemo(() => {
    const index: Record<
      string,
      {
        type: string;
        resources: Record<
          string,
          {
            id: string;
            name: string;
            logCount: number;
            lastActivity: string;
            severityCounts: Record<string, number>;
          }
        >;
      }
    > = {};

    auditLogs.forEach((log: AuditLog) => {
      if (!index[log.entityType]) {
        index[log.entityType] = { type: log.entityType, resources: {} };
      }
      if (!index[log.entityType].resources[log.entityId]) {
        index[log.entityType].resources[log.entityId] = {
          id: log.entityId,
          name: log.entityName,
          logCount: 0,
          lastActivity: log.timestamp,
          severityCounts: { Low: 0, Medium: 0, High: 0, Critical: 0 },
        };
      }
      index[log.entityType].resources[log.entityId].logCount++;
      index[log.entityType].resources[log.entityId].severityCounts[
        log.severity
      ]++;
      if (
        new Date(log.timestamp) >
        new Date(index[log.entityType].resources[log.entityId].lastActivity)
      ) {
        index[log.entityType].resources[log.entityId].lastActivity =
          log.timestamp;
      }
    });

    return index;
  }, []);

  // Get resource type summary
  const resourceTypeSummary = useMemo(() => {
    return Object.entries(resourceIndex)
      .map(([type, data]) => ({
        type,
        resourceCount: Object.keys(data.resources).length,
        totalLogs: Object.values(data.resources).reduce(
          (sum, r) => sum + r.logCount,
          0,
        ),
        criticalLogs: Object.values(data.resources).reduce(
          (sum, r) => sum + r.severityCounts.Critical,
          0,
        ),
      }))
      .sort((a, b) => b.totalLogs - a.totalLogs);
  }, [resourceIndex]);

  // Filter logs by selected resource
  const filteredLogs = useMemo(() => {
    if (!selectedResourceType && !selectedResourceId) return auditLogs;
    return auditLogs.filter((log: AuditLog) => {
      if (selectedResourceType && log.entityType !== selectedResourceType)
        return false;
      if (selectedResourceId && log.entityId !== selectedResourceId)
        return false;
      return true;
    });
  }, [selectedResourceType, selectedResourceId]);

  // Filter resources by search
  const filteredResources = useMemo(() => {
    if (!selectedResourceType || !resourceIndex[selectedResourceType])
      return [];
    const resources = Object.values(
      resourceIndex[selectedResourceType].resources,
    );
    if (!resourceSearch) return resources;
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.id.toLowerCase().includes(resourceSearch.toLowerCase()),
    );
  }, [resourceIndex, selectedResourceType, resourceSearch]);

  const clearResourceFilter = () => {
    setSelectedResourceType(null);
    setSelectedResourceId(null);
    setResourceSearch("");
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        className: string;
      }
    > = {
      Low: { variant: "secondary", className: "bg-blue-100 text-blue-700" },
      Medium: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-700",
      },
      High: {
        variant: "secondary",
        className: "bg-orange-100 text-orange-700",
      },
      Critical: {
        variant: "destructive",
        className: "bg-red-100 text-red-700",
      },
    };
    const config = variants[severity] || variants.Low;
    return (
      <Badge
        variant={config.variant}
        className={`text-xs ${config.className} `}
      >
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Success: "default",
      Failed: "destructive",
      Pending: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      Financial: "bg-green-100 text-green-700",
      "User Access": "bg-purple-100 text-purple-700",
      Configuration: "bg-blue-100 text-blue-700",
      Security: "bg-red-100 text-red-700",
      Data: "bg-orange-100 text-orange-700",
      System: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge
        variant="secondary"
        className={`text-xs ${colors[category] || ""} `}
      >
        {category}
      </Badge>
    );
  };

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      render: (item: AuditLog) => (
        <div className="text-sm">
          <div>{new Date(item.timestamp).toLocaleDateString()}</div>
          <div className="text-muted-foreground text-xs">
            {new Date(item.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: "userName",
      label: "User",
      render: (item: AuditLog) => (
        <div>
          <div className="font-medium">{item.userName}</div>
          <div className="text-muted-foreground text-xs">{item.userRole}</div>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (item: AuditLog) => (
        <div className="font-medium">{item.action}</div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (item: AuditLog) => getCategoryBadge(item.category),
    },
    {
      key: "entityName",
      label: "Entity",
      render: (item: AuditLog) => (
        <div>
          <div className="text-sm">{item.entityName}</div>
          <div className="text-muted-foreground text-xs">{item.entityType}</div>
        </div>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      render: (item: AuditLog) => getSeverityBadge(item.severity),
    },
    {
      key: "status",
      label: "Status",
      render: (item: AuditLog) => getStatusBadge(item.status),
    },
  ];

  const renderActions = (item: AuditLog) => (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={() => {
        setSelectedLog(item);
        setShowDetailsDialog(true);
      }}
    >
      <Eye className="size-4" />
      Details
    </Button>
  );

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#6366f1",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Audit Logs & Security
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all admin actions with resource-level indexing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilterDialog(true)}
          >
            <Filter className="size-4" />
            Advanced Filters
          </Button>
          <Button className="gap-2" onClick={exportToCSV}>
            <Download className="size-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Active Resource Filter Banner */}
      {(selectedResourceType || selectedResourceId) && (
        <div className="border-primary/20 bg-primary/5 flex items-center gap-2 rounded-lg border p-3">
          <Filter className="text-primary size-4" />
          <span className="text-sm">
            Filtering by:
            {selectedResourceType && (
              <Badge variant="outline" className="ml-2">
                {selectedResourceType}
              </Badge>
            )}
            {selectedResourceId && (
              <>
                <ChevronRight className="mx-1 inline size-4" />
                <Badge variant="outline">
                  {resourceIndex[selectedResourceType!]?.resources[
                    selectedResourceId
                  ]?.name || selectedResourceId}
                </Badge>
              </>
            )}
          </span>
          <span className="text-muted-foreground ml-2 text-sm">
            ({filteredLogs.length} logs)
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={clearResourceFilter}
          >
            <X className="mr-1 size-4" />
            Clear Filter
          </Button>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-12 w-full max-w-lg grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <Database className="size-4" />
            Resource Index
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="size-4" />
            All Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                      Total Logs
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {auditStatistics.totalLogs.toLocaleString()}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {auditStatistics.todayLogs} today
                    </p>
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    }}
                  >
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                      Security Events
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {auditStatistics.securityEvents}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {auditStatistics.criticalEvents} critical
                    </p>
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    }}
                  >
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                      Failed Actions
                    </p>
                    <h3 className="text-destructive text-2xl font-bold tracking-tight">
                      {auditStatistics.failedActions}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Requires attention
                    </p>
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                      Resource Types
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {resourceTypeSummary.length}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Indexed resources
                    </p>
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    }}
                  >
                    <Database className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Activity Trend */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Activity Trend (7 Days)
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Daily audit log volume over the past week
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={auditStatistics.weeklyTrend}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
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
                          boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Category Breakdown
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Distribution of audit logs by category
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={auditStatistics.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ payload }) =>
                          `${payload?.category}: ${payload?.percentage}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {auditStatistics.categoryBreakdown.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Users Activity */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Top Active Users
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Users with the most logged actions
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditStatistics.topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {user.userName}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {user.actionCount.toLocaleString()} actions
                      </div>
                    </div>
                    <div className="w-32 shrink-0 sm:w-40 md:w-48">
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(user.actionCount / auditStatistics.topUsers[0].actionCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resource Type Summary */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Resource Type Summary
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Log distribution by resource type
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceTypeSummary} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="type"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="totalLogs"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                      name="Total Logs"
                    />
                    <Bar
                      dataKey="criticalLogs"
                      fill="#ef4444"
                      radius={[0, 4, 4, 0]}
                      name="Critical"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Logs Preview */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Recent Audit Logs
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Latest admin actions and system changes
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("logs")}
                >
                  View All
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.slice(0, 5).map((log: AuditLog) => (
                  <div
                    key={log.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-4 rounded-lg border p-3 transition-colors"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <div
                      className={`rounded-lg p-2 ${
                        resourceTypeConfig[log.entityType]?.bgColor ||
                        `bg-muted`
                      } `}
                    >
                      {(() => {
                        const Icon =
                          resourceTypeConfig[log.entityType]?.icon || FileText;
                        return (
                          <Icon
                            className={`size-4 ${
                              resourceTypeConfig[log.entityType]?.color ||
                              `text-muted-foreground`
                            } `}
                          />
                        );
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.action}</span>
                        {getCategoryBadge(log.category)}
                      </div>
                      <p className="text-muted-foreground truncate text-sm">
                        {log.userName} • {log.entityName}
                      </p>
                    </div>
                    <div className="text-right">
                      {getSeverityBadge(log.severity)}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Index Tab */}
        <TabsContent value="resources" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Resource Types List */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Resource Types
                </CardTitle>
                <CardDescription>
                  Click to view resources of each type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resourceTypeSummary.map((type) => {
                  const config = resourceTypeConfig[type.type] || {
                    icon: FileText,
                    color: "text-muted-foreground",
                    bgColor: "bg-muted",
                  };
                  const Icon = config.icon;
                  const isSelected = selectedResourceType === type.type;
                  return (
                    <div
                      key={type.type}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                        isSelected
                          ? "border-primary/30 bg-primary/10 border"
                          : `hover:bg-muted/50 border border-transparent`
                      } `}
                      onClick={() => {
                        setSelectedResourceType(type.type);
                        setSelectedResourceId(null);
                        setResourceSearch("");
                      }}
                    >
                      <div className={`rounded-lg p-2 ${config.bgColor} `}>
                        <Icon className={`size-4 ${config.color} `} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{type.type}</p>
                        <p className="text-muted-foreground text-xs">
                          {type.resourceCount} resources • {type.totalLogs} logs
                        </p>
                      </div>
                      {type.criticalLogs > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {type.criticalLogs}
                        </Badge>
                      )}
                      <ChevronRight className="text-muted-foreground size-4" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Resources List */}
            <Card className="shadow-card border-0 lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {selectedResourceType
                        ? `${selectedResourceType} Resources`
                        : "Select a Resource Type"}
                    </CardTitle>
                    <CardDescription>
                      {selectedResourceType
                        ? `${filteredResources.length} resources found`
                        : "Choose a resource type from the left to view its resources"}
                    </CardDescription>
                  </div>
                  {selectedResourceType && (
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        placeholder="Search resources..."
                        className="w-64 pl-9"
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedResourceType ? (
                  <div className="max-h-[500px] space-y-2 overflow-y-auto">
                    {filteredResources.map((resource) => {
                      const isSelected = selectedResourceId === resource.id;
                      return (
                        <div
                          key={resource.id}
                          className={`flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-colors ${
                            isSelected
                              ? "border-primary/30 bg-primary/10 border"
                              : `hover:bg-muted/50 border border-transparent`
                          } `}
                          onClick={() => {
                            setSelectedResourceId(resource.id);
                            setActiveTab("logs");
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{resource.name}</p>
                            <p className="text-muted-foreground font-mono text-xs">
                              {resource.id}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <p className="font-bold">{resource.logCount}</p>
                              <p className="text-muted-foreground text-xs">
                                Logs
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {resource.severityCounts.Critical > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {resource.severityCounts.Critical} Critical
                                </Badge>
                              )}
                              {resource.severityCounts.High > 0 && (
                                <Badge className="bg-orange-100 text-xs text-orange-700">
                                  {resource.severityCounts.High} High
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground text-xs">
                                Last activity
                              </p>
                              <p className="text-xs">
                                {new Date(
                                  resource.lastActivity,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      );
                    })}
                    {filteredResources.length === 0 && (
                      <div className="text-muted-foreground py-8 text-center">
                        <Database className="mx-auto mb-3 h-12 w-12 opacity-50" />
                        <p>No resources found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-12 text-center">
                    <Layers className="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p className="text-lg font-medium">
                      No Resource Type Selected
                    </p>
                    <p className="mt-1 text-sm">
                      Select a resource type from the left panel to browse
                      resources
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {selectedResourceId
                  ? `Logs for ${resourceIndex[selectedResourceType!]?.resources[selectedResourceId]?.name || selectedResourceId}`
                  : selectedResourceType
                    ? `All ${selectedResourceType} Logs`
                    : "All Audit Logs"}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {filteredLogs.length} logs found
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredLogs}
                actions={renderActions}
                searchKey="action"
                searchPlaceholder="Search by action, user, or entity..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-h-[80vh] min-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Action
                  </p>
                  <p className="text-lg font-semibold">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Status
                  </p>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Timestamp
                  </p>
                  <p>{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Severity
                  </p>
                  {getSeverityBadge(selectedLog.severity)}
                </div>
              </div>

              {/* User Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="size-4" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">
                      User Name
                    </p>
                    <p className="font-medium">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">Role</p>
                    <p className="font-medium">{selectedLog.userRole}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">
                      IP Address
                    </p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">
                      User Agent
                    </p>
                    <p className="truncate text-sm">{selectedLog.userAgent}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Entity Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="size-4" />
                    Entity Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">
                      Entity Type
                    </p>
                    <p className="font-medium">{selectedLog.entityType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">
                      Entity Name
                    </p>
                    <p className="font-medium">{selectedLog.entityName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">
                      Category
                    </p>
                    {getCategoryBadge(selectedLog.category)}
                  </div>
                  {selectedLog.facilityName && (
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs">
                        Facility
                      </p>
                      <p className="font-medium">{selectedLog.facilityName}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Changes Made */}
              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="size-4" />
                      Changes Made
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedLog.changes.map(
                        (
                          change: {
                            field: string;
                            oldValue: string;
                            newValue: string;
                          },
                          index: number,
                        ) => (
                          <div
                            key={index}
                            className="border-primary border-l-2 pl-4"
                          >
                            <p className="text-sm font-medium">
                              {change.field}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded-sm bg-red-100 px-2 py-1 text-xs text-red-700">
                                {change.oldValue}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                →
                              </span>
                              <span className="rounded-sm bg-green-100 px-2 py-1 text-xs text-green-700">
                                {change.newValue}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {selectedLog.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Advanced Filters Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down audit log results
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <select className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
                  <option value="all">All Severities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
                  <option value="all">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
                  <option value="all">All Categories</option>
                  <option value="Financial">Financial</option>
                  <option value="User Access">User Access</option>
                  <option value="Configuration">Configuration</option>
                  <option value="Security">Security</option>
                  <option value="Data">Data</option>
                  <option value="System">System</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilterDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowFilterDialog(false)}>
              <Filter className="mr-2 size-4" />
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
