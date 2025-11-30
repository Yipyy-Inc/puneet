/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Clock,
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
const resourceTypeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  Facility: { icon: Building, color: "text-blue-600", bgColor: "bg-blue-500/10" },
  User: { icon: User, color: "text-purple-600", bgColor: "bg-purple-500/10" },
  Subscription: { icon: Package, color: "text-green-600", bgColor: "bg-green-500/10" },
  Payment: { icon: CreditCard, color: "text-orange-600", bgColor: "bg-orange-500/10" },
  Setting: { icon: Settings, color: "text-gray-600", bgColor: "bg-gray-500/10" },
  Data: { icon: Database, color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
  API: { icon: Key, color: "text-pink-600", bgColor: "bg-pink-500/10" },
  Module: { icon: Layers, color: "text-indigo-600", bgColor: "bg-indigo-500/10" },
};

export function AuditLogsManager() {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [resourceSearch, setResourceSearch] = useState("");

  // Calculate resource index data
  const resourceIndex = useMemo(() => {
    const index: Record<string, { 
      type: string; 
      resources: Record<string, { 
        id: string; 
        name: string; 
        logCount: number; 
        lastActivity: string;
        severityCounts: Record<string, number>;
      }> 
    }> = {};

    auditLogs.forEach((log: any) => {
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
      index[log.entityType].resources[log.entityId].severityCounts[log.severity]++;
      if (new Date(log.timestamp) > new Date(index[log.entityType].resources[log.entityId].lastActivity)) {
        index[log.entityType].resources[log.entityId].lastActivity = log.timestamp;
      }
    });

    return index;
  }, []);

  // Get resource type summary
  const resourceTypeSummary = useMemo(() => {
    return Object.entries(resourceIndex).map(([type, data]) => ({
      type,
      resourceCount: Object.keys(data.resources).length,
      totalLogs: Object.values(data.resources).reduce((sum, r) => sum + r.logCount, 0),
      criticalLogs: Object.values(data.resources).reduce((sum, r) => sum + r.severityCounts.Critical, 0),
    })).sort((a, b) => b.totalLogs - a.totalLogs);
  }, [resourceIndex]);

  // Filter logs by selected resource
  const filteredLogs = useMemo(() => {
    if (!selectedResourceType && !selectedResourceId) return auditLogs;
    return auditLogs.filter((log: any) => {
      if (selectedResourceType && log.entityType !== selectedResourceType) return false;
      if (selectedResourceId && log.entityId !== selectedResourceId) return false;
      return true;
    });
  }, [selectedResourceType, selectedResourceId]);

  // Filter resources by search
  const filteredResources = useMemo(() => {
    if (!selectedResourceType || !resourceIndex[selectedResourceType]) return [];
    const resources = Object.values(resourceIndex[selectedResourceType].resources);
    if (!resourceSearch) return resources;
    return resources.filter(r => 
      r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(resourceSearch.toLowerCase())
    );
  }, [resourceIndex, selectedResourceType, resourceSearch]);

  const clearResourceFilter = () => {
    setSelectedResourceType(null);
    setSelectedResourceId(null);
    setResourceSearch("");
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
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
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
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
        className={`text-xs ${colors[category] || ""}`}
      >
        {category}
      </Badge>
    );
  };

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      render: (item: any) => (
        <div className="text-sm">
          <div>{new Date(item.timestamp).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(item.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: "userName",
      label: "User",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.userName}</div>
          <div className="text-xs text-muted-foreground">{item.userRole}</div>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (item: any) => <div className="font-medium">{item.action}</div>,
    },
    {
      key: "category",
      label: "Category",
      render: (item: any) => getCategoryBadge(item.category),
    },
    {
      key: "entityName",
      label: "Entity",
      render: (item: any) => (
        <div>
          <div className="text-sm">{item.entityName}</div>
          <div className="text-xs text-muted-foreground">{item.entityType}</div>
        </div>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      render: (item: any) => getSeverityBadge(item.severity),
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => getStatusBadge(item.status),
    },
  ];

  const renderActions = (item: any) => (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={() => {
        setSelectedLog(item);
        setShowDetailsDialog(true);
      }}
    >
      <Eye className="h-4 w-4" />
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
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs & Security</h1>
          <p className="text-muted-foreground mt-1">
            Track all admin actions with resource-level indexing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Active Resource Filter Banner */}
      {(selectedResourceType || selectedResourceId) && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm">
            Filtering by: 
            {selectedResourceType && (
              <Badge variant="outline" className="ml-2">
                {selectedResourceType}
              </Badge>
            )}
            {selectedResourceId && (
              <>
                <ChevronRight className="inline h-4 w-4 mx-1" />
                <Badge variant="outline">
                  {resourceIndex[selectedResourceType!]?.resources[selectedResourceId]?.name || selectedResourceId}
                </Badge>
              </>
            )}
          </span>
          <span className="text-sm text-muted-foreground ml-2">
            ({filteredLogs.length} logs)
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearResourceFilter}>
            <X className="h-4 w-4 mr-1" />
            Clear Filter
          </Button>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 max-w-lg">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <Database className="h-4 w-4" />
            Resource Index
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            All Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Total Logs
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {auditStatistics.totalLogs.toLocaleString()}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {auditStatistics.todayLogs} today
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl"
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

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Security Events
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {auditStatistics.securityEvents}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {auditStatistics.criticalEvents} critical
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl"
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

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Failed Actions
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight text-destructive">
                      {auditStatistics.failedActions}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Requires attention
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl"
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

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Resource Types
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {resourceTypeSummary.length}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Indexed resources
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl"
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
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Activity Trend (7 Days)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
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
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Category Breakdown
            </CardTitle>
            <p className="text-sm text-muted-foreground">
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
                    label={(entry: any) =>
                      `${entry.category}: ${entry.percentage}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {auditStatistics.categoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
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
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Top Active Users
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Users with the most logged actions
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditStatistics.topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.actionCount.toLocaleString()} actions
                      </div>
                    </div>
                    <div className="w-32 sm:w-40 md:w-48 shrink-0">
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary rounded-full h-2"
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
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Resource Type Summary
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Log distribution by resource type
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceTypeSummary} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis type="category" dataKey="type" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar dataKey="totalLogs" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Total Logs" />
                    <Bar dataKey="criticalLogs" fill="#ef4444" radius={[0, 4, 4, 0]} name="Critical" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Logs Preview */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Recent Audit Logs
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Latest admin actions and system changes
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("logs")}>
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.slice(0, 5).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <div className={`p-2 rounded-lg ${resourceTypeConfig[log.entityType]?.bgColor || "bg-muted"}`}>
                      {(() => {
                        const Icon = resourceTypeConfig[log.entityType]?.icon || FileText;
                        return <Icon className={`h-4 w-4 ${resourceTypeConfig[log.entityType]?.color || "text-muted-foreground"}`} />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.action}</span>
                        {getCategoryBadge(log.category)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.userName} • {log.entityName}
                      </p>
                    </div>
                    <div className="text-right">
                      {getSeverityBadge(log.severity)}
                      <p className="text-xs text-muted-foreground mt-1">
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
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Resource Types</CardTitle>
                <CardDescription>Click to view resources of each type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resourceTypeSummary.map((type) => {
                  const config = resourceTypeConfig[type.type] || { icon: FileText, color: "text-muted-foreground", bgColor: "bg-muted" };
                  const Icon = config.icon;
                  const isSelected = selectedResourceType === type.type;
                  return (
                    <div
                      key={type.type}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedResourceType(type.type);
                        setSelectedResourceId(null);
                        setResourceSearch("");
                      }}
                    >
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{type.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.resourceCount} resources • {type.totalLogs} logs
                        </p>
                      </div>
                      {type.criticalLogs > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {type.criticalLogs}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Resources List */}
            <Card className="border-0 shadow-card lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {selectedResourceType ? `${selectedResourceType} Resources` : "Select a Resource Type"}
                    </CardTitle>
                    <CardDescription>
                      {selectedResourceType 
                        ? `${filteredResources.length} resources found`
                        : "Choose a resource type from the left to view its resources"
                      }
                    </CardDescription>
                  </div>
                  {selectedResourceType && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search resources..."
                        className="pl-9 w-64"
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedResourceType ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredResources.map((resource) => {
                      const isSelected = selectedResourceId === resource.id;
                      return (
                        <div
                          key={resource.id}
                          className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                          }`}
                          onClick={() => {
                            setSelectedResourceId(resource.id);
                            setActiveTab("logs");
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{resource.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{resource.id}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <p className="font-bold">{resource.logCount}</p>
                              <p className="text-xs text-muted-foreground">Logs</p>
                            </div>
                            <div className="flex gap-1">
                              {resource.severityCounts.Critical > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {resource.severityCounts.Critical} Critical
                                </Badge>
                              )}
                              {resource.severityCounts.High > 0 && (
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                  {resource.severityCounts.High} High
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Last activity</p>
                              <p className="text-xs">{new Date(resource.lastActivity).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    {filteredResources.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No resources found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Layers className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Resource Type Selected</p>
                    <p className="text-sm mt-1">Select a resource type from the left panel to browse resources</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {selectedResourceId 
                  ? `Logs for ${resourceIndex[selectedResourceType!]?.resources[selectedResourceId]?.name || selectedResourceId}`
                  : selectedResourceType
                    ? `All ${selectedResourceType} Logs`
                    : "All Audit Logs"
                }
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredLogs.length} logs found
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns as any}
                data={filteredLogs as any}
                actions={renderActions as any}
                searchKey="action"
                searchPlaceholder="Search by action, user, or entity..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Action
                  </p>
                  <p className="text-lg font-semibold">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </p>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Timestamp
                  </p>
                  <p>{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Severity
                  </p>
                  {getSeverityBadge(selectedLog.severity)}
                </div>
              </div>

              {/* User Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      User Name
                    </p>
                    <p className="font-medium">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <p className="font-medium">{selectedLog.userRole}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      IP Address
                    </p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      User Agent
                    </p>
                    <p className="text-sm truncate">{selectedLog.userAgent}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Entity Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Entity Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Entity Type
                    </p>
                    <p className="font-medium">{selectedLog.entityType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Entity Name
                    </p>
                    <p className="font-medium">{selectedLog.entityName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Category
                    </p>
                    {getCategoryBadge(selectedLog.category)}
                  </div>
                  {selectedLog.facilityName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
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
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Changes Made
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedLog.changes.map((change: any, index: number) => (
                        <div
                          key={index}
                          className="border-l-2 border-primary pl-4"
                        >
                          <p className="font-medium text-sm">{change.field}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              {change.oldValue}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              →
                            </span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {change.newValue}
                            </span>
                          </div>
                        </div>
                      ))}
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
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
