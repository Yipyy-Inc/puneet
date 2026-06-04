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
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { Plus, Trash2, Zap } from "lucide-react";
import type {
  EarnRule,
  EarnRuleTriggerType,
  EarnRuleRewardType,
  EarnRuleScheduleType,
} from "@/types/loyalty";
import { BOOKABLE_SERVICE_TYPES } from "@/data/facility-loyalty-config";

const TRIGGER_LABELS: Record<EarnRuleTriggerType, string> = {
  booking_completed: "Booking Completed",
  service_type: "Specific Service Type",
  spend_amount: "Spend Amount",
  visit_count: "Visit Count",
  birthday: "Birthday",
  first_booking: "First Booking",
  referral_completed: "Referral Completed",
  review_submitted: "Review Submitted",
  app_download: "App Download",
  manual: "Manual",
};

const REWARD_LABELS: Record<EarnRuleRewardType, string> = {
  points: "Points",
  credit: "Account Credit ($)",
  gift_card: "Gift Card ($)",
  freebie: "Freebie",
  discount_pct: "Discount (%)",
  discount_fixed: "Discount ($)",
};

const SCHEDULE_LABELS: Record<EarnRuleScheduleType, string> = {
  always: "Always Active",
  date_range: "Date Range",
  recurring_days: "Recurring Days",
};

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

/** Triggers that carry a numeric threshold. */
function triggerValueLabel(t: EarnRuleTriggerType): string | null {
  switch (t) {
    case "spend_amount":
      return "Per dollar amount ($)";
    case "visit_count":
      return "Visit number";
    default:
      return null;
  }
}

function rewardValueLabel(t: EarnRuleRewardType): string {
  switch (t) {
    case "points":
      return "Points awarded";
    case "credit":
      return "Credit amount ($)";
    case "gift_card":
      return "Gift card value ($)";
    case "freebie":
      return "Quantity";
    case "discount_pct":
      return "Discount (%)";
    case "discount_fixed":
      return "Discount amount ($)";
  }
}

function requiredNumber(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function EarnRuleListEditor({
  value,
  onChange,
  facilityId,
}: {
  value: EarnRule[];
  onChange: (v: EarnRule[]) => void;
  facilityId: number;
}) {
  const counter = useRef(0);

  const updateRule = (index: number, patch: Partial<EarnRule>) => {
    onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRule = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addRule = () => {
    const newRule: EarnRule = {
      id: `earn-${Date.now()}-${counter.current++}`,
      facilityId,
      name: "New earn rule",
      triggerType: "booking_completed",
      triggerValue: null,
      rewardType: "points",
      rewardValue: 10,
      appliesToServiceTypes: null,
      scheduleType: "always",
      enabled: true,
    };
    onChange([...value, newRule]);
  };

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No earn rules yet. Add a rule to start rewarding customers.
        </p>
      )}

      {value.map((rule, index) => (
        <EarnRuleCard
          key={rule.id}
          rule={rule}
          onPatch={(patch) => updateRule(index, patch)}
          onRemove={() => removeRule(index)}
        />
      ))}

      <Button variant="outline" onClick={addRule} className="w-full">
        <Plus className="mr-2 size-4" /> Add Earn Rule
      </Button>
    </div>
  );
}

function EarnRuleCard({
  rule,
  onPatch,
  onRemove,
}: {
  rule: EarnRule;
  onPatch: (patch: Partial<EarnRule>) => void;
  onRemove: () => void;
}) {
  const valueLabel = triggerValueLabel(rule.triggerType);
  const allServices = rule.appliesToServiceTypes === null;
  const selectedServices = rule.appliesToServiceTypes ?? [];
  const schedule = rule.scheduleConfig ?? {};
  const days = schedule.daysOfWeek ?? [];

  const changeTrigger = (triggerType: EarnRuleTriggerType) => {
    // Reset triggerValue to a sensible default for the new trigger.
    const needsValue = triggerValueLabel(triggerType) !== null;
    onPatch({
      triggerType,
      triggerValue: needsValue ? (rule.triggerValue ?? 1) : null,
    });
  };

  const toggleService = (service: string) => {
    const next = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];
    onPatch({ appliesToServiceTypes: next });
  };

  const toggleDay = (day: number) => {
    const next = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort((a, b) => a - b);
    onPatch({ scheduleConfig: { ...schedule, daysOfWeek: next } });
  };

  return (
    <Card className="relative">
      <CardContent className="space-y-4 pt-6">
        {/* Header: name + enabled + remove */}
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={rule.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="e.g., Double points weekends"
            />
          </div>
          <div className="flex flex-col items-center gap-1 pt-1">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) => onPatch({ enabled: checked })}
              aria-label="Rule enabled"
            />
            <span className="text-muted-foreground text-[10px] uppercase">
              {rule.enabled ? "On" : "Off"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove earn rule"
            onClick={onRemove}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>

        {/* Trigger */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Trigger</Label>
            <Select value={rule.triggerType} onValueChange={changeTrigger}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {valueLabel && (
            <div className="space-y-2">
              <Label>{valueLabel}</Label>
              <Input
                type="number"
                value={rule.triggerValue ?? ""}
                onChange={(e) =>
                  onPatch({ triggerValue: requiredNumber(e.target.value) })
                }
              />
            </div>
          )}
        </div>

        {/* Reward */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Reward Type</Label>
            <Select
              value={rule.rewardType}
              onValueChange={(v: EarnRuleRewardType) =>
                onPatch({ rewardType: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REWARD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{rewardValueLabel(rule.rewardType)}</Label>
            <Input
              type="number"
              value={rule.rewardValue}
              onChange={(e) =>
                onPatch({ rewardValue: requiredNumber(e.target.value) })
              }
            />
          </div>
        </div>

        {/* Applies to */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Applies To</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                All services
              </span>
              <Switch
                checked={allServices}
                onCheckedChange={(checked) =>
                  onPatch({
                    appliesToServiceTypes: checked ? null : [],
                  })
                }
                aria-label="Applies to all services"
              />
            </div>
          </div>
          {!allServices && (
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

        {/* Schedule */}
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Zap className="size-3.5" /> Schedule
            </Label>
            <Select
              value={rule.scheduleType}
              onValueChange={(v: EarnRuleScheduleType) =>
                onPatch({
                  scheduleType: v,
                  scheduleConfig: v === "always" ? undefined : schedule,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCHEDULE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rule.scheduleType === "date_range" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  value={schedule.startDate}
                  onValueChange={(next) =>
                    onPatch({
                      scheduleConfig: {
                        ...schedule,
                        startDate: next || undefined,
                      },
                    })
                  }
                  placeholder="Start date"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  value={schedule.endDate}
                  min={schedule.startDate}
                  onValueChange={(next) =>
                    onPatch({
                      scheduleConfig: {
                        ...schedule,
                        endDate: next || undefined,
                      },
                    })
                  }
                  placeholder="End date"
                />
              </div>
            </div>
          )}

          {rule.scheduleType === "recurring_days" && (
            <div className="space-y-3">
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time (optional)</Label>
                  <TimePickerLux
                    value={schedule.startTime}
                    onValueChange={(next) =>
                      onPatch({
                        scheduleConfig: { ...schedule, startTime: next },
                      })
                    }
                    placeholder="Any time"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time (optional)</Label>
                  <TimePickerLux
                    value={schedule.endTime}
                    onValueChange={(next) =>
                      onPatch({
                        scheduleConfig: { ...schedule, endTime: next },
                      })
                    }
                    placeholder="Any time"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
