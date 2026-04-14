"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ExternalLink,
  Mail,
  MessageSquare,
  Zap,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AbandonmentRecoverySettings,
  AbandonmentStepAutomation,
  AbandonmentRecoveryChannel,
  AbandonmentStep,
} from "@/types/unfinished-booking";
import { ABANDONMENT_STEP_LABELS } from "@/data/unfinished-bookings";
import { DEFAULT_ABANDONMENT_RECOVERY_SETTINGS } from "@/data/abandonment-recovery-settings";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDERED_STEPS: AbandonmentStep[] = [
  "service_selection",
  "pet_selection",
  "date_and_details",
  "add_ons",
  "forms",
  "review",
  "payment",
];

const GLOBAL_CHANNEL_OPTIONS = [
  { value: "email", label: "Email only" },
  { value: "sms", label: "SMS only" },
  { value: "both", label: "Email + SMS" },
  { value: "off", label: "Off (manual only)" },
];

const STEP_CHANNEL_OPTIONS = [
  { value: "inherit", label: "Use default" },
  ...GLOBAL_CHANNEL_OPTIONS,
];

const GLOBAL_DELAY_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "4", label: "4 hours" },
  { value: "8", label: "8 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
];

const STEP_DELAY_OPTIONS = [
  { value: "inherit", label: "Use default" },
  ...GLOBAL_DELAY_OPTIONS,
];

const TEMPLATE_VARS = [
  "{{client_name}}",
  "{{pet_name}}",
  "{{service}}",
  "{{facility_name}}",
  "{{resume_link}}",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvedChannel(
  rule: AbandonmentStepAutomation,
  settings: AbandonmentRecoverySettings,
): AbandonmentRecoveryChannel {
  return rule.channel === "inherit" ? settings.defaultChannel : rule.channel;
}

// ─── Variable chips ───────────────────────────────────────────────────────────

function VarChips() {
  return (
    <div className="flex flex-wrap gap-1">
      {TEMPLATE_VARS.map((v) => (
        <button
          key={v}
          type="button"
          className="bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground rounded-sm px-1.5 py-0.5 font-mono text-[10px] transition-colors"
          title="Click to copy"
          onClick={() => {
            navigator.clipboard.writeText(v);
            toast.success(`Copied ${v}`);
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

// ─── Per-step accordion item ──────────────────────────────────────────────────

interface StepRowProps {
  step: AbandonmentStep;
  rule: AbandonmentStepAutomation;
  masterEnabled: boolean;
  settings: AbandonmentRecoverySettings;
  onUpdate: (patch: Partial<AbandonmentStepAutomation>) => void;
}

function StepRow({
  step,
  rule,
  masterEnabled,
  settings,
  onUpdate,
}: StepRowProps) {
  const stepConfig = ABANDONMENT_STEP_LABELS[step];
  const effective = resolvedChannel(rule, settings);
  const isDisabled = !masterEnabled || !rule.enabled;
  const showEmail = effective === "email" || effective === "both";
  const showSms = effective === "sms" || effective === "both";

  return (
    <AccordionItem
      value={step}
      className="overflow-hidden rounded-xl border px-0"
    >
      <AccordionPrimitive.Header className="flex items-center gap-3 px-4 py-3">
        {/* Switch lives outside the trigger button to avoid nested <button> */}
        <Switch
          checked={rule.enabled}
          disabled={!masterEnabled}
          onCheckedChange={(v) => onUpdate({ enabled: v })}
          className="shrink-0"
        />
        <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between overflow-hidden text-left [&[data-state=open]>svg]:rotate-180">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{stepConfig.label}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="bg-muted h-1 w-14 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${stepConfig.progress}%` }}
                />
              </div>
              <span className="text-muted-foreground text-[10px]">
                {stepConfig.progress}%
              </span>
              <Badge
                variant="outline"
                className={`h-4 px-1.5 py-0 text-[10px] ${
                  !rule.enabled || !masterEnabled
                    ? "text-muted-foreground"
                    : effective === "off"
                      ? "text-muted-foreground"
                      : "text-foreground"
                }`}
              >
                {rule.enabled && masterEnabled ? effective : "off"}
              </Badge>
            </div>
          </div>
          <ChevronDown className="text-muted-foreground ml-2 size-4 shrink-0 transition-transform duration-200" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>

      <AccordionContent className="space-y-4 border-t px-4 pt-3 pb-4">
        {/* Channel + Delay row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Channel</Label>
            <Select
              value={rule.channel}
              disabled={isDisabled}
              onValueChange={(v) =>
                onUpdate({
                  channel: v as AbandonmentStepAutomation["channel"],
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_CHANNEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Send Delay</Label>
            <Select
              value={
                rule.delayHours === "inherit"
                  ? "inherit"
                  : String(rule.delayHours)
              }
              disabled={isDisabled}
              onValueChange={(v) =>
                onUpdate({
                  delayHours: v === "inherit" ? "inherit" : Number(v),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_DELAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Email template */}
        {showEmail && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Mail className="text-muted-foreground size-3.5" />
              <p className="text-xs font-medium">Email Template</p>
            </div>
            <Input
              className="h-8 text-xs"
              placeholder="Subject line…"
              value={rule.emailSubject}
              disabled={isDisabled}
              onChange={(e) => onUpdate({ emailSubject: e.target.value })}
            />
            <Textarea
              className="min-h-[110px] resize-none text-xs"
              placeholder="Email body…"
              value={rule.emailBody}
              disabled={isDisabled}
              onChange={(e) => onUpdate({ emailBody: e.target.value })}
            />
          </div>
        )}

        {/* SMS template */}
        {showSms && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="text-muted-foreground size-3.5" />
                <p className="text-xs font-medium">SMS Template</p>
              </div>
              <span
                className={`text-[10px] ${
                  rule.smsBody.length > 160
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {rule.smsBody.length}/160 chars
              </span>
            </div>
            <Textarea
              className="min-h-[72px] resize-none text-xs"
              placeholder="SMS message…"
              value={rule.smsBody}
              disabled={isDisabled}
              onChange={(e) => onUpdate({ smsBody: e.target.value })}
            />
          </div>
        )}

        {/* Variable chips */}
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px]">
            Available variables (click to copy):
          </p>
          <VarChips />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbandonmentRecoverySettings({ open, onOpenChange }: Props) {
  const [settings, setSettings] = useState<AbandonmentRecoverySettings>(
    DEFAULT_ABANDONMENT_RECOVERY_SETTINGS,
  );

  const updateStep = (
    step: AbandonmentStep,
    patch: Partial<AbandonmentStepAutomation>,
  ) =>
    setSettings((prev) => ({
      ...prev,
      stepRules: {
        ...prev.stepRules,
        [step]: { ...prev.stepRules[step], ...patch },
      },
    }));

  const activeStepCount = ORDERED_STEPS.filter(
    (s) => settings.stepRules[s].enabled,
  ).length;

  const handleSave = () => {
    toast.success("Abandonment recovery settings saved");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden sm:max-w-xl"
      >
        {/* Header */}
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Zap className="size-4 text-amber-600" />
            </div>
            <div>
              <SheetTitle className="text-base/tight">
                Abandonment Recovery Settings
              </SheetTitle>
              <SheetDescription className="text-xs">
                Auto-reach out when clients don&apos;t finish their booking
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {/* Master toggle */}
          <div className="bg-muted/30 flex items-center justify-between rounded-xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enable Recovery Automation</p>
              <p className="text-muted-foreground text-xs">
                Automatically contact clients who abandon their booking
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) =>
                setSettings((prev) => ({ ...prev, enabled: v }))
              }
            />
          </div>

          {/* Global defaults */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Default Settings
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Channel</Label>
                <Select
                  value={settings.defaultChannel}
                  disabled={!settings.enabled}
                  onValueChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultChannel: v as AbandonmentRecoveryChannel,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GLOBAL_CHANNEL_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-xs"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Send Delay</Label>
                <Select
                  value={String(settings.defaultDelayHours)}
                  disabled={!settings.enabled}
                  onValueChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultDelayHours: Number(v),
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GLOBAL_DELAY_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-xs"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/20">
              <Info className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Steps set to <strong>Use default</strong> will inherit these
                values. Override per step below for finer control.
              </p>
            </div>
          </div>

          <Separator />

          {/* Per-step rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Per-Step Rules
              </p>
              <span className="text-muted-foreground text-xs">
                {activeStepCount}/{ORDERED_STEPS.length} active
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Expand each step to configure the message sent when a client
              abandons there. Each step can override the default channel and
              delay.
            </p>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {ORDERED_STEPS.map((step) => (
              <StepRow
                key={step}
                step={step}
                rule={settings.stepRules[step]}
                masterEnabled={settings.enabled}
                settings={settings}
                onUpdate={(patch) => updateStep(step, patch)}
              />
            ))}
          </Accordion>
        </div>

        {/* Footer */}
        <SheetFooter className="flex-row items-center justify-between gap-2 border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5 text-xs"
            asChild
          >
            <a href="/facility/dashboard/automations">
              <ExternalLink className="size-3.5" />
              View in Automations
            </a>
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
