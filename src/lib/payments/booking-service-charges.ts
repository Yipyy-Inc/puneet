import "server-only";

import {
  serviceChargeLines,
  type ServiceChargeLine,
} from "@/lib/pricing/service-charge-lines";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { CustomFee } from "@/types/boarding";

// ============================================================================
// PUTTING A FACILITY'S SERVICE CHARGES ON A NEW BOOKING.
//
// A custom fee used to be folded into `bookings.total_cost`, indistinguishable
// from the base price. It is a line item now, which is what lets it appear on
// an invoice by name and be seen by a report. 20260806820000's Decision 3 is
// the rule it follows: `total_cost` is the booking's PRICE, and what a
// customer owes is `total_cost + extras_total`.
//
// ── IT RUNS AT CREATE, NOT ONLY AT CHECKOUT ───────────────────────────────
//
// `amount_due` is what a deposit, a pay-link, a terminal and `settle_bookings`
// all read. A fee added only at the till would leave every one of those four
// short for a booking paid before anyone opened it.
//
// ── ONCE PER REQUEST, NOT ONCE PER BOOKING ROW ────────────────────────────
//
// The wizard splits one request into several bookings — daycare makes one per
// DAY, boarding one per ROOM — and `splitMoney` divides the total across them.
// Applying a fee to each row turns a $15 cleaning fee into $75 on a five-day
// block. So it is applied to the FIRST booking only, which is `item_index 0`
// and therefore `created[0]` at the call site: no group lookup needed, the
// total is what the facility actually authored, and the invoice line reads
// $15.00 rather than a puzzling $3.00.
//
// ── IT ASKS ONLY WHAT THE SERVICE CAN ANSWER ──────────────────────────────
//
// `automaticServiceCharges` keeps the two triggers that depend on nothing but
// which service was booked. The richer ones — new customer, customer segment,
// an add-on having been bought — need context this path does not have, and
// they are applied at the till where it exists.
//
// ── A REQUEST IS NOT PRICED YET ───────────────────────────────────────────
//
// `private.enforce_booking_integrity` zeroes `total_cost` on every booking a
// customer inserts, because the number came from their browser. A percentage
// fee applied against that would be $0 and would then be STUCK at $0, because
// the unique constraint means it can only land once. So a request is skipped
// here and picked up at the till, after staff have priced it.
//
// ── IT NEVER FAILS THE BOOKING ────────────────────────────────────────────
//
// Same contract as `stampBookingTaxable`: it returns a count and swallows its
// own failures. A booking that exists with no service charge on it is the
// behaviour that shipped before this module; a booking that failed to be
// created because a fee could not be read is not.
// ============================================================================

/** Statuses where the price is still the customer's claim, not the facility's. */
const UNPRICED_STATUSES = new Set(["request_submitted"]);

interface BookingRow {
  id: string;
  facility_id: string;
  service: string;
  status: string;
  total_cost: number | string | null;
  location_id: string | null;
}

export async function applyBookingServiceCharges(
  bookingIds: string[],
): Promise<number> {
  if (bookingIds.length === 0 || !hasServiceRoleKey()) return 0;

  try {
    const admin = createAdminClient();

    const { data } = await admin
      .from("bookings")
      .select("id, facility_id, service, status, total_cost, location_id")
      .in("id", bookingIds);

    const rows = (data ?? []) as unknown as BookingRow[];
    const priced = rows.filter((row) => !UNPRICED_STATUSES.has(row.status));
    if (priced.length === 0) return 0;

    // How many pets each booking covers — `scope: "per_pet"` multiplies by it.
    // ONE read for the batch, the same shape `stampBookingTaxable` uses.
    const petCounts = new Map<string, number>();
    const { data: petRows } = await admin
      .from("booking_pets")
      .select("booking_id")
      .in(
        "booking_id",
        priced.map((row) => row.id),
      );
    for (const pet of (petRows ?? []) as { booking_id: string }[]) {
      petCounts.set(pet.booking_id, (petCounts.get(pet.booking_id) ?? 0) + 1);
    }

    // One settings read per FACILITY, not per booking.
    const feesByFacility = new Map<string, CustomFee[]>();
    for (const facilityId of new Set(priced.map((row) => row.facility_id))) {
      feesByFacility.set(facilityId, await readCustomFees(admin, facilityId));
    }

    const lines: (ServiceChargeLine & {
      booking_id: string;
      facility_id: string;
    })[] = [];

    for (const row of priced) {
      const fees = feesByFacility.get(row.facility_id) ?? [];
      if (fees.length === 0) continue;

      for (const line of serviceChargeLines(fees, {
        serviceId: row.service,
        petCount: petCounts.get(row.id) ?? 1,
        serviceTotal: Number(row.total_cost ?? 0),
        // A fee narrowed to some branches is not charged at the others.
        locationId: row.location_id,
      })) {
        lines.push({
          ...line,
          booking_id: row.id,
          facility_id: row.facility_id,
        });
      }
    }

    if (lines.length === 0) return 0;

    // `ignoreDuplicates` on `(booking_id, fee_id)`: the till will try the same
    // fees again when it opens, and the second attempt must cost nothing.
    const { data: written } = await admin
      .from("booking_line_items")
      .upsert(
        lines.map((line) => ({
          booking_id: line.booking_id,
          facility_id: line.facility_id,
          kind: line.kind,
          name: line.name,
          unit_price: line.unitPrice,
          quantity: line.quantity,
          fee_id: line.feeId,
          author_name: "Pricing rules",
        })) as never,
        { onConflict: "booking_id,fee_id", ignoreDuplicates: true },
      )
      .select("id");

    return (written ?? []).length;
  } catch {
    // Deliberately silent, like the tax stamp beside it. A booking with no
    // service charge is recoverable at the till; a booking that was never
    // created is not.
    return 0;
  }
}

async function readCustomFees(
  admin: ReturnType<typeof createAdminClient>,
  facilityId: string,
): Promise<CustomFee[]> {
  const { data } = await admin
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "pricing_rules")
    .maybeSingle();

  const value = (data as { value?: unknown } | null)?.value;
  if (!value || typeof value !== "object") return [];
  const fees = (value as { customFees?: unknown }).customFees;
  return Array.isArray(fees) ? (fees as CustomFee[]) : [];
}
