/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
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
} from "recharts";

export function AuditLogsManager() {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

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
          <h3 className="text-xl font-semibold">Audit & Logging</h3>
          <p className="text-sm text-muted-foreground">
            Track all system changes and user activities
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
                  Config Changes
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {auditStatistics.configurationChanges}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This month
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Activity className="h-5 w-5 text-white" />
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

      {/* Audit Logs Table */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Recent Audit Logs
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed view of all system activities and changes
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as any}
            data={auditLogs as any}
            actions={renderActions as any}
            searchKey="action"
            searchPlaceholder="Search by action, user, or entity..."
          />
        </CardContent>
      </Card>

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
