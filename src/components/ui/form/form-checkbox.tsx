"use client";

import type { AnyFieldApi } from "@tanstack/react-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { AnyReactFormApi } from "./form-field";
import { FormFieldError } from "./form-field";

interface FormCheckboxProps {
  form: AnyReactFormApi;
  name: string;
  label: string;
  disabled?: boolean;
}

function FormCheckbox({ form, name, label, disabled }: FormCheckboxProps) {
  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.name}
              checked={!!field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
              onBlur={field.handleBlur}
              aria-invalid={
                field.state.meta.errors.length > 0 ? true : undefined
              }
              disabled={disabled}
            />
            <Label htmlFor={field.name}>{label}</Label>
          </div>
          <FormFieldError field={field} />
        </div>
      )}
    </form.Field>
  );
}

export { FormCheckbox };
export type { FormCheckboxProps };
