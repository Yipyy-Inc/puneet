import { defaultInvoiceTemplate } from "@/data/invoice-template";
import type { InvoiceTemplate } from "@/types/invoice-template";
import type { Estimate } from "@/types/booking";
import { EmailShell } from "./EmailShell";
import { dateRangeOf, firstNameOf, petOf, serviceOf } from "./email-helpers";

/**
 * Standard booking confirmation sent when an accepted estimate converts into a
 * booking (Area 7). This is a booking email, not an estimate email.
 */
export function BookingConfirmationEmail({
  estimate,
  bookingId,
  template = defaultInvoiceTemplate,
}: {
  estimate: Estimate;
  bookingId?: number;
  template?: InvoiceTemplate;
}) {
  const accent = template.accentColor;
  const ref = bookingId ?? estimate.convertedBookingId;
  const room = estimate.roomType || estimate.serviceType;
  const subject = `Your booking is confirmed — ${petOf(estimate)}'s ${serviceOf(estimate)}, ${dateRangeOf(estimate)}`;

  return (
    <EmailShell subject={subject} template={template}>
      <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-900">
          You&apos;re all set, {firstNameOf(estimate)} — your booking is
          confirmed!
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          We can&apos;t wait to see {petOf(estimate)}.
        </p>
      </div>

      <div className="space-y-1.5 rounded-lg border bg-slate-50 px-4 py-3 text-sm">
        {ref != null && (
          <div className="flex justify-between">
            <span className="text-slate-500">Booking #</span>
            <span className="font-medium tabular-nums">{ref}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Service</span>
          <span className="font-medium capitalize">
            {estimate.service}
            {room ? ` · ${room}` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Pet</span>
          <span className="font-medium">{petOf(estimate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Dates</span>
          <span className="font-medium">{dateRangeOf(estimate)}</span>
        </div>
        <div className="flex justify-between border-t pt-1.5 font-bold">
          <span>Total</span>
          <span className="tabular-nums">${estimate.total.toFixed(2)}</span>
        </div>
        {estimate.depositRequired && estimate.depositRequired > 0 ? (
          <div className="flex justify-between text-xs text-emerald-700">
            <span>Deposit paid</span>
            <span className="tabular-nums">
              ${estimate.depositRequired.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="pt-1">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- email HTML uses plain anchors */}
        <a
          href="/customer/bookings"
          className="block rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          View My Booking
        </a>
      </div>
    </EmailShell>
  );
}
