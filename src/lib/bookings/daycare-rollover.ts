import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { loadDaycareServices } from "@/lib/pricing/daycare-services-server";
import {
  resolveDaycareService,
  rolloverTarget,
} from "@/lib/pricing/daycare-service-choice";

// ============================================================================
// THE DOG STAYED LATE, SO THE SERVICE CHANGED.
//
// MoéGo's auto-rollover, in its own words: "This service will turn into a Full
// Day service if a pet stays 30 minutes past the max duration of 4 hours." It
// is the feature that stops a facility losing money on an overstay, so it has
// to move the BILL and not just a label.
//
// ── IT MEASURES THE REAL STAY, NOT THE BOOKED ONE ─────────────────────────
//
// `checked_out_at − checked_in_at`. A pet booked for four hours who left after
// seven was here for seven, and the booked window is what somebody intended
// rather than what happened.
//
// ── THE MONEY RULES IT HAS TO RESPECT ─────────────────────────────────────
//
// Settled 2026-09-23 and not negotiable here:
//
//   · `bookings.total_cost` is GROSS of the discount (20260924100000), and
//     `amount_due` is GENERATED as `total_cost + extras_total - discount`.
//   · `extras_total`, `taxable_extras_total` and `amount_paid` are all
//     trigger-derived. Writing any of them by hand is how the ledger and the
//     bill start disagreeing.
//
// So this writes `base_price` and `total_cost` and nothing else, and it moves
// them by a DELTA rather than recomputing from the service's price: a booking
// may carry add-ons, a package pass or a discount that were agreed at booking
// time, and re-deriving the total would quietly discard them.
//
// ── ONCE, AND IT SAYS SO ──────────────────────────────────────────────────
//
// A booking that has already rolled over carries `details.rolloverFrom`, and
// this refuses to roll it again — a second check-out after a reopen must not
// charge the difference twice. That key is also the record a person can be
// shown when they ask why the price moved.
// ============================================================================

export interface RolloverOutcome {
  rolled: boolean;
  /** What it became, for the log line and the toast. */
  from?: string;
  to?: string;
  delta?: number;
  reason?: "no_service_key" | "no_attendance" | "already_rolled" | "not_past";
}

interface BookingRow {
  id: string;
  facility_id: string;
  location_id: string | null;
  base_price: number | string | null;
  total_cost: number | string | null;
  details: Record<string, unknown> | null;
}

function num(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Roll one daycare booking over if its stay ran past what it paid for.
 *
 * Best effort and never throws: a check-out that succeeded must not be undone
 * because the re-price failed. It reports what it did so the caller can say so.
 */
export async function applyDaycareRollover(
  bookingId: string,
): Promise<RolloverOutcome> {
  if (!hasServiceRoleKey()) return { rolled: false };

  try {
    const admin = createAdminClient();

    const { data: bookingRow } = await admin
      .from("bookings")
      .select("id, facility_id, location_id, base_price, total_cost, details")
      .eq("id", bookingId)
      .maybeSingle();

    const booking = bookingRow as unknown as BookingRow | null;
    if (!booking) return { rolled: false };

    const details = booking.details ?? {};
    if (details["rolloverFrom"]) {
      // Already charged the difference once.
      return { rolled: false, reason: "already_rolled" };
    }

    const serviceId = details["daycareServiceId"] as string | undefined;
    if (!serviceId) {
      // A booking made before the cutover names no service, so there is no
      // ceiling to have run past. Nothing to do, and not an error.
      return { rolled: false, reason: "no_service_key" };
    }

    const { data: attendanceRow } = await admin
      .from("daycare_attendance")
      .select("checked_in_at, checked_out_at")
      .eq("booking_id", bookingId)
      .maybeSingle();

    const attendance = attendanceRow as unknown as {
      checked_in_at: string | null;
      checked_out_at: string | null;
    } | null;
    if (!attendance?.checked_in_at || !attendance.checked_out_at) {
      return { rolled: false, reason: "no_attendance" };
    }

    const hours =
      (Date.parse(attendance.checked_out_at) -
        Date.parse(attendance.checked_in_at)) /
      3_600_000;
    if (!Number.isFinite(hours) || hours <= 0) {
      return { rolled: false, reason: "no_attendance" };
    }

    const services = await loadDaycareServices(
      booking.facility_id,
      booking.location_id,
    );
    const current = resolveDaycareService(services, { serviceId });
    if (!current) return { rolled: false, reason: "no_service_key" };

    const target = rolloverTarget(current, services, hours);
    if (!target) return { rolled: false, reason: "not_past" };

    // THE DELTA, not a recomputation. Add-ons, a package pass and the
    // discount stay exactly as they were agreed.
    const delta = target.price - current.price;
    if (delta === 0) {
      // The rollover still HAPPENED — the booking is a Full Day now — it just
      // costs the same. Recorded, so the receipt names the right service.
      return await write(admin, booking, current, target, 0);
    }

    return await write(admin, booking, current, target, delta);
  } catch {
    // Never unwind a check-out over a re-price.
    return { rolled: false };
  }
}

async function write(
  admin: ReturnType<typeof createAdminClient>,
  booking: BookingRow,
  from: { rowId: string; name: string; price: number },
  to: { rowId: string; name: string; price: number },
  delta: number,
): Promise<RolloverOutcome> {
  const { error } = await admin
    .from("bookings")
    .update({
      // `base_price` and `total_cost` only. `amount_due` is generated from
      // `total_cost + extras_total - discount`, and writing it by hand is
      // both impossible and the wrong idea.
      base_price: num(booking.base_price) + delta,
      total_cost: num(booking.total_cost) + delta,
      // The name on the receipt follows the service.
      service_type: to.name,
      details: {
        ...(booking.details ?? {}),
        daycareServiceId: to.rowId,
        // WHAT IT WAS, so a person asked "why did this go up?" has an answer
        // rather than a number that changed while they were not looking.
        rolloverFrom: {
          serviceId: from.rowId,
          name: from.name,
          price: from.price,
          at: new Date().toISOString(),
        },
      },
    } as never)
    .eq("id", booking.id);

  if (error) return { rolled: false };
  return { rolled: true, from: from.name, to: to.name, delta };
}
