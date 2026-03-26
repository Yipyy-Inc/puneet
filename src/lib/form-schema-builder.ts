/**
 * Runtime Zod schema generation from FormField definitions.
 * Converts a list of form fields into a Zod validation schema.
 */
import { z } from "zod";
import type { FormQuestion } from "@/types/forms";

/**
 * Map a question type string to a base Zod schema.
 */
export function fieldTypeToZod(type: string): z.ZodTypeAny {
  switch (type) {
    case "yes_no":
      return z.enum(["yes", "no"]);
    case "radio":
    case "select":
      return z.string();
    case "multiselect":
      return z.array(z.string());
    case "checkbox":
      return z.boolean();
    case "text":
    case "textarea":
      return z.string();
    case "date":
      return z.string();
    case "number":
      return z.number();
    case "phone":
      return z.string();
    case "email":
      return z.string().email();
    case "address":
      return z.string();
    case "signature":
      return z.string();
    case "file":
      return z.string();
    default:
      return z.string();
  }
}

function applyStringValidation(validation: {
  min?: number;
  max?: number;
}): z.ZodString {
  let s = z.string();
  if (validation.min != null) s = s.min(validation.min);
  if (validation.max != null) s = s.max(validation.max);
  return s;
}

function applyNumberValidation(validation: {
  min?: number;
  max?: number;
}): z.ZodNumber {
  let n = z.number();
  if (validation.min != null) n = n.min(validation.min);
  if (validation.max != null) n = n.max(validation.max);
  return n;
}

/**
 * Build a Zod validation schema from an array of form questions.
 * Required fields use the base schema; optional fields are wrapped in .optional().
 */
export function buildFormSchema(
  fields: FormQuestion[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let schema: z.ZodTypeAny;

    if (
      field.validation &&
      (field.type === "text" || field.type === "textarea")
    ) {
      schema = applyStringValidation(field.validation);
    } else if (field.validation && field.type === "number") {
      schema = applyNumberValidation(field.validation);
    } else {
      schema = fieldTypeToZod(field.type);
    }

    shape[field.id] = field.required ? schema : schema.optional();
  }

  return z.object(shape);
}
