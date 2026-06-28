"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  BellRing,
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
  Play,
  Check,
  ArrowUpCircle,
  Pencil,
  Trash2,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  notificationChannels,
  type SystemAlert,
  type AlertConfiguration,
  type NotificationChannel,
} from "@/data/system-health";
import {
  acknowledgeAlert,
  escalateAlert,
  resolveAlert,
  useAlerts,
  type AlertSeverity,
} from "@/lib/alerts-store";
import { IMPERSONATING_ADMIN } from "@/lib/impersonation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supportAgents } from "@/data/support-tickets";
import {
  createAlertConfig,
  deleteAlertConfig,
  toggleAlertConfig,
  updateAlertConfig,
  useAlertConfigs,
  type AlertRuleInput,
} from "@/lib/alert-config-store";
import { AlertRuleModal } from "./alert-rule-modal";
import { NotificationHoursCard } from "./notification-hours-card";
import { NotificationRecipientsCard } from "./notification-recipients-card";
import { NotificationSlackCard } from "./notification-slack-card";

export function AlertsNotifications() {
  const alerts = useAlerts();
  const admin = IMPERSONATING_ADMIN.name;

  const [resolveTarget, setResolveTarget] = useState<SystemAlert | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [escalateTarget, setEscalateTarget] = useState<SystemAlert | null>(
    null,
  );
  const [escalateNote, setEscalateNote] = useState("");
  const [escalateSeverity, setEscalateSeverity] =
    useState<AlertSeverity>("High");

  const SEVERITY_ORDER: AlertSeverity[] = ["Low", "Medium", "High", "Critical"];
  const nextSeverity = (s: AlertSeverity): AlertSeverity =>
    SEVERITY_ORDER[Math.min(SEVERITY_ORDER.indexOf(s) + 1, 3)];

  const handleAcknowledge = (item: SystemAlert) => {
    acknowledgeAlert(item.alertId, admin);
    toast.success(`Alert acknowledged by ${admin}`);
  };
  const openResolve = (item: SystemAlert) => {
    setResolveTarget(item);
    setResolveNote("");
  };
  const confirmResolve = () => {
    if (!resolveTarget) return;
    resolveAlert(resolveTarget.alertId, resolveNote.trim(), admin);
    toast.success("Alert resolved");
    setResolveTarget(null);
  };
  const openEscalate = (item: SystemAlert) => {
    setEscalateTarget(item);
    setEscalateNote("");
    setEscalateSeverity(nextSeverity(item.severity));
  };
  const confirmEscalate = () => {
    if (!escalateTarget) return;
    escalateAlert(
      escalateTarget.alertId,
      escalateSeverity,
      escalateNote.trim(),
      admin,
    );
    toast.success(`Alert escalated to ${escalateSeverity}`);
    setEscalateTarget(null);
  };

  // Alert rules (configuration tab)
  const configs = useAlertConfigs();
  const availableSupportAgents = supportAgents.filter(
    (a) => a.status === "Available",
  );

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleNonce, setRuleNonce] = useState(0);
  const [editTarget, setEditTarget] = useState<AlertConfiguration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertConfiguration | null>(
    null,
  );

  const openCreateRule = () => {
    setEditTarget(null);
    setRuleNonce((n) => n + 1);
    setRuleModalOpen(true);
  };
  const openEditRule = (item: AlertConfiguration) => {
    setEditTarget(item);
    setRuleNonce((n) => n + 1);
    setRuleModalOpen(true);
  };
  const handleSaveRule = (input: AlertRuleInput) => {
    if (editTarget) {
      updateAlertConfig(editTarget.configId, input);
      toast.success("Alert rule updated");
    } else {
      createAlertConfig(input, admin);
      toast.success("Alert rule created");
    }
    setRuleModalOpen(false);
  };
  const confirmDeleteRule = () => {
    if (!deleteTarget) return;
    deleteAlertConfig(deleteTarget.configId);
    toast.success("Alert rule deleted");
    setDeleteTarget(null);
  };
  const handleToggleRule = (item: AlertConfiguration, enabled: boolean) => {
    toggleAlertConfig(item.configId, enabled);
    toast.success(enabled ? "Rule enabled" : "Rule disabled");
  };

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
        <Icon className="size-3" />
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

  const conditionSymbol = (c: string) =>
    (
      ({
        greater_than: ">",
        less_than: "<",
        equals: "=",
        not_equals: "≠",
        anomaly: "anomaly",
      }) as Record<string, string>
    )[c] ?? c;

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
          {item.escalatedBy && (
            <Badge
              variant="outline"
              className="border-amber-300 text-xs text-amber-600 dark:border-amber-800 dark:text-amber-400"
            >
              Escalated
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
          {item.acknowledgedBy && item.acknowledgedAt && (
            <div className="text-muted-foreground text-[11px]">
              Ack: {item.acknowledgedBy} ·{" "}
              {new Date(item.acknowledgedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      ),
    },
  ];

  const alertActions = (item: SystemAlert) => {
    const isActive = item.status !== "Resolved" && item.status !== "Dismissed";
    if (!isActive) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {item.status === "New" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Acknowledge alert"
            title="Acknowledge"
            onClick={() => handleAcknowledge(item)}
          >
            <Check className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Resolve alert"
          title="Resolve"
          onClick={() => openResolve(item)}
        >
          <CheckCircle2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Escalate alert"
          title="Escalate"
          onClick={() => openEscalate(item)}
        >
          <ArrowUpCircle className="size-4" />
        </Button>
      </div>
    );
  };

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
            {conditionSymbol(item.condition)} {item.threshold}
          </div>
          {item.duration > 0 && (
            <div className="text-muted-foreground text-xs">
              for {item.duration}min
            </div>
          )}
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
                <Icon className="size-3" />
                {channel}
              </Badge>
            );
          })}
          {item.channels.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{item.channels.length - 2}
            </Badge>
          )}
          {item.routeToSupportAgents && (
            <Badge
              variant="secondary"
              className="gap-1 text-xs"
              title={availableSupportAgents.map((a) => a.name).join(", ")}
            >
              <Users className="size-3" />
              {availableSupportAgents.length} support agents
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
          <Switch
            checked={item.enabled}
            onCheckedChange={(c) => handleToggleRule(item, c)}
            aria-label={item.enabled ? "Disable rule" : "Enable rule"}
          />
          <div className="text-muted-foreground text-xs">
            {item.triggerCount} triggers
          </div>
        </div>
      ),
    },
  ];

  const configActions = (item: AlertConfiguration) => (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Edit rule"
        title="Edit"
        onClick={() => openEditRule(item)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-red-600 hover:text-red-700"
        aria-label="Delete rule"
        title="Delete"
        onClick={() => setDeleteTarget(item)}
      >
        <Trash2 className="size-4" />
      </Button>
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

  // Calculate stats
  const criticalAlerts = alerts.filter((a) => a.severity === "Critical").length;
  const activeAlerts = alerts.filter(
    (a) => a.status === "New" || a.status === "Investigating",
  ).length;
  const totalImpacted = alerts.reduce((sum, a) => sum + a.impactedUsers, 0);
  const activeConfigs = configs.filter((c) => c.enabled).length;

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
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-orange-500/20 to-orange-600/20">
                <Bell className="size-6 text-orange-600" />
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
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-red-500/20 to-red-600/20">
                <AlertTriangle className="size-6 text-red-600" />
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
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-purple-500/20 to-purple-600/20">
                <Users className="size-6 text-purple-600" />
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
              <div className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500/20 to-blue-600/20">
                <Settings className="size-6 text-blue-600" />
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
                <AlertTriangle className="size-5" />
                System Alerts
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Critical errors, performance issues, and capacity warnings
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={alertColumns}
                data={alerts}
                actions={alertActions}
                emptyState={{
                  icon: BellRing,
                  title: "No system alerts",
                  description:
                    "All systems are healthy. Triggered alerts will appear here.",
                }}
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Settings className="size-5" />
                    Alert Configuration
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Configure alert thresholds, notification channels, and
                    escalation rules
                  </p>
                </div>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={openCreateRule}
                >
                  <Plus className="mr-2 size-4" />
                  New Alert Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={configColumns}
                data={configs}
                actions={configActions}
                emptyState={{
                  icon: Settings,
                  title: "No alert rules configured",
                  description:
                    "Create a rule to define thresholds, channels, and escalation paths.",
                  action: {
                    label: "New Alert Rule",
                    onClick: openCreateRule,
                    icon: Plus,
                  },
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Channels Tab */}
        <TabsContent value="channels" className="space-y-6 overflow-x-hidden">
          <NotificationRecipientsCard />
          <NotificationSlackCard />
          <NotificationHoursCard />

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Bell className="size-5" />
                Connected Channels
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Live delivery status of your email, SMS, Slack, PagerDuty, and
                webhook integrations
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={channelColumns}
                data={notificationChannels}
                emptyState={{
                  icon: Bell,
                  title: "No notification channels",
                  description:
                    "Connect email, SMS, Slack, PagerDuty, or webhook integrations to deliver alerts.",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit alert rule */}
      <AlertRuleModal
        key={`rule-${ruleNonce}`}
        open={ruleModalOpen}
        target={editTarget}
        onOpenChange={setRuleModalOpen}
        onSubmit={handleSaveRule}
      />

      {/* Delete rule confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete alert rule?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.alertName}&rdquo; will be permanently
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDeleteRule}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve modal */}
      <Dialog
        open={!!resolveTarget}
        onOpenChange={(o) => {
          if (!o) setResolveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Resolve Alert
            </DialogTitle>
            <DialogDescription>{resolveTarget?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="resolution-note">Resolution note</Label>
            <Textarea
              id="resolution-note"
              rows={4}
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Describe how the issue was resolved…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!resolveNote.trim()}
              onClick={confirmResolve}
            >
              <CheckCircle2 className="mr-2 size-4" />
              Resolve Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate modal */}
      <Dialog
        open={!!escalateTarget}
        onOpenChange={(o) => {
          if (!o) setEscalateTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="size-5 text-amber-600" />
              Escalate Alert
            </DialogTitle>
            <DialogDescription>
              {escalateTarget?.title}
              {escalateTarget && ` · currently ${escalateTarget.severity}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>New severity</Label>
              <Select
                value={escalateSeverity}
                onValueChange={(v) => setEscalateSeverity(v as AlertSeverity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="escalation-note">Escalation note</Label>
              <Textarea
                id="escalation-note"
                rows={4}
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                placeholder="Why is this being escalated?…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              disabled={!escalateNote.trim()}
              onClick={confirmEscalate}
            >
              <ArrowUpCircle className="mr-2 size-4" />
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
