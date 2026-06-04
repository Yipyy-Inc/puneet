"use client";

import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Sparkles } from "lucide-react";
import type { EarnRule, EarnRuleRewardType } from "@/types/loyalty";
import { BOOKABLE_SERVICE_TYPES } from "@/data/facility-loyalty-config";
import { summarizeEarnRule } from "@/lib/loyalty/earn-rule-summary";
import { FutureChangesNotice } from "@/components/loyalty/config/FutureChangesNotice";

type PresetKey =
  | "spend"
  | "booking"
  | "service_daycare"
  | "service_grooming"
  | "service_training"
  | "birthday"
  | "first_booking"
  | "referral"
  | "manual";

const TRIGGER_PRESETS: { key: PresetKey; label: string }[] = [
  { key: "spend", label: "Per $1 spent" },
  { key: "booking", label: "Per booking completed" },
  { key: "service_daycare", label: "Per daycare visit" },
  { key: "service_grooming", label: "Per grooming appointment" },
  { key: "service_training", label: "Per training class attended" },
  { key: "birthday", label: "On birthday" },
  { key: "first_booking", label: "On first booking" },
  { key: "referral", label: "On referral completion" },
  { key: "manual", label: "Manually (staff award)" },
];

const PRESET_LABEL: Record<PresetKey, string> = Object.fromEntries(
  TRIGGER_PRESETS.map((p) => [p.key, p.label]),
) as Record<PresetKey, string>;

const REWARD_OPTIONS: { key: EarnRuleRewardType; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "credit", label: "Account Credit ($)" },
  { key: "gift_card", label: "Gift Card ($)" },
  { key: "discount_pct", label: "Percentage Discount" },
  { key: "discount_fixed", label: "Fixed Discount" },
  { key: "freebie", label: "Free Service" },
];

const SERVICE_PRESETS: PresetKey[] = [
  "service_daycare",
  "service_grooming",
  "service_training",
];

function applyPreset(rule: EarnRule, key: PresetKey): EarnRule {
  const base = { ...rule, name: PRESET_LABEL[key] };
  switch (key) {
    case "spend":
      return {
        ...base,
        triggerType: "spend_amount",
        triggerValue: rule.triggerValue ?? 1,
        appliesToServiceTypes: rule.appliesToServiceTypes ?? null,
      };
    case "booking":
      return { ...base, triggerType: "booking_completed", triggerValue: null };
    case "service_daycare":
      return {
        ...base,
        triggerType: "service_type",
        triggerValue: null,
        appliesToServiceTypes: ["daycare"],
      };
    case "service_grooming":
      return {
        ...base,
        triggerType: "service_type",
        triggerValue: null,
        appliesToServiceTypes: ["grooming"],
      };
    case "service_training":
      return {
        ...base,
        triggerType: "service_type",
        triggerValue: null,
        appliesToServiceTypes: ["training"],
      };
    case "birthday":
      return { ...base, triggerType: "birthday", triggerValue: null };
    case "first_booking":
      return { ...base, triggerType: "first_booking", triggerValue: null };
    case "referral":
      return { ...base, triggerType: "referral_completed", triggerValue: null };
    case "manual":
      return { ...base, triggerType: "manual", triggerValue: null };
  }
}

function ruleToPresetKey(rule: EarnRule): PresetKey {
  switch (rule.triggerType) {
    case "spend_amount":
      return "spend";
    case "booking_completed":
      return "booking";
    case "birthday":
      return "birthday";
    case "first_booking":
      return "first_booking";
    case "referral_completed":
      return "referral";
    case "manual":
      return "manual";
    case "service_type": {
      const s = rule.appliesToServiceTypes?.[0];
      if (s === "grooming") return "service_grooming";
      if (s === "training") return "service_training";
      return "service_daycare";
    }
    default:
      return "booking";
  }
}

function rewardValueLabel(t: EarnRuleRewardType): string {
  switch (t) {
    case "points":
      return "Points";
    case "credit":
      return "Credit ($)";
    case "gift_card":
      return "Gift card ($)";
    case "discount_pct":
      return "Percent (%)";
    case "discount_fixed":
      return "Amount ($)";
    case "freebie":
      return "";
  }
}

function requiredNumber(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function EarnRulesWizardStep({
  value,
  onChange,
  facilityId,
}: {
  value: EarnRule[];
  onChange: (v: EarnRule[]) => void;
  facilityId: number;
}) {
  const counter = useRef(0);

  const updateRule = (index: number, next: EarnRule) => {
    onChange(value.map((r, i) => (i === index ? next : r)));
  };

  const removeRule = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addRule = () => {
    const newRule: EarnRule = {
      id: `earn-${Date.now()}-${counter.current++}`,
      facilityId,
      name: PRESET_LABEL.spend,
      triggerType: "spend_amount",
      triggerValue: 1,
      rewardType: "points",
      rewardValue: 1,
      appliesToServiceTypes: null,
      scheduleType: "always",
      enabled: true,
    };
    onChange([...value, newRule]);
  };

  return (
    <div className="space-y-4">
      <FutureChangesNotice />

      {value.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No earn rules yet. Add your first rule to define how customers earn.
        </p>
      )}

      {value.map((rule, index) => (
        <EarnRuleWizardCard
          key={rule.id}
          rule={rule}
          onChange={(next) => updateRule(index, next)}
          onRemove={() => removeRule(index)}
        />
      ))}

      <Button variant="outline" onClick={addRule} className="w-full">
        <Plus className="mr-2 size-4" /> Add earn rule
      </Button>
    </div>
  );
}

function EarnRuleWizardCard({
  rule,
  onChange,
  onRemove,
}: {
  rule: EarnRule;
  onChange: (next: EarnRule) => void;
  onRemove: () => void;
}) {
  const presetKey = ruleToPresetKey(rule);
  const isServicePreset = SERVICE_PRESETS.includes(presetKey);
  const isEvent = ["birthday", "first_booking", "referral", "manual"].includes(
    presetKey,
  );
  const isFreebie = rule.rewardType === "freebie";

  // Applies-to is editable for spend/booking, or for a freebie reward on an
  // event trigger (pick the free service). Locked (read-only) for the
  // service-specific triggers, hidden otherwise.
  const showEditableAppliesTo =
    presetKey === "spend" || presetKey === "booking" || (isEvent && isFreebie);

  const allServices =
    rule.appliesToServiceTypes === null ||
    rule.appliesToServiceTypes === undefined;
  const selectedServices = rule.appliesToServiceTypes ?? [];

  const toggleService = (service: string) => {
    const next = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    onChange({ ...rule, appliesToServiceTypes: next });
  };

  const schedule = rule.scheduleConfig ?? {};
  const days = schedule.daysOfWeek ?? [];
  const toggleDay = (day: number) => {
    const next = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort((a, b) => a - b);
    onChange({ ...rule, scheduleConfig: { ...schedule, daysOfWeek: next } });
  };

  return (
    <Card className="relative">
      <CardContent className="space-y-4 pt-6">
        {/* Top row: trigger → reward → value */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr_0.8fr]">
          <div className="space-y-1.5">
            <Label className="text-xs">When</Label>
            <Select
              value={presetKey}
              onValueChange={(v) => onChange(applyPreset(rule, v as PresetKey))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reward</Label>
            <Select
              value={rule.rewardType}
              onValueChange={(v: EarnRuleRewardType) =>
                onChange({ ...rule, rewardType: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REWARD_OPTIONS.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {isFreebie ? "Value" : rewardValueLabel(rule.rewardType)}
            </Label>
            {isFreebie ? (
              <div className="text-muted-foreground flex h-9 items-center text-sm">
                —
              </div>
            ) : (
              <Input
                type="number"
                value={rule.rewardValue}
                onChange={(e) =>
                  onChange({
                    ...rule,
                    rewardValue: requiredNumber(e.target.value),
                  })
                }
              />
            )}
          </div>
        </div>

        {/* Applies to */}
        {isServicePreset ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Applies to:</span>
            <Badge variant="secondary" className="capitalize">
              {rule.appliesToServiceTypes?.[0] ?? "service"}
            </Badge>
          </div>
        ) : showEditableAppliesTo ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {isFreebie ? "Free service" : "Applies to"}
              </Label>
              {!isFreebie && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    All services
                  </span>
                  <Switch
                    checked={allServices}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...rule,
                        appliesToServiceTypes: checked ? null : [],
                      })
                    }
                    aria-label="Applies to all services"
                  />
                </div>
              )}
            </div>
            {(isFreebie || !allServices) && (
              <div className="flex flex-wrap gap-2">
                {BOOKABLE_SERVICE_TYPES.map((service) => (
                  <Badge
                    key={service}
                    variant={
                      selectedServices.includes(service) ? "default" : "outline"
                    }
                    className="cursor-pointer capitalize"
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleService(service)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleService(service);
                      }
                    }}
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Schedule */}
        <div className="space-y-2">
          <Label className="text-xs">Schedule</Label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["always", "Always"],
                ["date_range", "Date range"],
                ["recurring_days", "Specific days"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={rule.scheduleType === key ? "default" : "outline"}
                onClick={() =>
                  onChange({
                    ...rule,
                    scheduleType: key,
                    scheduleConfig: key === "always" ? undefined : schedule,
                  })
                }
              >
                {label}
              </Button>
            ))}
          </div>

          {rule.scheduleType === "date_range" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                value={schedule.startDate}
                onValueChange={(next) =>
                  onChange({
                    ...rule,
                    scheduleConfig: {
                      ...schedule,
                      startDate: next || undefined,
                    },
                  })
                }
                placeholder="Start date"
              />
              <DatePicker
                value={schedule.endDate}
                min={schedule.startDate}
                onValueChange={(next) =>
                  onChange({
                    ...rule,
                    scheduleConfig: { ...schedule, endDate: next || undefined },
                  })
                }
                placeholder="End date"
              />
            </div>
          )}

          {rule.scheduleType === "recurring_days" && (
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <Badge
                  key={d.value}
                  variant={days.includes(d.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleDay(d.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleDay(d.value);
                    }
                  }}
                >
                  {d.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Plain-English summary + enable/remove */}
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <p
            className={cn(
              "flex items-start gap-1.5 text-sm",
              rule.enabled ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>{summarizeEarnRule(rule)}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) =>
                onChange({ ...rule, enabled: checked })
              }
              aria-label="Rule enabled"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove earn rule"
              onClick={onRemove}
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
