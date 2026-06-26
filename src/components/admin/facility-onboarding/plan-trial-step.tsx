"use client";

import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Check } from "lucide-react";

import { plans } from "@/data/plans";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField, FormFieldError } from "@/components/ui/form/form-field";
import { cn } from "@/lib/utils";

import { WizardStepFrame } from "./wizard-step-frame";
import { planTrialSchema } from "./wizard-schemas";
import type { BillingCycle, StepProps } from "./wizard-types";

const activePlans = plans.filter((p) => p.status === "active");

function priceFor(planId: string, cycle: BillingCycle): number {
  const plan = activePlans.find((p) => p.id === planId);
  if (!plan) return 0;
  const interval = cycle === "annual" ? "year" : "month";
  const tier = plan.pricing.find((x) => x.interval === interval);
  return (tier ?? plan.pricing[0])?.basePrice ?? 0;
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PlanTrialStep({ draft, onNext, onBack, onCancel }: StepProps) {
  const form = useForm({
    defaultValues: {
      tierId: draft.tierId,
      billingCycle: draft.billingCycle,
      trialEnabled: draft.trialEnabled,
      trialEndDate: draft.trialEndDate,
      promoCode: draft.promoCode,
    },
    validators: { onSubmit: planTrialSchema },
    onSubmit: ({ value }) => onNext(value),
  });

  return (
    <WizardStepFrame
      stepIndex={1}
      form={form}
      onBack={onBack ? () => onBack(form.state.values) : undefined}
      onCancel={onCancel}
    >
      {/* Billing cycle */}
      <div className="flex items-center justify-between gap-3">
        <Label>Billing cycle</Label>
        <form.Field name="billingCycle">
          {(field: AnyFieldApi) => (
            <div className="bg-muted inline-flex rounded-lg p-0.5">
              {(["monthly", "annual"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => field.handleChange(c)}
                  data-on={field.state.value === c ? "true" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    "text-muted-foreground",
                    "data-[on=true]:bg-background data-[on=true]:text-foreground data-[on=true]:shadow-sm",
                  )}
                >
                  {c === "monthly" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
          )}
        </form.Field>
      </div>

      {/* Tier cards */}
      <form.Field name="tierId">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <form.Subscribe selector={(s) => s.values.billingCycle}>
              {(cycle) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activePlans.map((plan) => {
                    const selected = field.state.value === plan.id;
                    return (
                      <button
                        type="button"
                        key={plan.id}
                        onClick={() => field.handleChange(plan.id)}
                        data-on={selected ? "true" : undefined}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all",
                          "hover:border-violet-300 hover:shadow-sm",
                          "data-[on=true]:border-violet-500 data-[on=true]:ring-1 data-[on=true]:ring-violet-500",
                        )}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="font-semibold">{plan.name}</span>
                          <span className="text-sm font-semibold tabular-nums">
                            ${priceFor(plan.id, cycle as BillingCycle)}
                            <span className="text-muted-foreground font-normal">
                              /{cycle === "annual" ? "yr" : "mo"}
                            </span>
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {plan.description}
                        </p>
                        <ul className="mt-3 space-y-1">
                          {plan.features.slice(0, 4).map((f) => (
                            <li
                              key={f}
                              className="text-foreground/80 flex items-center gap-1.5 text-xs"
                            >
                              <Check className="size-3 shrink-0 text-emerald-500" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              )}
            </form.Subscribe>
            <FormFieldError field={field} />
          </div>
        )}
      </form.Field>

      {/* Trial */}
      <div className="rounded-xl border p-4">
        <form.Field name="trialEnabled">
          {(field: AnyFieldApi) => (
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Start with a free trial</Label>
                <p className="text-muted-foreground text-xs">
                  Billing begins when the trial ends.
                </p>
              </div>
              <Switch
                checked={!!field.state.value}
                onCheckedChange={(c) => field.handleChange(c)}
              />
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.trialEnabled}>
          {(trialEnabled) =>
            trialEnabled ? (
              <form.Field name="trialEndDate">
                {(field: AnyFieldApi) => (
                  <div className="mt-4 space-y-2 sm:max-w-xs">
                    <Label>Trial end date</Label>
                    <DatePicker
                      value={(field.state.value as string) || ""}
                      onValueChange={(v) => field.handleChange(v)}
                      min={todayISO()}
                      showManualInput
                    />
                    <FormFieldError field={field} />
                  </div>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>
      </div>

      <FormField
        form={form}
        name="promoCode"
        label="Promo code (optional)"
        placeholder="WELCOME10"
      />
    </WizardStepFrame>
  );
}
