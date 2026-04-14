"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  MembershipBillingCycle,
  WeeklyBillingDay,
} from "@/data/services-pricing";
import type { PlanBuilderData } from "../use-plan-builder";
import { Calendar, Clock, Receipt, ShieldAlert } from "lucide-react";

interface Props {
  data: PlanBuilderData;
  update: (patch: Partial<PlanBuilderData>) => void;
}

const cycles: { value: MembershipBillingCycle; label: string; hint: string }[] =
  [
    { value: "daily", label: "Daily", hint: "Every day at a fixed time" },
    {
      value: "weekly",
      label: "Weekly",
      hint: "Billed on a specific weekday",
    },
    { value: "monthly", label: "Monthly", hint: "Most common cadence" },
    { value: "quarterly", label: "Quarterly", hint: "Every 3 months" },
    { value: "annually", label: "Annually", hint: "Once per year" },
    {
      value: "yearly",
      label: "Yearly (alias)",
      hint: "Same as annually, different label",
    },
  ];

const days: { value: WeeklyBillingDay; label: string }[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

export function StepPricing({ data, update }: Props) {
  const isWeekly = data.billingCycle === "weekly";

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border bg-linear-to-br from-emerald-50/40 to-background p-4 dark:from-emerald-950/20">
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-emerald-700 dark:text-emerald-400" />
          <h4 className="text-sm font-semibold">Subscription price</h4>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <PriceField
            label="Monthly price"
            value={data.monthlyPrice}
            onChange={(v) => update({ monthlyPrice: v })}
          />
          <PriceField
            label="Quarterly price"
            value={data.quarterlyPrice}
            onChange={(v) => update({ quarterlyPrice: v })}
          />
          <PriceField
            label="Annual price"
            value={data.annualPrice}
            onChange={(v) => update({ annualPrice: v })}
          />
        </div>
        <PriceField
          label="Tax amount (per billing cycle)"
          value={data.taxAmount}
          onChange={(v) => update({ taxAmount: v })}
          hint="Flat amount applied on top of the subscription price."
        />
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <Calendar className="size-4" />
          <h4 className="text-sm font-semibold">Billing cycle</h4>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cycle</Label>
            <Select
              value={data.billingCycle}
              onValueChange={(v) =>
                update({ billingCycle: v as MembershipBillingCycle })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex flex-col">
                      <span>{c.label}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {c.hint}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isWeekly && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Billing day</Label>
                <Select
                  value={data.weeklyBillingDay}
                  onValueChange={(v) =>
                    update({ weeklyBillingDay: v as WeeklyBillingDay })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Billing time
                </Label>
                <Input
                  type="time"
                  value={data.weeklyBillingTime}
                  onChange={(e) =>
                    update({ weeklyBillingTime: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-700 dark:text-amber-400" />
          <h4 className="text-sm font-semibold">Payment & grace period</h4>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Grace period (days)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={data.gracePeriodDays}
              onChange={(e) =>
                update({ gracePeriodDays: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-muted-foreground text-xs">
              Days to retry failed payments before the subscription expires.
              Standard is 7 days.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PriceField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          $
        </span>
        <Input
          type="number"
          min={0}
          step="0.01"
          className="pl-7"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}
