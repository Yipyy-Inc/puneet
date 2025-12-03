"use client";

import { useState } from "react";
import { adminUsers, roleDisplayNames } from "@/data/admin-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Download,
  User,
  Clock,
  Activity,
  Shield,
  Eye,
  Monitor,
  Globe,
  AlertTriangle,
  History,
  FileText,
} from "lucide-react";

const tabs = [
  {
    id: "activity",
    name: "Activity Log",
    icon: Activity,
  },
  {
    id: "logins",
    name: "Login History",
    icon: History,
  },
  {
    id: "audit",
    name: "Audit Trail",
    icon: Shield,
  },
];

// Flatten all activity logs from all users
const allActivityLogs = adminUsers
  .flatMap((user) =>
    user.activityLog.map((log) => ({
      ...log,
      userName: user.name,
      userRole: user.role,
      userEmail: user.email,
      userId: user.id,
    })),
  )
  .sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

// Flatten all login history from all users
const allLoginHistory = adminUsers
  .flatMap((user) =>
    user.loginHistory.map((login) => ({
      ...login,
      userName: user.name,
      userRole: user.role,
      userEmail: user.email,
      userId: user.id,
    })),
  )
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

type ActivityLogEntry = (typeof allActivityLogs)[number];
type LoginHistoryEntry = (typeof allLoginHistory)[number];

const exportActivityToCSV = (data: ActivityLogEntry[]) => {
  const headers = [
    "ID",
    "User",
    "Role",
    "Action",
    "Target",
    "Details",
    "Severity",
    "Timestamp",
  ];

  const csvContent = [
    headers.join(","),
    ...data.map((log) =>
      [
        log.id,
        `"${log.userName}"`,
        roleDisplayNames[log.userRole],
        `"${log.action}"`,
        `"${log.target}"`,
        `"${log.details}"`,
        log.severity,
        log.timestamp,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `activity_log_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ActivityTrackingPage() {
  const [activeTab, setActiveTab] = useState("activity");

  const activityColumns: ColumnDef<ActivityLogEntry>[] = [
    {
      key: "userName",
      label: "Name",
      icon: User,
      defaultVisible: true,
      render: (log) => (
        <div>
          <div className="font-medium">{log.userName}</div>
          <div className="text-xs text-muted-foreground">{log.userEmail}</div>
        </div>
      ),
    },
    {
      key: "userRole",
      label: "Role",
      icon: Shield,
      defaultVisible: true,
      render: (log) => <StatusBadge type="adminRole" value={log.userRole} />,
    },
    {
      key: "action",
      label: "Action",
      icon: Activity,
      defaultVisible: true,
      render: (log) => <div className="font-medium">{log.action}</div>,
    },
    {
      key: "target",
      label: "Target",
      icon: Eye,
      defaultVisible: true,
    },
    {
      key: "details",
      label: "Details",
      icon: FileText,
      defaultVisible: true,
      render: (log) => (
        <div className="max-w-[200px] truncate text-muted-foreground text-sm">
          {log.details}
        </div>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      icon: AlertTriangle,
      defaultVisible: true,
      render: (log) => <StatusBadge type="severity" value={log.severity} />,
    },
    {
      key: "timestamp",
      label: "Timestamp",
      icon: Clock,
      defaultVisible: true,
      render: (log) => (
        <div className="text-sm">
          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(log.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
  ];

  const loginColumns: ColumnDef<LoginHistoryEntry>[] = [
    {
      key: "userName",
      label: "Name",
      icon: User,
      defaultVisible: true,
      render: (log) => (
        <div>
          <div className="font-medium">{log.userName}</div>
          <div className="text-xs text-muted-foreground">{log.userEmail}</div>
        </div>
      ),
    },
    {
      key: "userRole",
      label: "Role",
      icon: Shield,
      defaultVisible: true,
      render: (log) => <StatusBadge type="adminRole" value={log.userRole} />,
    },
    {
      key: "date",
      label: "Timestamp",
      icon: Clock,
      defaultVisible: true,
      render: (log) => (
        <div className="text-sm">
          <div>{new Date(log.date).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(log.date).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: "ip",
      label: "IP Address",
      icon: Globe,
      defaultVisible: true,
      render: (log) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{log.ip}</code>
      ),
    },
    {
      key: "device",
      label: "Device",
      icon: Monitor,
      defaultVisible: true,
      render: (log) => (
        <Badge variant="outline" className="text-xs">
          {log.device}
        </Badge>
      ),
    },
    {
      key: "location",
      label: "Location",
      icon: Globe,
      defaultVisible: true,
    },
  ];

  const activityFilters: FilterDef[] = [
    {
      key: "severity",
      label: "Severity",
      options: [
        { value: "all", label: "All Severity" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    {
      key: "userRole",
      label: "Role",
      options: [
        { value: "all", label: "All Roles" },
        { value: "sales_team", label: "Sales Team" },
        { value: "technical_support", label: "Technical Support" },
        { value: "account_manager", label: "Account Manager" },
        { value: "financial_auditor", label: "Financial Auditor" },
        { value: "system_administrator", label: "System Administrator" },
      ],
    },
  ];

  const loginFilters: FilterDef[] = [
    {
      key: "userRole",
      label: "Role",
      options: [
        { value: "all", label: "All Roles" },
        { value: "sales_team", label: "Sales Team" },
        { value: "technical_support", label: "Technical Support" },
        { value: "account_manager", label: "Account Manager" },
        { value: "financial_auditor", label: "Financial Auditor" },
        { value: "system_administrator", label: "System Administrator" },
      ],
    },
  ];

  const highSeverityCount = allActivityLogs.filter(
    (log) => log.severity === "high",
  ).length;
  const todayLogins = allLoginHistory.filter(
    (log) => new Date(log.date).toDateString() === new Date().toDateString(),
  ).length;
  const uniqueLocations = new Set(allLoginHistory.map((log) => log.location))
    .size;

  const renderTabContent = () => {
    switch (activeTab) {
      case "activity":
        return (
          <DataTable
            data={allActivityLogs}
            columns={activityColumns}
            filters={activityFilters}
            searchKey="userName"
            searchPlaceholder="Search by user name..."
            itemsPerPage={10}
          />
        );
      case "logins":
        return (
          <DataTable
            data={allLoginHistory}
            columns={loginColumns}
            filters={loginFilters}
            searchKey="userName"
            searchPlaceholder="Search by user name..."
            itemsPerPage={10}
          />
        );
      case "audit":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {"Sensitive Actions"} - {"Audit Trail"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allActivityLogs
                  .filter((log) => log.severity === "high")
                  .slice(0, 10)
                  .map((log, index) => (
                    <div
                      key={`${log.id}-${index}`}
                      className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg"
                    >
                      <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold">{log.action}</span>
                            <span className="text-muted-foreground"> on </span>
                            <span className="font-medium">{log.target}</span>
                          </div>
                          <StatusBadge type="severity" value={log.severity} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                {allActivityLogs.filter((log) => log.severity === "high")
                  .length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No sensitive actions recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {"Activity Tracking"}
              </h2>
              <p className="text-muted-foreground mt-1">
                Monitor admin user actions, login history, and audit trails
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => exportActivityToCSV(allActivityLogs)}
            >
              <Download className="mr-2 h-4 w-4" />
              {"Export Audit Log"}
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <nav className="px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  "hover:bg-muted/50",
                  isActive
                    ? "bg-background border-b-2 border-primary text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Actions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allActivityLogs.length}</div>
              <p className="text-xs text-muted-foreground">
                Across all admin users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {"Sensitive Actions"}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {highSeverityCount}
              </div>
              <p className="text-xs text-muted-foreground">
                High severity actions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Logins
              </CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {todayLogins}
              </div>
              <p className="text-xs text-muted-foreground">
                Login sessions today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Locations
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueLocations}</div>
              <p className="text-xs text-muted-foreground">Access locations</p>
            </CardContent>
          </Card>
        </div>

        {renderTabContent()}
      </div>
    </div>
  );
}
