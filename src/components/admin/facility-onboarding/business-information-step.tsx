"use client";

import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Check } from "lucide-react";

import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form/form-field";
import { FormSelect } from "@/components/ui/form/form-select";
import { FormFieldError } from "@/components/ui/form/form-field";
import { cn } from "@/lib/utils";

import { WizardStepFrame } from "./wizard-step-frame";
import { businessInfoSchema } from "./wizard-schemas";
import {
  BUSINESS_TYPES,
  COUNTRIES,
  REFERRAL_SOURCES,
  TIME_ZONES,
} from "./wizard-config";
import type { StepProps } from "./wizard-types";

export function BusinessInformationStep({
  draft,
  onNext,
  onBack,
  onCancel,
}: StepProps) {
  const form = useForm({
    defaultValues: {
      legalName: draft.legalName,
      displayName: draft.displayName,
      address: draft.address,
      city: draft.city,
      province: draft.province,
      postalCode: draft.postalCode,
      country: draft.country,
      timeZone: draft.timeZone,
      phone: draft.phone,
      website: draft.website,
      businessTypes: draft.businessTypes,
      referralSource: draft.referralSource,
    },
    validators: { onSubmit: businessInfoSchema },
    onSubmit: ({ value }) => onNext(value),
  });

  return (
    <WizardStepFrame
      stepIndex={0}
      form={form}
      onBack={onBack ? () => onBack(form.state.values) : undefined}
      onCancel={onCancel}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          form={form}
          name="legalName"
          label="Facility Legal Name"
          placeholder="Doggieville MTL Inc."
        />
        <FormField
          form={form}
          name="displayName"
          label="Display Name"
          placeholder="Doggieville"
        />
      </div>

      <FormField
        form={form}
        name="address"
        label="Address"
        placeholder="Start typing an address…"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField
          form={form}
          name="city"
          label="City"
          placeholder="Montréal"
        />
        <FormField
          form={form}
          name="province"
          label="Province / State"
          placeholder="QC"
        />
        <FormField
          form={form}
          name="postalCode"
          label="Postal Code"
          placeholder="H2T 1A1"
        />
        <FormSelect
          form={form}
          name="country"
          label="Country"
          placeholder="Select"
          options={COUNTRIES}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          form={form}
          name="timeZone"
          label="Time Zone"
          placeholder="Select a time zone"
          options={TIME_ZONES.map((tz) => ({ value: tz, label: tz }))}
        />
        <FormField
          form={form}
          name="phone"
          label="Phone"
          placeholder="(514) 555-0199"
        />
      </div>

      <FormField
        form={form}
        name="website"
        label="Website"
        placeholder="https://doggieville.com"
      />

      <form.Field name="businessTypes">
        {(field: AnyFieldApi) => {
          const selected = (field.state.value as string[]) ?? [];
          const toggle = (id: string) =>
            field.handleChange(
              selected.includes(id)
                ? selected.filter((s) => s !== id)
                : [...selected, id],
            );
          return (
            <div className="space-y-2">
              <Label>Business Type</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BUSINESS_TYPES.map((bt) => {
                  const on = selected.includes(bt.id);
                  return (
                    <button
                      type="button"
                      key={bt.id}
                      onClick={() => toggle(bt.id)}
                      data-on={on ? "true" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        "hover:bg-muted/50",
                        "data-[on=true]:border-violet-500 data-[on=true]:bg-violet-50 data-[on=true]:dark:bg-violet-950/30",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          on
                            ? "border-violet-500 bg-violet-500 text-white"
                            : "border-input",
                        )}
                      >
                        {on ? <Check className="size-3" /> : null}
                      </span>
                      {bt.label}
                    </button>
                  );
                })}
              </div>
              <FormFieldError field={field} />
            </div>
          );
        }}
      </form.Field>

      <FormSelect
        form={form}
        name="referralSource"
        label="How did they hear about Yipyy?"
        placeholder="Select an option"
        options={REFERRAL_SOURCES.map((s) => ({ value: s, label: s }))}
      />
    </WizardStepFrame>
  );
}
