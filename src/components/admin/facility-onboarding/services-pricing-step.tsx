"use client";

import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form/form-field";

import { WizardStepFrame } from "./wizard-step-frame";
import { servicesPricingSchema } from "./wizard-schemas";
import { SERVICES } from "./wizard-config";
import { FieldErrorOnly } from "./wizard-fields";
import type { StepProps } from "./wizard-types";

export function ServicesPricingStep({
  draft,
  onNext,
  onBack,
  onCancel,
}: StepProps) {
  const form = useForm({
    defaultValues: { services: draft.services, taxRate: draft.taxRate },
    validators: { onSubmit: servicesPricingSchema },
    onSubmit: ({ value }) => onNext(value),
  });

  return (
    <WizardStepFrame
      stepIndex={2}
      form={form}
      onBack={onBack ? () => onBack(form.state.values) : undefined}
      onCancel={onCancel}
    >
      <div className="space-y-1">
        <Label>Services offered</Label>
        {/* No prices here, and that is the point. This step asked for a base
            price and an additional-animal fee per service, REQUIRED to get
            past it, and sent neither — the facility is created from its name,
            owner, locations and services. A facility prices its own work once
            it exists: rooms carry their nightly rates, daycare its rate cards,
            grooming its services. */}
        <p className="text-muted-foreground text-xs">
          Choose what this facility offers. They set their own prices once the
          facility is created.
        </p>
        <FieldErrorOnly form={form} name="services" />
      </div>

      <div className="space-y-2">
        {SERVICES.map((svc) => (
          <div key={svc.id} className="rounded-xl border p-3">
            <form.Field name={`services.${svc.id}.enabled`}>
              {(field: AnyFieldApi) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={!!field.state.value}
                    onCheckedChange={(c) => field.handleChange(c)}
                  />
                  {svc.label}
                </label>
              )}
            </form.Field>
          </div>
        ))}
      </div>

      <form.Field name="taxRate">
        {(field: AnyFieldApi) => (
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="taxRate">Tax rate (%)</Label>
            <Input
              id="taxRate"
              value={(field.state.value as string) ?? ""}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              inputMode="decimal"
              placeholder="14.975"
              aria-invalid={
                field.state.meta.errors.length > 0 ? true : undefined
              }
            />
            <p className="text-muted-foreground text-xs">
              Applied to taxable services per the facility&apos;s jurisdiction.
            </p>
            <FormFieldError field={field} />
          </div>
        )}
      </form.Field>
    </WizardStepFrame>
  );
}
