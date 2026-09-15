import { LiveWriteError } from "@/lib/api/live-fetch";

// ============================================================================
// A booking refused for a form the facility requires, as the screens read it.
//
// The database decides (`private.missing_required_forms`, enforced inside
// `create_booking`); the booking route returns 422 with `code` and the
// `missing` forms. A customer is told which forms to complete. Staff may go
// ahead with a reason, which is saved.
// ============================================================================

export const FORM_REQUIRED = "form_required";
export const FORM_OVERRIDE_REASON_REQUIRED = "form_override_reason_required";

export type FormRefusalCode =
  | typeof FORM_REQUIRED
  | typeof FORM_OVERRIDE_REASON_REQUIRED;

/** One missing form, as `client_missing_forms` returns it. */
export interface MissingForm {
  form_id: string;
  form_name: string;
  form_slug: string;
  pet_id: string | null;
  pet_name: string | null;
  enforcement: "block" | "warn";
}

export interface FormRefusal {
  code: FormRefusalCode;
  message: string;
  missing: MissingForm[];
}

function isMissingForm(value: unknown): value is MissingForm {
  const row = value as Partial<MissingForm> | null;
  return (
    typeof row === "object" &&
    row !== null &&
    typeof row.form_id === "string" &&
    typeof row.form_name === "string" &&
    typeof row.form_slug === "string"
  );
}

/** The form refusal inside a failed write, or null when it is anything else. */
export function formRefusalOf(error: unknown): FormRefusal | null {
  if (!(error instanceof LiveWriteError)) return null;
  if (
    error.code !== FORM_REQUIRED &&
    error.code !== FORM_OVERRIDE_REASON_REQUIRED
  ) {
    return null;
  }
  const missing = Array.isArray(error.body?.missing)
    ? error.body.missing.filter(isMissingForm)
    : [];
  return { code: error.code, message: error.message, missing };
}
