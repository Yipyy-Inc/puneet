"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import type { ReactFormExtendedApi } from "@tanstack/react-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyReactFormApi = ReactFormExtendedApi<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface FormFieldProps extends Omit<
  React.ComponentProps<"input">,
  "name" | "form"
> {
  form: AnyReactFormApi;
  name: string;
  label: string;
}

function FormFieldError({ field }: { field: AnyFieldApi }) {
  if (field.state.meta.errors.length === 0) return null;
  return (
    <p className="text-destructive text-sm">
      {field.state.meta.errors.map(String).join(", ")}
    </p>
  );
}

function FormField({ form, name, label, ...inputProps }: FormFieldProps) {
  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <Input
            id={field.name}
            name={field.name}
            value={(field.state.value as string) ?? ""}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            aria-invalid={field.state.meta.errors.length > 0 ? true : undefined}
            {...inputProps}
          />
          <FormFieldError field={field} />
        </div>
      )}
    </form.Field>
  );
}

export { FormField, FormFieldError };
export type { AnyReactFormApi, FormFieldProps };
