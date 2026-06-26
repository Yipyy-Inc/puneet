"use client";

import type { AnyFieldApi } from "@tanstack/react-form";

import {
  FormFieldError,
  type AnyReactFormApi,
} from "@/components/ui/form/form-field";

/**
 * Renders ONLY the validation error(s) for a given field path — used for
 * object/array-level gates (e.g. `services`, `schedule`) whose issue path
 * doesn't correspond to a single rendered input.
 */
export function FieldErrorOnly({
  form,
  name,
}: {
  form: AnyReactFormApi;
  name: string;
}) {
  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => <FormFieldError field={field} />}
    </form.Field>
  );
}
