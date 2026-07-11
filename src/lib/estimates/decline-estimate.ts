import type { Estimate } from "@/types/booking";
import { sendEstimateDeclineReceipt } from "@/lib/estimates/email-sends";

/**
 * Customer decline of an estimate (spec 7.5). Stamps `declinedAt`/`declineReason`
 * (F1), sets status to declined, and logs it. Declined is terminal — no further
 * follow-ups are scheduled or sent.
 */
export function declineEstimate(
  estimate: Estimate,
  opts: { reason: string; now?: Date },
): void {
  const now = opts.now ?? new Date();
  estimate.status = "declined";
  estimate.declineReason = opts.reason;
  estimate.declinedAt = now.toISOString();
  estimate.activityLog = [
    ...(estimate.activityLog ?? []),
    {
      at: now.toISOString(),
      type: "Declined",
      actor: estimate.clientName,
      detail: opts.reason,
    },
  ];
  // Terminal state — stop any pending follow-up cadence.
  estimate.followUpType = undefined;

  // Mocked send: decline receipt to the customer.
  sendEstimateDeclineReceipt(estimate);
}
