import "server-only";

import {
  autoConfirmsService,
  bookingApprovalSchema,
  DEFAULT_BOOKING_APPROVAL,
} from "@/lib/settings/booking-approval";
import { priceCustomerBooking } from "@/lib/bookings/price-booking";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// A customer's booking confirmed on the spot, when the facility says so.
//
// ── WHY NO MIGRATION ──────────────────────────────────────────────────────
//
// `private.enforce_booking_integrity` forces every booking a CUSTOMER inserts
// to `request_submitted` with the price zeroed — and it should, because the
// number came from their browser. But its first act is:
//
//     if (select auth.jwt()->>'sub') is null then return new; end if;
//
// so a write with no user behind it — the service role — is already outside
// that path. The booking is therefore made exactly as it is today, by the
// customer, under their own RLS, and PROMOTED afterwards by the server. No
// branch had to be cut into the trigger, and the customer's own session still
// cannot confirm anything.
//
// ── WHAT HAS TO BE TRUE BEFORE IT IS CONFIRMED ────────────────────────────
//
// 1. The facility switched this service on. Read here from
//    `booking_approval`, never taken from the request.
// 2. The server can price it from the facility's own rates.
// 3. That price agrees with what the customer was shown, which the trigger
//    kept in `details.requestedQuote`.
//
// Any of those failing leaves the booking exactly as it is — a request — which
// is what would have happened anyway. This never fails a booking: the booking
// is already made before this runs, and the worst outcome is that staff look
// at it, which is the status quo.
// ============================================================================

interface Promotable {
  id: string;
  facility_id: string;
  service: string | null;
  status: string;
  start_at: string | null;
  end_at: string | null;
  details: Record<string, unknown> | null;
}

function isoDay(value: string | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

/** What the customer was shown, as the trigger recorded it. */
function quotedTotal(details: Record<string, unknown> | null): number | null {
  const quote = (details ?? {})["requestedQuote"] as
    | { totalCost?: unknown }
    | undefined;
  const total = quote?.totalCost;
  return typeof total === "number" && Number.isFinite(total) ? total : null;
}

/**
 * Confirm the bookings the facility has said need no approval.
 *
 * Returns how many were confirmed, for the caller's answer. Never throws: a
 * booking that stays a request is a correct outcome, not a failure.
 */
export async function autoConfirmCustomerBookings(
  bookingIds: string[],
): Promise<number> {
  if (bookingIds.length === 0 || !hasServiceRoleKey()) return 0;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("bookings")
      .select("id, facility_id, service, status, start_at, end_at, details")
      .in("id", bookingIds);

    const rows = (data ?? []) as unknown as Promotable[];
    // Only a fresh request is a candidate. Anything else was made by staff, or
    // has already moved on.
    const candidates = rows.filter(
      (row) => row.status === "request_submitted" && row.service,
    );
    if (candidates.length === 0) return 0;

    // One read per facility, not per booking: a multi-day request is many rows
    // of one facility.
    const approvals = new Map<string, ReturnType<typeof approvalOf>>();
    const approvalOf = (value: unknown) => {
      const parsed = bookingApprovalSchema.safeParse(value);
      return parsed.success ? parsed.data : DEFAULT_BOOKING_APPROVAL;
    };
    for (const facilityId of new Set(candidates.map((c) => c.facility_id))) {
      const { data: setting } = await admin
        .from("facility_settings")
        .select("value")
        .eq("facility_id", facilityId)
        .eq("domain", "booking_approval")
        .maybeSingle();
      approvals.set(
        facilityId,
        approvalOf((setting as { value?: unknown } | null)?.value),
      );
    }

    let confirmed = 0;
    for (const row of candidates) {
      const approval = approvals.get(row.facility_id);
      if (!approval || !autoConfirmsService(approval, row.service!)) continue;

      const quoted = quotedTotal(row.details);
      // No quote means the customer was shown nothing to agree with. That is
      // not a booking to confirm silently.
      if (quoted === null) continue;

      const priced = await priceCustomerBooking({
        facilityId: row.facility_id,
        service: row.service!,
        startDate: isoDay(row.start_at),
        endDate: isoDay(row.end_at),
        bookingId: row.id,
        roomCategoryId:
          (row.details?.["roomCategoryId"] as string | undefined) ?? null,
        quotedTotal: quoted,
      });
      if (!priced.ok) continue;

      const { error } = await admin
        .from("bookings")
        .update({
          status: "confirmed",
          base_price: priced.basePrice,
          total_cost: priced.total,
        })
        .eq("id", row.id)
        // Belt and braces: only ever promote a row still sitting as a request,
        // so a race with staff deciding it cannot un-decide them.
        .eq("status", "request_submitted");
      if (!error) confirmed += 1;
    }
    return confirmed;
  } catch {
    // The booking exists and is a request. That is a safe place to stop.
    return 0;
  }
}
