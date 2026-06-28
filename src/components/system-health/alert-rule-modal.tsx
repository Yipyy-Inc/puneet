"use client";

import { useState } from "react";

import { Bell, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supportAgents } from "@/data/support-tickets";
import type { AlertConfiguration } from "@/data/system-health";
import type {
  AlertRuleChannel,
  AlertRuleInput,
  AlertRuleSeverity,
  AlertRuleType,
} from "@/lib/alert-config-store";

const TYPES: AlertRuleType[] = [
  "Threshold",
  "Anomaly",
  "Pattern",
  "Composite",
  "Support SLA",
];
const SEVERITIES: AlertRuleSeverity[] = ["Low", "Medium", "High", "Critical"];
const CHANNELS: AlertRuleChannel[] = [
  "Email",
  "SMS",
  "Slack",
  "PagerDuty",
  "Webhook",
];
const CONDITIONS = [
  { value: "greater_than", label: "Greater than (>)" },
  { value: "less_than", label: "Less than (<)" },
  { value: "equals", label: "Equals (=)" },
  { value: "not_equals", label: "Not equals (≠)" },
  { value: "anomaly", label: "Anomaly" },
];

const DEFAULT_INPUT: AlertRuleInput = {
  alertName: "",
  alertType: "Threshold",
  metric: "",
  condition: "greater_than",
  threshold: 0,
  duration: 5,
  severity: "Medium",
  channels: ["Email"],
  recipients: [],
  routeToSupportAgents: false,
  enabled: true,
};

function toInput(target: AlertConfiguration): AlertRuleInput {
  return {
    alertName: target.alertName,
    alertType: target.alertType,
    metric: target.metric,
    condition: target.condition,
    threshold: target.threshold,
    duration: target.duration,
    severity: target.severity,
    channels: [...target.channels],
    recipients: [...target.recipients],
    routeToSupportAgents: !!target.routeToSupportAgents,
    enabled: target.enabled,
  };
}

export function AlertRuleModal({
  open,
  target,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  target: AlertConfiguration | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AlertRuleInput) => void;
}) {
  const isEdit = !!target;
  const [form, setForm] = useState<AlertRuleInput>(
    target ? toInput(target) : DEFAULT_INPUT,
  );

  const set = (patch: Partial<AlertRuleInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const toggleChannel = (ch: AlertRuleChannel, on: boolean) =>
    set({
      channels: on
        ? [...form.channels, ch]
        : form.channels.filter((c) => c !== ch),
    });

  const availableAgents = supportAgents.filter((a) => a.status === "Available");
  const valid = form.alertName.trim() !== "" && form.metric.trim() !== "";

  const submit = () => {
    if (!valid) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            {isEdit ? "Edit Alert Rule" : "New Alert Rule"}
          </DialogTitle>
          <DialogDescription>
            Define the metric, threshold, severity and where the alert is
            routed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              value={form.alertName}
              onChange={(e) => set({ alertName: e.target.value })}
              placeholder="e.g. High Response Time Alert"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Alert type</Label>
              <Select
                value={form.alertType}
                onValueChange={(v) => {
                  const t = v as AlertRuleType;
                  set({
                    alertType: t,
                    routeToSupportAgents:
                      t === "Support SLA" ? true : form.routeToSupportAgents,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => set({ severity: v as AlertRuleSeverity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="rule-metric">Metric</Label>
            <Input
              id="rule-metric"
              value={form.metric}
              onChange={(e) => set({ metric: e.target.value })}
              placeholder="e.g. API Response Time"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) => set({ condition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-threshold">Threshold</Label>
              <Input
                id="rule-threshold"
                type="number"
                value={form.threshold}
                onChange={(e) => set({ threshold: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-duration">Duration (min)</Label>
              <Input
                id="rule-duration"
                type="number"
                min={0}
                value={form.duration}
                onChange={(e) => set({ duration: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Notification channels</Label>
            <div className="flex flex-wrap gap-3">
              {CHANNELS.map((ch) => (
                <label
                  key={ch}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={form.channels.includes(ch)}
                    onCheckedChange={(c) => toggleChannel(ch, c === true)}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          {/* Support-agent routing */}
          <div className="bg-muted/40 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground size-4" />
                <Label htmlFor="route-support" className="cursor-pointer">
                  Route to all available support agents
                </Label>
              </div>
              <Switch
                id="route-support"
                checked={form.routeToSupportAgents}
                onCheckedChange={(c) => set({ routeToSupportAgents: c })}
              />
            </div>
            {form.routeToSupportAgents && (
              <p className="text-muted-foreground text-xs">
                Currently {availableAgents.length} available:{" "}
                {availableAgents.map((a) => a.name).join(", ") || "none"}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="rule-enabled" className="cursor-pointer">
              Enabled
            </Label>
            <Switch
              id="rule-enabled"
              checked={form.enabled}
              onCheckedChange={(c) => set({ enabled: c })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!valid}
            onClick={submit}
          >
            {isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
