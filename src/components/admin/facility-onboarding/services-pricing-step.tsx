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

function MoneyInput({
  field,
  placeholder,
}: {
  field: AnyFieldApi;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
        $
      </span>
      <Input
        value={(field.state.value as string) ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        inputMode="decimal"
        placeholder={placeholder}
        className="pl-7"
        aria-invalid={field.state.meta.errors.length > 0 ? true : undefined}
      />
    </div>
  );
}

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
        <p className="text-muted-foreground text-xs">
          Enable each service this facility offers and set its pricing.
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

            <form.Subscribe
              selector={(s) =>
                (s.values.services as Record<string, { enabled: boolean }>)?.[
                  svc.id
                ]?.enabled
              }
            >
              {(enabled) =>
                enabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <form.Field name={`services.${svc.id}.basePrice`}>
                      {(field: AnyFieldApi) => (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Base price</Label>
                          <MoneyInput field={field} placeholder="0.00" />
                          <FormFieldError field={field} />
                        </div>
                      )}
                    </form.Field>
                    <form.Field name={`services.${svc.id}.additionalAnimalFee`}>
                      {(field: AnyFieldApi) => (
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Additional animal fee
                          </Label>
                          <MoneyInput field={field} placeholder="0.00" />
                          <FormFieldError field={field} />
                        </div>
                      )}
                    </form.Field>
                  </div>
                ) : null
              }
            </form.Subscribe>
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
