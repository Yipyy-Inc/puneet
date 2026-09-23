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

/**
 * A daycare service the facility gates on an evaluation before ONLINE booking
 * (`requires_evaluation_online`, 20260924140000).
 *
 * It lives here rather than in a daycare module because it is the same
 * mechanism: the database refuses, `create_booking` raises 22023 with a hint,
 * and the route turns the hint into a 422 the customer's screen can act on.
 * The message names the service, because a refusal somebody cannot act on is a
 * dead end rather than a refusal.
 */
export const DAYCARE_EVALUATION_REQUIRED = "daycare_evaluation_required";

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
