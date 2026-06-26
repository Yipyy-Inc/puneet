"use client";

import type { AnyFieldApi } from "@tanstack/react-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The fully-generic ReactFormExtendedApi<any, …×12> resolves one method's
// parameter to `never`, which makes concrete `useForm()` results unassignable
// to it. These adapters only ever touch `form.Field`/`form.Subscribe`, so a
// plain `any` is the pragmatic, correct prop type here.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyReactFormApi = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface FormFieldProps extends Omit<
  React.ComponentProps<"input">,
  "name" | "form"
> {
  form: AnyReactFormApi;
  name: string;
  label: string;
}

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function FormFieldError({ field }: { field: AnyFieldApi }) {
  const messages = field.state.meta.errors.map(errorText).filter(Boolean);
  if (messages.length === 0) return null;
  return <p className="text-destructive text-sm">{messages.join(", ")}</p>;
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
