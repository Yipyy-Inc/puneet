"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Percent,
  Sparkles,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";
import {
  defaultDepositRules,
  defaultDepositRefundPolicy,
  ensureAllServiceRules,
  loadDepositRules,
  saveDepositRules,
  loadDepositRefundPolicy,
  saveDepositRefundPolicy,
} from "@/data/deposit-rules";
import type {
  DepositAmountType,
  DepositRule,
  DepositRuleSet,
  DepositRefundPolicy,
  DepositRefundType,
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
  const [refundPolicy, setRefundPolicy] = useState<DepositRefundPolicy>(
    () => defaultDepositRefundPolicy,
  );
  const [hasMounted, setHasMounted] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Free-cancellation window from Business Settings — the deposit refund policy
  // references this so the two don't contradict each other.
  const freeCancellationHours =
    facilityConfig.bookingRules.cancellationPolicies.freeCancellationHours;

  useEffect(() => {
    setRules(loadDepositRules());
    setRefundPolicy(loadDepositRefundPolicy());
    setHasMounted(true);
  }, []);

  const updateRefundPolicy = (patch: Partial<DepositRefundPolicy>) => {
    setRefundPolicy((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

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

  // Live, in-progress edit (e.g. typing in the amount field) — updates local
  // state only. It does NOT persist; the row commits on focus-out via
  // commitRule, so the global Save button stays reserved for the refund policy.
  const updateRule = (id: string, patch: Partial<DepositRule>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        next.label = formatRuleLabel(next);
        return next;
      }),
    );
  };

  // Persist a single rule immediately (focus-out / toggle / dropdown change),
  // computing the next set from current state so the just-typed value is saved.
  const commitRule = (
    id: string,
    patch: Partial<DepositRule>,
    message: string,
  ) => {
    const next = rules.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      updated.label = formatRuleLabel(updated);
      return updated;
    });
    setRules(next);
    saveDepositRules(next);
    toast.success(message);
  };

  const handleSave = () => {
    saveDepositRules(rules);
    saveDepositRefundPolicy(refundPolicy);
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
              onCommit={(patch, message) => commitRule(rule.id, patch, message)}
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
              onCommit={(patch, message) =>
                commitRule(thresholdRule.id, patch, message)
              }
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-4 text-sky-600" />
            Deposit Refund Policy
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            Your{" "}
            <span className="text-foreground font-medium">
              cancellation policy
            </span>{" "}
            (Business Settings) allows free cancellation up to{" "}
            <span className="text-foreground font-medium">
              {freeCancellationHours} hours
            </span>{" "}
            before a booking.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">
            If a booking is cancelled, the deposit is:
          </p>
          <RadioGroup
            value={refundPolicy.type}
            onValueChange={(v) =>
              updateRefundPolicy({ type: v as DepositRefundType })
            }
            className="space-y-2"
          >
            <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors">
              <RadioGroupItem value="full_before_window" id="refund-full" />
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <span className="text-sm">Full refund if cancelled before</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={refundPolicy.refundBeforeHours}
                  disabled={refundPolicy.type !== "full_before_window"}
                  onChange={(e) =>
                    updateRefundPolicy({
                      refundBeforeHours: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-8 w-20 text-right font-[tabular-nums]"
                />
                <span className="text-sm">hours</span>
              </div>
            </label>
            <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors">
              <RadioGroupItem value="non_refundable" id="refund-none" />
              <span className="text-sm">Non-refundable</span>
            </label>
            <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors">
              <RadioGroupItem value="credit" id="refund-credit" />
              <span className="text-sm">
                Applied as credit toward a future booking
              </span>
            </label>
          </RadioGroup>

          {refundPolicy.type === "full_before_window" &&
            refundPolicy.refundBeforeHours !== freeCancellationHours && (
              <div className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span className="flex-1">
                  This {refundPolicy.refundBeforeHours}h refund window differs
                  from your {freeCancellationHours}h free-cancellation policy —
                  customers may get conflicting terms.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 shrink-0 border-amber-300 bg-white px-2 text-[11px] text-amber-800"
                  onClick={() =>
                    updateRefundPolicy({
                      refundBeforeHours: freeCancellationHours,
                    })
                  }
                >
                  Match to {freeCancellationHours}h
                </Button>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceRuleRow({
  rule,
  onChange,
  onCommit,
}: {
  rule: DepositRule;
  onChange: (patch: Partial<DepositRule>) => void;
  onCommit: (patch: Partial<DepositRule>, message: string) => void;
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
        onCheckedChange={(enabled) =>
          onCommit(
            { enabled },
            `${serviceLabel} deposit ${enabled ? "enabled" : "disabled"}`,
          )
        }
      />
      <div className="min-w-[120px] flex-1">
        <p className="text-sm font-medium">{serviceLabel}</p>
        <p className="text-muted-foreground text-[11px]">
          {rule.enabled ? rule.label : "Disabled — no deposit collected"}
        </p>
      </div>
      <AmountTypeSelect
        value={rule.amountType}
        disabled={!rule.enabled}
        onChange={(amountType) =>
          onCommit({ amountType }, `${serviceLabel} deposit type updated`)
        }
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
          onChange={(e) =>
            onChange({ amount: parseFloat(e.target.value) || 0 })
          }
          onBlur={() => onCommit({}, `${serviceLabel} deposit updated`)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-8 w-20 text-right font-[tabular-nums]"
        />
      </div>
    </div>
  );
}

function ThresholdRuleRow({
  rule,
  onChange,
  onCommit,
}: {
  rule: DepositRule;
  onChange: (patch: Partial<DepositRule>) => void;
  onCommit: (patch: Partial<DepositRule>, message: string) => void;
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
          onCheckedChange={(enabled) =>
            onCommit(
              { enabled },
              `High-value booking deposit ${enabled ? "enabled" : "disabled"}`,
            )
          }
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
              onBlur={() => onCommit({}, "Booking value threshold updated")}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-8 font-[tabular-nums]"
            />
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Deposit type
          </Label>
          <div className="mt-1">
            <AmountTypeSelect
              value={rule.amountType}
              disabled={!rule.enabled}
              onChange={(amountType) =>
                onCommit({ amountType }, "Deposit type updated")
              }
              className="w-full"
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
              onBlur={() => onCommit({}, "Booking value threshold updated")}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-8 font-[tabular-nums]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AmountTypeSelect({
  value,
  disabled,
  onChange,
  className,
}: {
  value: DepositAmountType;
  disabled?: boolean;
  onChange: (value: DepositAmountType) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => onChange(v as DepositAmountType)}
    >
      <SelectTrigger className={cn("h-8 w-[120px] text-xs", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="percentage">% of total</SelectItem>
        <SelectItem value="fixed">Flat $</SelectItem>
      </SelectContent>
    </Select>
  );
}
