"use client";

import Link from "next/link";

import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// Above the header card: the way back to the client, and the booking's own
// number with its service (the mock's "← Back to … · #94534 · Boarding"). A
// booking made from an estimate says so here, linked, where the hero said it.
// ============================================================================

export function DetailsTopLine({ d }: { d: BookingDetails }) {
  const { fill } = d.text;
  const client = d.client;
  if (!client) return null;
  return (
    <div className="text-ink-tertiary flex flex-wrap justify-between gap-3 text-[13px]">
      <Link
        href={d.portal.href(`/facility/dashboard/clients/${client.id}`)}
        className="text-primary hover:text-primary-hover"
      >
        {fill("backToClient", { name: client.name })}
      </Link>
      <span className="flex flex-wrap items-center gap-x-2">
        {/* §5r: a booking reference never passes through the locale layer. */}
        <span>{`${d.bookingRef} · ${d.serviceLabel}`}</span>
        {d.sourceEstimate ? (
          <Link
            href={d.portal.href(
              `/facility/dashboard/estimates?q=${d.sourceEstimate.estimateId}`,
            )}
            className="text-primary hover:text-primary-hover"
          >
            {fill("fromEstimate", { id: d.sourceEstimate.estimateId })}
          </Link>
        ) : null}
      </span>
    </div>
  );
}
