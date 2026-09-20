"use client";

import type { AnyFieldApi } from "@tanstack/react-form";

import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
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

/**
 * A street field that offers real addresses, and fills its neighbours.
 *
 * ── WHY IT TAKES THE OTHER FIELDS' NAMES ──────────────────────────────────
 *
 * Choosing a suggestion is worth far more than saving keystrokes on the
 * street: city, province and postal code are where a typed address actually
 * goes wrong, and a wrong postcode is a van driving to the wrong end of the
 * island. So the caller names the three companion fields and this sets them
 * through the form's own API — no shared state, and a form that does not have
 * one of them simply does not name it.
 */
function FormAddressField({
  form,
  name,
  label,
  hintText,
  cityName,
  provinceName,
  postalCodeName,
  ...inputProps
}: FormFieldProps & {
  /** Read by a screen reader when the list of addresses opens. */
  hintText: string;
  cityName?: string;
  provinceName?: string;
  postalCodeName?: string;
}) {
  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <AddressAutocomplete
            id={field.name}
            value={(field.state.value as string) ?? ""}
            onValueChange={(street) => field.handleChange(street)}
            onSelect={(suggestion) => {
              if (cityName) form.setFieldValue(cityName, suggestion.city);
              if (provinceName) {
                form.setFieldValue(provinceName, suggestion.province);
              }
              if (postalCodeName) {
                form.setFieldValue(postalCodeName, suggestion.postalCode);
              }
            }}
            hintText={hintText}
            placeholder={inputProps.placeholder as string | undefined}
            disabled={inputProps.disabled}
          />
          <FormFieldError field={field} />
        </div>
      )}
    </form.Field>
  );
}

export { FormAddressField, FormField, FormFieldError };
export type { AnyReactFormApi, FormFieldProps };
