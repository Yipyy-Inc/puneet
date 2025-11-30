/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTenantActivityLogs,
  getTenantAuditLogs,
  getTenantLogStatistics,
  type TenantActivityLog,
  type TenantAuditLog,
} from "@/data/tenant-logs";
import {
  Activity,
  Shield,
  Calendar,
  CreditCard,
  Users,
  UserCheck,
  PawPrint,
  Settings,
  Bell,
  Server,
  Briefcase,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileText,
  User,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TenantActivityLogsProps {
  facilityId: number;
  facilityName: string;
}

export function TenantActivityLogs({
  facilityId,
  facilityName,
}: TenantActivityLogsProps) {
  const [selectedActivity, setSelectedActivity] =
    useState<TenantActivityLog | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<TenantAuditLog | null>(
    null,
  );
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showActivityDetails, setShowActivityDetails] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);

  const activityLogs = useMemo(
    () => getTenantActivityLogs(facilityId),
    [facilityId],
  );
  const auditLogs = useMemo(() => getTenantAuditLogs(facilityId), [facilityId]);
  const statistics = useMemo(
    () => getTenantLogStatistics(facilityId),
    [facilityId],
  );

  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchesFilter =
        activityFilter === "all" || log.actionType === activityFilter;
      const matchesSearch =
        searchTerm === "" ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actorName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activityLogs, activityFilter, searchTerm]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesFilter =
        auditFilter === "all" || log.category === auditFilter;
      const matchesSearch =
        searchTerm === "" ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [auditLogs, auditFilter, searchTerm]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "booking":
        return Calendar;
      case "payment":
        return CreditCard;
      case "user":
        return Users;
      case "client":
        return UserCheck;
      case "pet":
        return PawPrint;
      case "settings":
        return Settings;
      case "staff":
        return Briefcase;
      case "service":
        return Activity;
      case "communication":
        return Bell;
      case "system":
        return Server;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "booking":
        return "bg-blue-100 text-blue-700";
      case "payment":
        return "bg-green-100 text-green-700";
      case "user":
        return "bg-purple-100 text-purple-700";
      case "client":
        return "bg-indigo-100 text-indigo-700";
      case "pet":
        return "bg-orange-100 text-orange-700";
      case "settings":
        return "bg-gray-100 text-gray-700";
      case "staff":
        return "bg-cyan-100 text-cyan-700";
      case "service":
        return "bg-pink-100 text-pink-700";
      case "communication":
        return "bg-yellow-100 text-yellow-700";
      case "system":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
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
    const colors: Record<string, string> = {
      Success: "bg-green-100 text-green-700",
      Failed: "bg-red-100 text-red-700",
      Pending: "bg-yellow-100 text-yellow-700",
    };
    return (
      <Badge
        variant={variants[status] || "secondary"}
        className={`text-xs ${colors[status] || ""}`}
      >
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
      Booking: "bg-indigo-100 text-indigo-700",
      Client: "bg-cyan-100 text-cyan-700",
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} min ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#f97316",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity & Audit Logs
          </h3>
          <p className="text-sm text-muted-foreground">
            Track all activities and changes for {facilityName}
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Activity Logs
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {statistics.totalActivityLogs.toLocaleString()}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {statistics.todayActivityLogs} today
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Activity className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Audit Logs
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {statistics.totalAuditLogs.toLocaleString()}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {statistics.todayAuditLogs} today
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
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
                  Security Events
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {statistics.securityEvents}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {statistics.criticalEvents} critical
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
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
                  Failed Actions
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-destructive">
                  {statistics.failedActions}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requires review
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Activity Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Activity and audit logs over the past week
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={statistics.weeklyTrend}>
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
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="activity"
                    name="Activity Logs"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="audit"
                    name="Audit Logs"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: "#8b5cf6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity by Type */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Breakdown of activities by type
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statistics.activityByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) =>
                      `${entry.type}: ${entry.percentage}%`
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {statistics.activityByType.map((_, index) => (
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

      {/* Top Active Users */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Most Active Users
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Users with the most logged actions in this facility
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.topUsers} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="userName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  width={100}
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
                  dataKey="actionCount"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Logs Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity Logs
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filteredActivityLogs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Shield className="h-4 w-4" />
              Audit Logs
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filteredAuditLogs.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="pet">Pet</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-0 shadow-card">
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredActivityLogs.map((log) => {
                  const Icon = getActivityIcon(log.actionType);
                  return (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedActivity(log);
                        setShowActivityDetails(true);
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-xl ${getActivityColor(log.actionType)}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{log.action}</h4>
                            <Badge variant="outline" className="text-xs">
                              {log.actionType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.actorName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
                {filteredActivityLogs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No activity logs found</p>
                    <p className="text-sm">
                      Try adjusting your search or filter
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={auditFilter} onValueChange={setAuditFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Financial">Financial</SelectItem>
                <SelectItem value="User Access">User Access</SelectItem>
                <SelectItem value="Configuration">Configuration</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Data">Data</SelectItem>
                <SelectItem value="System">System</SelectItem>
                <SelectItem value="Booking">Booking</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-0 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAuditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">
                          {log.userName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.userRole}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{log.action}</div>
                      </td>
                      <td className="px-4 py-3">
                        {getCategoryBadge(log.category)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{log.entityName}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.entityType}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getSeverityBadge(log.severity)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setSelectedAudit(log);
                            setShowAuditDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAuditLogs.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No audit logs found</p>
                  <p className="text-sm">Try adjusting your search or filter</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity Details Dialog */}
      <Dialog open={showActivityDetails} onOpenChange={setShowActivityDetails}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>
              Complete information about this activity
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Action
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedActivity.action}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Type
                  </p>
                  <Badge
                    className={getActivityColor(selectedActivity.actionType)}
                  >
                    {selectedActivity.actionType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Timestamp
                  </p>
                  <p>{new Date(selectedActivity.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Target
                  </p>
                  <p>{selectedActivity.targetName}</p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Actor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{selectedActivity.actorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <p className="font-medium">{selectedActivity.actorRole}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {selectedActivity.description}
                  </p>
                </CardContent>
              </Card>

              {selectedActivity.metadata && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Details Dialog */}
      <Dialog open={showAuditDetails} onOpenChange={setShowAuditDetails}>
        <DialogContent className="min-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete audit trail information
            </DialogDescription>
          </DialogHeader>
          {selectedAudit && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Action
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedAudit.action}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </p>
                  {getStatusBadge(selectedAudit.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Timestamp
                  </p>
                  <p>{new Date(selectedAudit.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Severity
                  </p>
                  {getSeverityBadge(selectedAudit.severity)}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{selectedAudit.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <p className="font-medium">{selectedAudit.userRole}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      IP Address
                    </p>
                    <p className="font-mono text-sm">
                      {selectedAudit.ipAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      User Agent
                    </p>
                    <p className="text-sm truncate">
                      {selectedAudit.userAgent}
                    </p>
                  </div>
                </CardContent>
              </Card>

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
                    <p className="font-medium">{selectedAudit.entityType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Entity Name
                    </p>
                    <p className="font-medium">{selectedAudit.entityName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Category
                    </p>
                    {getCategoryBadge(selectedAudit.category)}
                  </div>
                </CardContent>
              </Card>

              {selectedAudit.changes && selectedAudit.changes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Changes Made
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedAudit.changes.map((change, index) => (
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {selectedAudit.description}
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
