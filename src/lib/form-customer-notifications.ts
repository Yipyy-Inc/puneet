/**
 * Customer form notification config and hooks.
 * When to notify customer: submission confirmed, missing required forms reminder, form rejected / needs correction.
 * Respects facilityConfig.notifications.forms.customer; can trigger automation or future email/SMS.
 */

import { facilityConfig } from "@/data/facility-config";

const customerNotify = facilityConfig.notifications?.forms?.customer;

/** Notify customer that their submission was confirmed (e.g. when staff marks as processed). */
export function notifyCustomerSubmissionConfirmed(params: {
  facilityId: number;
  formId: string;
  formName: string;
  submissionId: string;
  customerId?: number;
}): void {
  if (!customerNotify?.submissionConfirmed) return;
  // In production: send email/SMS or in-app notification
  if (typeof window !== "undefined") {
    (
      window as unknown as { __FORM_CUSTOMER_EVENTS__?: unknown[] }
    ).__FORM_CUSTOMER_EVENTS__ ??= [];
    (
      window as unknown as { __FORM_CUSTOMER_EVENTS__: unknown[] }
    ).__FORM_CUSTOMER_EVENTS__.push({
      type: "submission_confirmed",
      ...params,
      at: new Date().toISOString(),
    });
  }
}

/** Notify customer about missing required forms (reminder). */
export function notifyCustomerMissingRequiredForms(params: {
  facilityId: number;
  customerId: number;
  petIds?: number[];
  formIds: string[];
  formNames?: string[];
}): void {
  if (!customerNotify?.missingRequiredFormsReminder) return;
  if (typeof window !== "undefined") {
    (
      window as unknown as { __FORM_CUSTOMER_EVENTS__?: unknown[] }
    ).__FORM_CUSTOMER_EVENTS__ ??= [];
    (
      window as unknown as { __FORM_CUSTOMER_EVENTS__: unknown[] }
    ).__FORM_CUSTOMER_EVENTS__.push({
      type: "missing_required_forms_reminder",
      ...params,
      at: new Date().toISOString(),
    });
  }
}

/** Notify customer that form was rejected / needs correction (optional workflow). */
export function notifyCustomerFormRejected(params: {
  facilityId: number;
  formId: string;
  formName: string;
  submissionId: string;
  customerId?: number;
  reason?: string;
}): void {
  if (!customerNotify?.formRejectedNeedsCorrection) return;
  if (typeof window !== "undefined") {
    (
      window as unknown as { __FORM_CUSTOMER_EVENTS__?: unknown[] }
    ).__FORM_CUSTOMER_EVENTS__ ??= [];
    (
      window as unknown as { __FORM_CUSTOMER_EVENTS__: unknown[] }
    ).__FORM_CUSTOMER_EVENTS__.push({
      type: "form_rejected_needs_correction",
      ...params,
      at: new Date().toISOString(),
    });
  }
}
