"use client";

import type { AnyFieldApi } from "@tanstack/react-form";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AnyReactFormApi } from "./form-field";
import { FormFieldError } from "./form-field";

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  form: AnyReactFormApi;
  name: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
}

function FormSelect({
  form,
  name,
  label,
  placeholder,
  options,
  disabled,
}: FormSelectProps) {
  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => (
        <div className="space-y-2">
          <Label htmlFor={field.name}>{label}</Label>
          <Select
            value={(field.state.value as string) ?? ""}
            onValueChange={(value) => field.handleChange(value)}
            disabled={disabled}
          >
            <SelectTrigger
              id={field.name}
              className="w-full"
              aria-invalid={
                field.state.meta.errors.length > 0 ? true : undefined
              }
              onBlur={field.handleBlur}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldError field={field} />
        </div>
      )}
    </form.Field>
  );
}

export { FormSelect };
export type { FormSelectProps, SelectOption };
