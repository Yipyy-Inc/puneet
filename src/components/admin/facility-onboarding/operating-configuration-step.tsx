"use client";

import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { FormFieldError } from "@/components/ui/form/form-field";

import { WizardStepFrame } from "./wizard-step-frame";
import { operatingSchema } from "./wizard-schemas";
import { WEEKDAYS } from "./wizard-config";
import { FieldErrorOnly } from "./wizard-fields";
import type { StepProps } from "./wizard-types";

function TimeField({ field }: { field: AnyFieldApi }) {
  return (
    <TimePickerLux
      value={(field.state.value as string) || ""}
      onValueChange={(v) => field.handleChange(v)}
      stepMinutes={15}
    />
  );
}

export function OperatingConfigurationStep({
  draft,
  onNext,
  onBack,
  onCancel,
}: StepProps) {
  const form = useForm({
    defaultValues: {
      schedule: draft.schedule,
      checkInTime: draft.checkInTime,
      checkOutTime: draft.checkOutTime,
      bookingCutoff: draft.bookingCutoff,
      depositEnabled: draft.depositEnabled,
      depositPercent: draft.depositPercent,
    },
    validators: { onSubmit: operatingSchema },
    onSubmit: ({ value }) => onNext(value),
  });

  return (
    <WizardStepFrame
      stepIndex={3}
      form={form}
      onBack={onBack ? () => onBack(form.state.values) : undefined}
      onCancel={onCancel}
    >
      {/* Weekly schedule */}
      <div className="space-y-1">
        <Label>Operating hours</Label>
        <FieldErrorOnly form={form} name="schedule" />
      </div>
      <div className="space-y-1.5">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2"
          >
            <form.Field name={`schedule.${day}.open`}>
              {(field: AnyFieldApi) => (
                <div className="flex w-32 items-center gap-2">
                  <Switch
                    checked={!!field.state.value}
                    onCheckedChange={(c) => field.handleChange(c)}
                  />
                  <span className="text-sm font-medium">{day}</span>
                </div>
              )}
            </form.Field>
            <form.Subscribe
              selector={(s) =>
                (s.values.schedule as Record<string, { open: boolean }>)?.[day]
                  ?.open
              }
            >
              {(open) =>
                open ? (
                  <div className="flex flex-1 items-center gap-2">
                    <div className="w-32">
                      <form.Field name={`schedule.${day}.openTime`}>
                        {(f: AnyFieldApi) => <TimeField field={f} />}
                      </form.Field>
                    </div>
                    <span className="text-muted-foreground text-xs">to</span>
                    <div className="w-32">
                      <form.Field name={`schedule.${day}.closeTime`}>
                        {(f: AnyFieldApi) => (
                          <div className="space-y-1">
                            <TimeField field={f} />
                            <FormFieldError field={f} />
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Closed</span>
                )
              }
            </form.Subscribe>
          </div>
        ))}
      </div>

      {/* Service times */}
      <div className="grid gap-4 sm:grid-cols-3">
        <form.Field name="checkInTime">
          {(f: AnyFieldApi) => (
            <div className="space-y-1.5">
              <Label>Check-in time</Label>
              <TimeField field={f} />
              <FormFieldError field={f} />
            </div>
          )}
        </form.Field>
        <form.Field name="checkOutTime">
          {(f: AnyFieldApi) => (
            <div className="space-y-1.5">
              <Label>Check-out time</Label>
              <TimeField field={f} />
              <FormFieldError field={f} />
            </div>
          )}
        </form.Field>
        <form.Field name="bookingCutoff">
          {(f: AnyFieldApi) => (
            <div className="space-y-1.5">
              <Label>Booking cut-off</Label>
              <TimeField field={f} />
              <FormFieldError field={f} />
            </div>
          )}
        </form.Field>
      </div>

      {/* Deposit */}
      <div className="rounded-xl border p-4">
        <form.Field name="depositEnabled">
          {(field: AnyFieldApi) => (
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Require a deposit</Label>
                <p className="text-muted-foreground text-xs">
                  Collected at booking time.
                </p>
              </div>
              <Switch
                checked={!!field.state.value}
                onCheckedChange={(c) => field.handleChange(c)}
              />
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.values.depositEnabled}>
          {(on) =>
            on ? (
              <form.Field name="depositPercent">
                {(field: AnyFieldApi) => (
                  <div className="mt-4 space-y-1.5 sm:max-w-xs">
                    <Label htmlFor="depositPercent">Deposit percentage</Label>
                    <div className="relative">
                      <Input
                        id="depositPercent"
                        value={(field.state.value as string) ?? ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        inputMode="numeric"
                        placeholder="25"
                        className="pr-8"
                        aria-invalid={
                          field.state.meta.errors.length > 0 ? true : undefined
                        }
                      />
                      <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                        %
                      </span>
                    </div>
                    <FormFieldError field={field} />
                  </div>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>
      </div>
    </WizardStepFrame>
  );
}
