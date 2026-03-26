"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  Clock,
  Key,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Ban,
  Play,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  mfaSettings,
  ipWhitelist,
  activeSessions,
  passwordPolicies,
  failedLoginAttempts,
  securityAlerts,
  securityDashboardStats,
  type MFASettings,
  type IPWhitelist,
  type SessionManagement,
  type PasswordPolicy,
  type FailedLoginAttempt,
  type SecurityAlert,
} from "@/data/security-compliance";

export function SecurityManagement() {
  // Badge helpers
  const getMFAStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Active: "default",
      Inactive: "secondary",
      "Pending Setup": "outline",
    };
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      Active: CheckCircle2,
      Inactive: XCircle,
      "Pending Setup": Clock,
    };
    const Icon = icons[status] || CheckCircle2;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="size-3" />
        {status}
      </Badge>
    );
  };

  const getIPStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Active: "default",
      Inactive: "secondary",
      Blocked: "destructive",
    };
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      Active: CheckCircle2,
      Inactive: XCircle,
      Blocked: Ban,
    };
    const Icon = icons[status] || CheckCircle2;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="size-3" />
        {status}
      </Badge>
    );
  };

  const getSessionStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Active: "default",
      Expired: "secondary",
      Terminated: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Low: "secondary",
      Medium: "outline",
      High: "default",
      Critical: "destructive",
    };
    return <Badge variant={variants[severity] || "default"}>{severity}</Badge>;
  };

  const getAlertStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      New: "destructive",
      Investigating: "default",
      Resolved: "secondary",
      Dismissed: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getDeviceIcon = (deviceType: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      Desktop: Monitor,
      Mobile: Smartphone,
      Tablet: Tablet,
    };
    return icons[deviceType] || Monitor;
  };

  // MFA Table Columns
  const mfaColumns = [
    {
      key: "userName",
      label: "User",
      render: (item: MFASettings) => (
        <div>
          <div className="font-medium">{item.userName}</div>
          <div className="text-muted-foreground text-xs">{item.userRole}</div>
        </div>
      ),
    },
    {
      key: "mfaMethod",
      label: "MFA Method",
      render: (item: MFASettings) => (
        <Badge variant="outline">{item.mfaMethod}</Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: MFASettings) => getMFAStatusBadge(item.status),
    },
    {
      key: "enrolledAt",
      label: "Enrolled",
      render: (item: MFASettings) => (
        <div className="text-sm">
          {new Date(item.enrolledAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "lastUsed",
      label: "Last Used",
      render: (item: MFASettings) => (
        <div className="text-sm">
          {new Date(item.lastUsed).toLocaleString()}
        </div>
      ),
    },
    {
      key: "backupCodes",
      label: "Backup Codes",
      render: (item: MFASettings) => (
        <div className="text-sm">{item.backupCodes} remaining</div>
      ),
    },
  ];

  const mfaActions = (item: MFASettings) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">
        <Settings className="size-4" />
      </Button>
      {item.mfaEnabled && (
        <Button variant="ghost" size="sm">
          <Eye className="size-4" />
        </Button>
      )}
    </div>
  );
  const ipColumns = [
    {
      key: "ipAddress",
      label: "IP Address",
      render: (item: IPWhitelist) => (
        <div>
          <div className="font-mono font-medium">{item.ipAddress}</div>
          <div className="text-muted-foreground text-xs">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "target",
      label: "Target",
      render: (item: IPWhitelist) => (
        <div className="text-sm">
          {item.facilityName || item.userName || "All"}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: IPWhitelist) => getIPStatusBadge(item.status),
    },
    {
      key: "accessCount",
      label: "Access Count",
      render: (item: IPWhitelist) => (
        <div className="text-sm">{item.accessCount.toLocaleString()}</div>
      ),
    },
    {
      key: "lastUsed",
      label: "Last Used",
      render: (item: IPWhitelist) => (
        <div className="text-sm">
          {new Date(item.lastUsed).toLocaleString()}
        </div>
      ),
    },
    {
      key: "addedBy",
      label: "Added By",
      render: (item: IPWhitelist) => (
        <div className="text-sm">{item.addedBy}</div>
      ),
    },
  ];

  const ipActions = (item: IPWhitelist) => (
    <div className="flex gap-2">
      {item.status === "Blocked" ? (
        <Button variant="ghost" size="sm" className="gap-1">
          <CheckCircle2 className="size-4" />
          Unblock
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="gap-1">
          <Ban className="size-4" />
          Block
        </Button>
      )}
      <Button variant="ghost" size="sm">
        <Settings className="size-4" />
      </Button>
    </div>
  );

  // Session Table Columns
  const sessionColumns = [
    {
      key: "userName",
      label: "User",
      render: (item: SessionManagement) => (
        <div>
          <div className="font-medium">{item.userName}</div>
          <div className="text-muted-foreground text-xs">{item.userRole}</div>
        </div>
      ),
    },
    {
      key: "device",
      label: "Device",
      render: (item: SessionManagement) => {
        const DeviceIcon = getDeviceIcon(item.deviceType);
        return (
          <div className="flex items-center gap-2">
            <DeviceIcon className="text-muted-foreground size-4" />
            <div>
              <div className="text-sm">{item.deviceType}</div>
              <div className="text-muted-foreground text-xs">
                {item.browser}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "location",
      label: "Location",
      render: (item: SessionManagement) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="text-muted-foreground size-3" />
          {item.location}
        </div>
      ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (item: SessionManagement) => (
        <div className="font-mono text-sm">{item.ipAddress}</div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      render: (item: SessionManagement) => (
        <div className="text-sm">{item.duration}</div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: SessionManagement) => getSessionStatusBadge(item.status),
    },
  ];

  const sessionActions = (item: SessionManagement) => (
    <div className="flex gap-2">
      {item.status === "Active" && (
        <Button variant="ghost" size="sm" className="text-destructive gap-1">
          <XCircle className="size-4" />
          Terminate
        </Button>
      )}
      <Button variant="ghost" size="sm">
        <Eye className="size-4" />
      </Button>
    </div>
  );

  // Password Policy Table Columns
  const policyColumns = [
    {
      key: "policyName",
      label: "Policy Name",
      render: (item: PasswordPolicy) => (
        <div>
          <div className="font-medium">{item.policyName}</div>
          <div className="text-muted-foreground text-xs">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "requirements",
      label: "Requirements",
      render: (item: PasswordPolicy) => (
        <div className="space-y-1 text-sm">
          <div>Min Length: {item.minLength}</div>
          <div className="text-muted-foreground text-xs">
            Expires: {item.expirationDays} days
          </div>
        </div>
      ),
    },
    {
      key: "applicableTo",
      label: "Applicable To",
      render: (item: PasswordPolicy) => (
        <div className="flex flex-wrap gap-1">
          {item.applicableTo.slice(0, 2).map((role) => (
            <Badge key={role} variant="outline" className="text-xs">
              {role}
            </Badge>
          ))}
          {item.applicableTo.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{item.applicableTo.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "security",
      label: "Security Level",
      render: (item: PasswordPolicy) => {
        const level =
          item.minLength >= 14 && item.requireSpecialChars ? "High" : "Medium";
        return (
          <Badge variant={level === "High" ? "default" : "outline"}>
            {level}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (item: PasswordPolicy) => (
        <Badge variant={item.status === "Active" ? "default" : "secondary"}>
          {item.status}
        </Badge>
      ),
    },
  ];

  const policyActions = (item: PasswordPolicy) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">
        <Settings className="size-4" />
      </Button>
      {item.status === "Active" && (
        <Button variant="ghost" size="sm">
          <Eye className="size-4" />
        </Button>
      )}
    </div>
  );

  // Failed Login Table Columns - Consolidated for compact display
  const failedLoginColumns = [
    {
      key: "email",
      label: "Account / IP",
      render: (item: FailedLoginAttempt) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{item.email}</div>
          <div className="text-muted-foreground font-mono text-xs">
            {item.ipAddress}
          </div>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        </div>
      ),
    },
    {
      key: "failureReason",
      label: "Reason / Time",
      render: (item: FailedLoginAttempt) => (
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs">
            {item.failureReason}
          </Badge>
          <div className="text-muted-foreground text-xs">
            {new Date(item.attemptTime).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "severity",
      label: "Risk",
      render: (item: FailedLoginAttempt) => (
        <div className="space-y-1">
          {getSeverityBadge(item.severity)}
          <div className="text-muted-foreground text-xs">
            {item.attemptCount} attempts
          </div>
        </div>
      ),
    },
    {
      key: "isBlocked",
      label: "Status",
      render: (item: FailedLoginAttempt) =>
        item.isBlocked ? (
          <Badge variant="destructive" className="gap-1">
            <Ban className="size-3" />
            Blocked
          </Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        ),
    },
  ];

  // Security Alerts Table Columns - Consolidated for compact display
  const alertColumns = [
    {
      key: "title",
      label: "Alert Details",
      render: (item: SecurityAlert) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{item.title}</div>
          <div className="text-muted-foreground line-clamp-1 text-xs">
            {item.description}
          </div>
          <Badge variant="outline" className="mt-1 text-xs">
            {item.alertType}
          </Badge>
        </div>
      ),
    },
    {
      key: "user",
      label: "Source",
      render: (item: SecurityAlert) => (
        <div className="min-w-0">
          {item.userName && (
            <div className="truncate text-sm font-medium">{item.userName}</div>
          )}
          <div className="text-muted-foreground truncate font-mono text-xs">
            {item.ipAddress}
          </div>
          <div className="text-muted-foreground text-xs">
            {new Date(item.detectedAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      render: (item: SecurityAlert) => getSeverityBadge(item.severity),
    },
    {
      key: "status",
      label: "Status",
      render: (item: SecurityAlert) => getAlertStatusBadge(item.status),
    },
  ];

  const alertActions = (item: SecurityAlert) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="size-8">
        <Eye className="size-4" />
      </Button>
      {item.status === "New" && (
        <Button variant="ghost" size="icon" className="size-8">
          <Play className="size-4" />
        </Button>
      )}
    </div>
  );

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Security Management</h3>
          <p className="text-muted-foreground text-sm">
            Manage access control and monitor security threats
          </p>
        </div>
      </div>

      {/* Security Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Security Score
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {securityDashboardStats.securityScore}%
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Excellent security posture
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-green-500/20 to-green-600/20">
                <ShieldCheck className="size-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Alerts
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {securityDashboardStats.activeAlerts}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {securityDashboardStats.criticalAlerts} critical
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-red-500/20 to-red-600/20">
                <ShieldAlert className="size-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Sessions
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {securityDashboardStats.activeSessions}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Users currently logged in
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500/20 to-blue-600/20">
                <Users className="size-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  MFA Adoption
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {securityDashboardStats.mfaAdoptionRate}%
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Users with MFA enabled
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-purple-500/20 to-purple-600/20">
                <Lock className="size-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="access-control" className="space-y-6">
        <TabsList>
          <TabsTrigger value="access-control">Access Control</TabsTrigger>
          <TabsTrigger value="security-monitoring">
            Security Monitoring
          </TabsTrigger>
        </TabsList>

        {/* Access Control Tab */}
        <TabsContent value="access-control" className="space-y-6">
          {/* MFA Settings */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Lock className="size-5" />
                Multi-Factor Authentication
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Manage MFA settings for users
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={mfaColumns}
                data={mfaSettings}
                actions={mfaActions}
              />
            </CardContent>
          </Card>

          {/* IP Whitelist */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Globe className="size-5" />
                IP Whitelist Management
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Control access based on IP addresses
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={ipColumns}
                data={ipWhitelist}
                actions={ipActions}
              />
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="size-5" />
                Active Sessions
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Monitor and manage user sessions
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={sessionColumns}
                data={activeSessions}
                actions={sessionActions}
              />
            </CardContent>
          </Card>

          {/* Password Policies */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Key className="size-5" />
                Password Policies
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Configure password requirements and rules
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={policyColumns}
                data={passwordPolicies}
                actions={policyActions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Monitoring Tab */}
        <TabsContent
          value="security-monitoring"
          className="space-y-6 overflow-x-hidden"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Failed Logins Trend */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Failed Login Attempts (7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={securityDashboardStats.weeklyFailedLogins}>
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
                      dataKey="count"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Alert Types Distribution */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Alert Types Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4 lg:flex-row">
                  <ResponsiveContainer
                    width="100%"
                    height={180}
                    className="max-w-[200px]"
                  >
                    <PieChart>
                      <Pie
                        data={securityDashboardStats.alertsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {securityDashboardStats.alertsByType.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full flex-1 space-y-2">
                    {securityDashboardStats.alertsByType.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div
                          className="size-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="flex-1 truncate">{entry.type}</span>
                        <span className="font-medium">{entry.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Threats */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Top Security Threats
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Most frequent security threats detected
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityDashboardStats.topThreats.map((threat, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="bg-destructive/10 text-destructive flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {threat.threat}
                        </div>
                      </div>
                      {getSeverityBadge(threat.severity)}
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {threat.count}
                      </span>
                    </div>
                    <div className="bg-muted ml-8 h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-destructive h-1.5 rounded-full"
                        style={{
                          width: `${(threat.count / securityDashboardStats.topThreats[0].count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Failed Login Attempts */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <AlertTriangle className="size-5" />
                Failed Login Attempts
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Track and analyze failed authentication attempts
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={failedLoginColumns}
                data={failedLoginAttempts}
              />
            </CardContent>
          </Card>

          {/* Security Alerts */}
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <ShieldAlert className="size-5" />
                Security Alerts
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Real-time security threats and suspicious activities
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={alertColumns}
                data={securityAlerts}
                actions={alertActions}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
