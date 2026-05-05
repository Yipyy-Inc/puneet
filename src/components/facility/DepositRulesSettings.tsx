"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Percent, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  defaultDepositRules,
  ensureAllServiceRules,
  loadDepositRules,
  saveDepositRules,
} from "@/data/deposit-rules";
import type {
  DepositAmountType,
  DepositRule,
  DepositRuleSet,
} from "@/types/deposit-rules";
import { SERVICE_TYPES_FOR_DEPOSITS } from "@/types/deposit-rules";

const SERVICE_LABELS: Record<string, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  vet: "Vet",
  retail: "Retail",
};

function formatRuleLabel(rule: DepositRule): string {
  if (rule.scope === "service") {
    const service = SERVICE_LABELS[rule.serviceType ?? ""] ?? "Service";
    if (!rule.enabled || rule.amount <= 0) return `${service} — no deposit`;
    return rule.amountType === "percentage"
      ? `${service} — ${rule.amount}% deposit`
      : `${service} — $${rule.amount.toFixed(2)} deposit`;
  }
  if (!rule.enabled || rule.amount <= 0) {
    return "Booking value threshold — disabled";
  }
  const amount =
    rule.amountType === "percentage"
      ? `${rule.amount}%`
      : `$${rule.amount.toFixed(2)}`;
  return `Bookings over $${(rule.minBookingValue ?? 0).toFixed(0)} — ${amount} deposit`;
}

export function DepositRulesSettings() {
  const [rules, setRules] = useState<DepositRuleSet>(() =>
    ensureAllServiceRules(defaultDepositRules),
  );
  const [hasMounted, setHasMounted] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRules(loadDepositRules());
    setHasMounted(true);
  }, []);

  const serviceRules = useMemo(
    () =>
      SERVICE_TYPES_FOR_DEPOSITS.map(
        (s) =>
          rules.find(
            (r) => r.scope === "service" && r.serviceType === s,
          ) as DepositRule,
      ),
    [rules],
  );

  const thresholdRule = useMemo(
    () => rules.find((r) => r.scope === "booking_value"),
    [rules],
  );

  const updateRule = (id: string, patch: Partial<DepositRule>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        next.label = formatRuleLabel(next);
        return next;
      }),
    );
    setDirty(true);
  };

  const handleSave = () => {
    saveDepositRules(rules);
    setDirty(false);
    toast.success("Deposit rules saved");
  };

  if (!hasMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Deposit Rules</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Set automatic deposit requirements per service type or by booking
            value. When a matching booking is created, staff are prompted to
            collect the deposit before confirming.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty} className="shrink-0">
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-amber-500" />
            Per-service rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {serviceRules.map((rule) => (
            <ServiceRuleRow
              key={rule.id}
              rule={rule}
              onChange={(patch) => updateRule(rule.id, patch)}
            />
          ))}
        </CardContent>
      </Card>

      {thresholdRule && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="size-4 text-emerald-600" />
              Booking value threshold
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Applies when no per-service rule matches. Useful for catching
              high-value one-off bookings.
            </p>
          </CardHeader>
          <CardContent>
            <ThresholdRuleRow
              rule={thresholdRule}
              onChange={(patch) => updateRule(thresholdRule.id, patch)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ServiceRuleRow({
  rule,
  onChange,
}: {
  rule: DepositRule;
  onChange: (patch: Partial<DepositRule>) => void;
}) {
  const service = rule.serviceType ?? "";
  const serviceLabel = SERVICE_LABELS[service] ?? service;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
        rule.enabled ? "bg-card" : "bg-muted/30",
      )}
    >
      <Switch
        checked={rule.enabled}
        onCheckedChange={(enabled) => onChange({ enabled })}
      />
      <div className="min-w-[120px] flex-1">
        <p className="text-sm font-medium">{serviceLabel}</p>
        <p className="text-muted-foreground text-[11px]">
          {rule.enabled ? rule.label : "Disabled — no deposit collected"}
        </p>
      </div>
      <AmountTypeToggle
        value={rule.amountType}
        disabled={!rule.enabled}
        onChange={(amountType) => onChange({ amountType })}
      />
      <div className="flex items-center gap-1.5">
        {rule.amountType === "percentage" ? (
          <Percent className="text-muted-foreground size-3.5" />
        ) : (
          <DollarSign className="text-muted-foreground size-3.5" />
        )}
        <Input
          type="number"
          min={0}
          step={rule.amountType === "percentage" ? 1 : 0.01}
          value={rule.amount}
          disabled={!rule.enabled}
          onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
          className="h-8 w-20 text-right font-[tabular-nums]"
        />
      </div>
    </div>
  );
}

function ThresholdRuleRow({
  rule,
  onChange,
}: {
  rule: DepositRule;
  onChange: (patch: Partial<DepositRule>) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-4 transition-colors",
        rule.enabled ? "bg-card" : "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-3">
        <Switch
          checked={rule.enabled}
          onCheckedChange={(enabled) => onChange({ enabled })}
        />
        <div className="flex-1">
          <p className="text-sm font-medium">High-value booking deposit</p>
          <p className="text-muted-foreground text-[11px]">
            {rule.enabled ? rule.label : "Disabled"}
          </p>
        </div>
        {rule.enabled && (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800"
          >
            Active
          </Badge>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Triggered when total ≥
          </Label>
          <div className="mt-1 flex items-center gap-1.5">
            <DollarSign className="text-muted-foreground size-3.5" />
            <Input
              type="number"
              min={0}
              step={1}
              value={rule.minBookingValue ?? 0}
              disabled={!rule.enabled}
              onChange={(e) =>
                onChange({ minBookingValue: parseFloat(e.target.value) || 0 })
              }
              className="h-8 font-[tabular-nums]"
            />
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Deposit type
          </Label>
          <div className="mt-1">
            <AmountTypeToggle
              value={rule.amountType}
              disabled={!rule.enabled}
              onChange={(amountType) => onChange({ amountType })}
            />
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Deposit amount
          </Label>
          <div className="mt-1 flex items-center gap-1.5">
            {rule.amountType === "percentage" ? (
              <Percent className="text-muted-foreground size-3.5" />
            ) : (
              <DollarSign className="text-muted-foreground size-3.5" />
            )}
            <Input
              type="number"
              min={0}
              step={rule.amountType === "percentage" ? 1 : 0.01}
              value={rule.amount}
              disabled={!rule.enabled}
              onChange={(e) =>
                onChange({ amount: parseFloat(e.target.value) || 0 })
              }
              className="h-8 font-[tabular-nums]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AmountTypeToggle({
  value,
  disabled,
  onChange,
}: {
  value: DepositAmountType;
  disabled?: boolean;
  onChange: (value: DepositAmountType) => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-md border text-xs",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("percentage")}
        className={cn(
          "px-2.5 py-1 font-medium transition-colors",
          value === "percentage"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        % of total
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("fixed")}
        className={cn(
          "border-l px-2.5 py-1 font-medium transition-colors",
          value === "fixed"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        Flat $
      </button>
    </div>
  );
}
