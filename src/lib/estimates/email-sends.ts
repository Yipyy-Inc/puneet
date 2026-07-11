import { defaultInvoiceTemplate } from "@/data/invoice-template";
import type { Estimate } from "@/types/booking";
import {
  dateRangeOf,
  estimateEmailSubject,
  fmtEmailDate,
  petOf,
  serviceOf,
} from "@/components/estimates/emails/email-helpers";

// Mocked estimate/booking email sends. Each "send" records to an in-memory
// outbox and returns a descriptor — swap for a real mailer when one lands.

export interface MockSend {
  to: string;
  subject: string;
  template: string;
  sentAt: string;
}

const outbox: MockSend[] = [];

/** Inspect the mock outbox (e.g. for a preview/debug surface). */
export function getEstimateEmailOutbox(): readonly MockSend[] {
  return outbox;
}

const FACILITY = defaultInvoiceTemplate.facilityName;

function recipient(estimate: Estimate): string {
  return (estimate.guestEmail || estimate.clientEmail || "").trim();
}

function record(
  estimate: Estimate,
  subject: string,
  template: string,
): MockSend {
  const send: MockSend = {
    to: recipient(estimate),
    subject,
    template,
    sentAt: new Date().toISOString(),
  };
  outbox.push(send);
  return send;
}

/** 6.1 — standard estimate email (existing customer). */
export function sendStandardEstimateEmail(estimate: Estimate): MockSend {
  return record(
    estimate,
    estimateEmailSubject(estimate, FACILITY),
    "standard-estimate",
  );
}

/** 6.2 — combined welcome + estimate email (new auto-created account). */
export function sendWelcomeEstimateEmail(estimate: Estimate): MockSend {
  return record(
    estimate,
    estimateEmailSubject(estimate, FACILITY),
    "welcome-estimate",
  );
}

/** Follow-up reminder (not-viewed / viewed-but-not-booked). */
export function sendEstimateReminder(
  estimate: Estimate,
  variant: "not_viewed" | "viewed",
): MockSend {
  const subject =
    variant === "viewed"
      ? `Still thinking it over? ${petOf(estimate)}'s ${serviceOf(estimate)} estimate`
      : `Reminder: your estimate for ${petOf(estimate)}'s ${serviceOf(estimate)} is waiting`;
  return record(estimate, subject, `reminder-${variant}`);
}

/** 24h expiry warning (Accept-only). */
export function sendEstimateExpiryWarning(estimate: Estimate): MockSend {
  const when = estimate.expiresAt ? fmtEmailDate(estimate.expiresAt) : "soon";
  return record(
    estimate,
    `Your estimate for ${petOf(estimate)} expires tomorrow — ${when}`,
    "expiry-warning",
  );
}

/** Acceptance confirmation to the customer. */
export function sendEstimateAcceptanceEmail(estimate: Estimate): MockSend {
  return record(estimate, `Estimate accepted — ${FACILITY}`, "acceptance");
}

/** Decline receipt to the customer. */
export function sendEstimateDeclineReceipt(estimate: Estimate): MockSend {
  return record(
    estimate,
    `We've received your response — ${FACILITY}`,
    "decline-receipt",
  );
}

/** Standard booking confirmation after an estimate converts (Area 7). */
export function sendBookingConfirmationEmail(
  estimate: Estimate,
  bookingId?: number,
): MockSend {
  void bookingId;
  return record(
    estimate,
    `Your booking is confirmed — ${petOf(estimate)}'s ${serviceOf(estimate)}, ${dateRangeOf(estimate)}`,
    "booking-confirmation",
  );
}
