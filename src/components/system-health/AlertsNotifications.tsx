"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
  Settings,
  Eye,
  Play,
  Check,
  Users,
  Zap,
} from "lucide-react";
import {
  systemAlerts,
  alertConfigurations,
  notificationChannels,
  type SystemAlert,
  type AlertConfiguration,
  type NotificationChannel,
} from "@/data/system-health";

export function AlertsNotifications() {
  // Badge helpers
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
      Acknowledged: "outline",
      Investigating: "default",
      Resolved: "secondary",
      Dismissed: "secondary",
    };
    const icons: Record<string, typeof AlertCircle> = {
      New: AlertCircle,
      Acknowledged: Clock,
      Investigating: Play,
      Resolved: CheckCircle2,
      Dismissed: XCircle,
    };
    const Icon = icons[status] || AlertCircle;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getChannelStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Active: "default",
      Inactive: "secondary",
      Failed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getChannelIcon = (channelType: string) => {
    const icons: Record<string, typeof AlertCircle> = {
      Email: Mail,
      SMS: Smartphone,
      Slack: MessageSquare,
      PagerDuty: Bell,
      Webhook: Webhook,
      "Microsoft Teams": MessageSquare,
    };
    return icons[channelType] || Bell;
  };

  // System Alerts Columns
  const alertColumns = [
    {
      key: "title",
      label: "Alert Details",
      render: (item: SystemAlert) => (
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
      key: "severity",
      label: "Severity",
      render: (item: SystemAlert) => (
        <div className="space-y-1">
          {getSeverityBadge(item.severity)}
          {item.autoEscalated && (
            <Badge variant="outline" className="text-xs">
              Auto-escalated
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "impact",
      label: "Impact",
      render: (item: SystemAlert) => (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{item.impactedUsers} users</div>
          <div className="text-muted-foreground text-xs">
            {item.affectedServices.length} service(s)
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: SystemAlert) => (
        <div className="space-y-1">
          {getAlertStatusBadge(item.status)}
          <div className="text-muted-foreground text-xs">
            {new Date(item.triggeredAt).toLocaleString()}
          </div>
        </div>
      ),
    },
  ];

  const alertActions = (item: SystemAlert) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Eye className="size-4" />
      </Button>
      {item.status === "New" && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Check className="size-4" />
        </Button>
      )}
      {(item.status === "Acknowledged" || item.status === "New") && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Play className="size-4" />
        </Button>
      )}
    </div>
  );

  // Alert Configuration Columns
  const configColumns = [
    {
      key: "alertName",
      label: "Alert Name",
      render: (item: AlertConfiguration) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{item.alertName}</div>
          <div className="text-muted-foreground text-xs">{item.metric}</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {item.alertType}
          </Badge>
        </div>
      ),
    },
    {
      key: "condition",
      label: "Condition",
      render: (item: AlertConfiguration) => (
        <div className="space-y-1 text-sm">
          <div className="font-mono">
            {item.condition} {item.threshold}
          </div>
          <div className="text-muted-foreground text-xs">
            for {item.duration}min
          </div>
        </div>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      render: (item: AlertConfiguration) => getSeverityBadge(item.severity),
    },
    {
      key: "channels",
      label: "Channels",
      render: (item: AlertConfiguration) => (
        <div className="flex flex-wrap gap-1">
          {item.channels.slice(0, 2).map((channel) => {
            const Icon = getChannelIcon(channel);
            return (
              <Badge key={channel} variant="outline" className="gap-1 text-xs">
                <Icon className="h-3 w-3" />
                {channel}
              </Badge>
            );
          })}
          {item.channels.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{item.channels.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: (item: AlertConfiguration) => (
        <div className="space-y-1">
          <Switch checked={item.enabled} disabled />
          <div className="text-muted-foreground text-xs">
            {item.triggerCount} triggers
          </div>
        </div>
      ),
    },
  ];

  const configActions = (item: AlertConfiguration) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Settings className="size-4" />
      </Button>
      {item.enabled && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Eye className="size-4" />
        </Button>
      )}
    </div>
  );

  // Notification Channels Columns
  const channelColumns = [
    {
      key: "channelName",
      label: "Channel",
      render: (item: NotificationChannel) => {
        const Icon = getChannelIcon(item.channelType);
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-medium">
              <Icon className="text-muted-foreground size-4" />
              {item.channelName}
            </div>
            <Badge variant="outline" className="mt-1 text-xs">
              {item.channelType}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (item: NotificationChannel) => (
        <div className="space-y-1">
          {getChannelStatusBadge(item.status)}
          <div className="text-muted-foreground text-xs">
            {item.deliveryRate}% delivery
          </div>
        </div>
      ),
    },
    {
      key: "recipients",
      label: "Recipients",
      render: (item: NotificationChannel) => (
        <div className="text-sm">{item.recipients.length} recipient(s)</div>
      ),
    },
    {
      key: "usage",
      label: "Usage (24h)",
      render: (item: NotificationChannel) => (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{item.alertsSent24h} alerts</div>
          <div className="text-muted-foreground text-xs">
            Last: {new Date(item.lastUsed).toLocaleString()}
          </div>
        </div>
      ),
    },
  ];

  const channelActions = (item: NotificationChannel) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Settings className="size-4" />
      </Button>
      {item.status === "Active" && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Zap className="size-4" />
        </Button>
      )}
    </div>
  );

  // Calculate stats
  const criticalAlerts = systemAlerts.filter(
    (a) => a.severity === "Critical",
  ).length;
  const activeAlerts = systemAlerts.filter(
    (a) => a.status === "New" || a.status === "Investigating",
  ).length;
  const totalImpacted = systemAlerts.reduce(
    (sum, a) => sum + a.impactedUsers,
    0,
  );
  const activeConfigs = alertConfigurations.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Alerts & Notifications</h3>
          <p className="text-muted-foreground text-sm">
            Monitor system alerts and configure notification channels
          </p>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Alerts
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {activeAlerts}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Require attention
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-orange-500/20 to-orange-600/20">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Critical
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {criticalAlerts}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  High priority alerts
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-red-500/20 to-red-600/20">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Users Impacted
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {totalImpacted}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Across all alerts
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-purple-500/20 to-purple-600/20">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Rules
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {activeConfigs}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Monitoring configurations
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500/20 to-blue-600/20">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
          <TabsTrigger value="configuration">Alert Configuration</TabsTrigger>
          <TabsTrigger value="channels">Notification Channels</TabsTrigger>
        </TabsList>

        {/* System Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6 overflow-x-hidden">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <AlertTriangle className="h-5 w-5" />
                System Alerts
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Critical errors, performance issues, and capacity warnings
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={alertColumns}
                data={systemAlerts}
                actions={alertActions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Configuration Tab */}
        <TabsContent
          value="configuration"
          className="space-y-6 overflow-x-hidden"
        >
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Settings className="h-5 w-5" />
                Alert Configuration
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Configure alert thresholds, notification channels, and
                escalation rules
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={configColumns}
                data={alertConfigurations}
                actions={configActions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Channels Tab */}
        <TabsContent value="channels" className="space-y-6 overflow-x-hidden">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Bell className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Manage email, SMS, Slack, PagerDuty, and webhook integrations
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={channelColumns}
                data={notificationChannels}
                actions={channelActions}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
