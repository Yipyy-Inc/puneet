import { bookings } from "@/data/bookings";
import { getEstimateSettings } from "@/data/estimate-settings";
import type { Estimate } from "@/types/booking";
import {
  sendBookingConfirmationEmail,
  sendEstimateAcceptanceEmail,
} from "@/lib/estimates/email-sends";

export interface AcceptResult {
  /** True when the estimate was auto-converted into a booking on acceptance. */
  autoConverted: boolean;
  bookingId: number | null;
}

function nextBookingId(): number {
  return bookings.reduce((m, b) => Math.max(m, b.id), 1000) + 1;
}

/**
 * Customer acceptance of an estimate (spec 7.4). Stamps `acceptedAt`/`acceptedBy`
 * (F1, customer — not on behalf), sets status to accepted, and logs it. When
 * `settings.autoConvertOnAccept` is on and the deposit is satisfied, auto-creates
 * a booking (Area 7) and flips the estimate to converted.
 */
export function acceptEstimate(
  estimate: Estimate,
  opts?: { now?: Date; depositPaid?: boolean; acceptedBy?: string },
): AcceptResult {
  const now = opts?.now ?? new Date();
  const settings = getEstimateSettings();
  const actor = opts?.acceptedBy ?? estimate.clientName;

  estimate.status = "accepted";
  estimate.acceptedAt = now.toISOString();
  estimate.acceptedBy = actor;
  estimate.acceptedOnBehalf = false;
  estimate.activityLog = [
    ...(estimate.activityLog ?? []),
    { at: now.toISOString(), type: "Accepted", actor },
  ];

  // Mocked send: acceptance confirmation to the customer.
  sendEstimateAcceptanceEmail(estimate);

  if (settings.autoConvertOnAccept && opts?.depositPaid) {
    const bookingId = nextBookingId();
    estimate.status = "converted";
    estimate.convertedBookingId = bookingId;
    estimate.activityLog = [
      ...estimate.activityLog,
      {
        at: now.toISOString(),
        type: "Converted",
        actor: "System",
        detail: `Booking #${bookingId}`,
      },
    ];
    // Mocked send: standard booking confirmation (Area 7).
    sendBookingConfirmationEmail(estimate, bookingId);
    return { autoConverted: true, bookingId };
  }

  return { autoConverted: false, bookingId: null };
}
