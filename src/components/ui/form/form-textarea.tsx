"use client";

import type { AnyFieldApi } from "@tanstack/react-form";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { AnyReactFormApi } from "./form-field";
import { FormFieldError } from "./form-field";

interface FormTextareaProps extends Omit<
  React.ComponentProps<"textarea">,
  "name" | "form"
> {
  form: AnyReactFormApi;
  name: string;
  label: string;
}

function FormTextarea({
  form,
  name,
  label,
  ...textareaProps
}: FormTextareaProps) {
  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <Textarea
            id={field.name}
            name={field.name}
            value={(field.state.value as string) ?? ""}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            aria-invalid={field.state.meta.errors.length > 0 ? true : undefined}
            {...textareaProps}
          />
          <FormFieldError field={field} />
        </div>
      )}
    </form.Field>
  );
}

export { FormTextarea };
export type { FormTextareaProps };
