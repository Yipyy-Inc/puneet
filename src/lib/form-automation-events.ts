/**
 * 7.2 Form automation hooks for automation builder.
 * Forms module emits these events; automation builder can subscribe the same way as other modules.
 *
 * Emitted from:
 * - form_link_sent: facility Share → Copy link (or embed)
 * - form_started: customer opens public form page
 * - form_submitted: customer submits form (createSubmission)
 * - form_incomplete_by_deadline: from scheduled job / cron when deadline passes without submission
 * - form_red_flag_answer: when a submission matches a logic rule that triggers an alert (e.g. on submit or in processing)
 */

import type { FormAutomationEventType, FormEventPayload } from "@/types/forms";

export type { FormAutomationEventType, FormEventPayload } from "@/types/forms";

/**
 * Emit a form event for automation builder. In production this would push to an event bus or automation engine.
 */
export function triggerFormEvent(
  eventType: FormAutomationEventType,
  payload: FormEventPayload,
): void {
  if (
    typeof window !== "undefined" &&
    (window as unknown as { __FORM_EVENTS__?: unknown[] }).__FORM_EVENTS__
  ) {
    (window as unknown as { __FORM_EVENTS__: unknown[] }).__FORM_EVENTS__.push({
      eventType,
      payload,
      at: new Date().toISOString(),
    });
  }
  // Server or no dev buffer: could send to analytics/automation API
}
