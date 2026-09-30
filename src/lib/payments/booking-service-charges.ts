import "server-only";

import { bookableLookup } from "@/lib/add-ons/bookable";
import { pricedAddOnsFor } from "@/lib/bookings/price-booking";
import {
  requestFeeFacts,
  type RequestFeeRows,
} from "@/lib/pricing/request-fee-facts";
import { customFeeLines } from "@/lib/pricing/service-charge-lines";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { CustomFee } from "@/types/boarding";

// ============================================================================
// PUTTING A FACILITY'S SERVICE CHARGES ON A BOOKING.
//
// A custom fee used to be folded into `bookings.total_cost`, indistinguishable
// from the base price. It is a line item now, which is what lets it appear on
// an invoice by name and be seen by a report. 20260806820000's Decision 3 is
// the rule it follows: `total_cost` is the booking's PRICE, and what a
// customer owes is `total_cost + extras_total`.
//
// ── EVERY TRIGGER, DECIDED HERE FROM THE DATABASE ─────────────────────────
//
// The booking form quotes every fee the facility set to apply by itself — at
// checkout, by care type, to a new customer, a new pet, a customer segment,
// an add-on bought — and takes them all out of `total_cost`, because a fee is
// a line. Until 2026-09-30 this wrote lines for the first two only, and the
// other four were quoted and never charged.
//
// So it decides all six, with the functions the form's pricing engine uses
// (`customFeeLines`), from the same facts read from the database instead of
// the screen: the client had no booking before this request; which of the
// request's pets were on none; the client record's segment; the request's
// add-on lines. "Before this request" is by creation time, so the answer is
// the one the form gave whenever this runs — at create, or later when staff
// approve a request. Nothing in the request body is taken for a fact.
//
// ── ONCE PER REQUEST, ON ITS FIRST BOOKING ────────────────────────────────
//
// The wizard splits one request into several bookings — daycare makes one per
// DAY, boarding one per ROOM. A fee is charged once, on the request's first
// booking (lowest ref), and it is worked out on the WHOLE request: its pets,
// and for a percentage, its service price and add-ons — which is what the
// form's quote was of. (Until 2026-09-30 a percentage was of the first
// booking's price alone.) The percentage base is `base_price`, the service
// before the pricing rules, as the form's engine takes it; a surcharge is not
// something a fee is a percentage of.
//
// ── A REQUEST IS NOT PRICED YET ───────────────────────────────────────────
//
// `private.enforce_booking_integrity` zeroes the price on every booking a
// customer inserts, because the number came from their browser. A percentage
// fee applied against that would be $0 and would then be STUCK at $0, because
// the unique constraint means it can only land once. So a request is skipped
// here, and its fees are written when staff approve it (the decision route
// and the booking PATCH call this again).
//
// ── IT NEVER FAILS THE BOOKING ────────────────────────────────────────────
//
// Same contract as `stampBookingTaxable`: it returns a count and swallows its
// own failures. A booking that exists with no service charge on it is
// recoverable at the till; a booking that failed to be created because a fee
// could not be read is not.
// ============================================================================

/** Statuses where the price is still the customer's claim, not the facility's. */
const UNPRICED_STATUSES = new Set(["request_submitted"]);

interface BookingRow {
  id: string;
  ref: number;
  facility_id: string;
  client_id: string;
  service: string;
  status: string;
  base_price: number | string | null;
  total_cost: number | string | null;
  /** The booking's own add-on lines (2026-09-30). */
  add_ons_total: number | string | null;
  location_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const BOOKING_COLUMNS =
  "id, ref, facility_id, client_id, service, status, base_price, total_cost, add_ons_total, location_id, details, created_at";

export async function applyBookingServiceCharges(
  bookingIds: string[],
): Promise<number> {
  if (bookingIds.length === 0 || !hasServiceRoleKey()) return 0;

  try {
    const admin = createAdminClient();

    const { data } = await admin
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .in("id", bookingIds);
    const given = (data ?? []) as unknown as BookingRow[];

    // Each request once, however many of its bookings were named.
    const requests = new Map<string, BookingRow>();
    for (const row of given) {
      const group = groupOf(row);
      requests.set(group ? `${row.facility_id}:${group}` : row.id, row);
    }

    const feesByFacility = new Map<string, CustomFee[]>();
    let written = 0;

    for (const named of requests.values()) {
      const parts = await requestParts(admin, named);
      const first = parts[0];
      if (!first || UNPRICED_STATUSES.has(first.status)) continue;

      if (!feesByFacility.has(first.facility_id)) {
        feesByFacility.set(
          first.facility_id,
          await readCustomFees(admin, first.facility_id),
        );
      }
      const fees = feesByFacility.get(first.facility_id) ?? [];
      if (fees.length === 0) continue;

      const facts = requestFeeFacts(
        await readFeeRows(admin, parts, needsAddOnPrices(fees)),
      );
      const lines = customFeeLines(fees, facts);
      if (lines.length === 0) continue;

      // `ignoreDuplicates` on `(booking_id, fee_id)`: an approval, the till
      // and a second create attempt may all try the same fees, and only the
      // first may cost anything.
      const { data: rows } = await admin
        .from("booking_line_items")
        .upsert(
          lines.map((line) => ({
            booking_id: first.id,
            facility_id: first.facility_id,
            kind: line.kind,
            name: line.name,
            unit_price: line.unitPrice,
            quantity: line.quantity,
            fee_id: line.feeId,
            // The fee decides, and `customFeeLine` always sets it.
            taxable: line.taxable,
            author_name: "Pricing rules",
          })) as never,
          { onConflict: "booking_id,fee_id", ignoreDuplicates: true },
        )
        .select("id");
      written += (rows ?? []).length;
    }
    return written;
  } catch {
    // Deliberately silent, like the tax stamp beside it. A booking with no
    // service charge is recoverable at the till; a booking that was never
    // created is not.
    return 0;
  }
}

/** The key tying a request's bookings together — `{ id, part, of }` in `details`. */
function groupOf(row: Pick<BookingRow, "details">): string | null {
  const group = (row.details ?? {})["bookingGroup"];
  if (!group || typeof group !== "object") return null;
  const id = (group as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Every booking of the named booking's request, first (lowest ref) first. */
async function requestParts(
  admin: ReturnType<typeof createAdminClient>,
  named: BookingRow,
): Promise<BookingRow[]> {
  const group = groupOf(named);
  if (!group) return [named];
  const { data } = await admin
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("facility_id", named.facility_id)
    .eq("details->bookingGroup->>id", group)
    .order("ref", { ascending: true });
  const parts = (data ?? []) as unknown as BookingRow[];
  return parts.length > 0 ? parts : [named];
}

function needsAddOnPrices(fees: readonly CustomFee[]): boolean {
  return fees.some(
    (fee) =>
      fee.isActive &&
      fee.autoApply === "addon_purchase" &&
      (fee.waivedAddOnIds?.length ?? 0) > 0,
  );
}

/** The request's rows, and what came before it for the same client. */
async function readFeeRows(
  admin: ReturnType<typeof createAdminClient>,
  parts: BookingRow[],
  withAddOnPrices: boolean,
): Promise<RequestFeeRows> {
  const first = parts[0];
  const { data: petRows } = await admin
    .from("booking_pets")
    .select("pet_id")
    .in(
      "booking_id",
      parts.map((part) => part.id),
    );
  const petIds = [
    ...new Set(
      ((petRows ?? []) as Array<{ pet_id: string }>).map((row) => row.pet_id),
    ),
  ];

  // BEFORE THE REQUEST: created earlier than its first booking. Its own
  // bookings were made together, with the same timestamp or a later one, so
  // they are never among them — and a booking made after it never is either.
  const since = parts.reduce(
    (earliest, part) =>
      part.created_at < earliest ? part.created_at : earliest,
    first.created_at,
  );
  const { data: earlier } = await admin
    .from("bookings")
    .select("id")
    .eq("client_id", first.client_id)
    .lt("created_at", since)
    .limit(1);

  const earlierPetIds = new Set<string>();
  if (petIds.length > 0) {
    const { data: carried } = await admin
      .from("booking_pets")
      .select("pet_id, booking:bookings!inner(client_id, created_at)")
      .in("pet_id", petIds)
      .eq("booking.client_id", first.client_id)
      .lt("booking.created_at", since);
    for (const row of (carried ?? []) as Array<{ pet_id: string }>) {
      earlierPetIds.add(row.pet_id);
    }
  }

  const { data: client } = await admin
    .from("clients")
    .select("status, details")
    .eq("id", first.client_id)
    .maybeSingle();

  // A waived add-on is worth its price at this location, as the form priced
  // it — read only when a fee waives any.
  let addOnPrice: (serviceId: string) => number | undefined = () => undefined;
  if (withAddOnPrices) {
    const lookup = bookableLookup(
      await pricedAddOnsFor(
        first.facility_id,
        first.service,
        first.location_id ?? null,
      ),
    );
    addOnPrice = (serviceId) => lookup.get(serviceId)?.price;
  }

  return {
    parts,
    petIds,
    earlierPetIds,
    hadEarlierBooking: (earlier ?? []).length > 0,
    client:
      (client as { status: string | null; details: unknown } | null) ?? null,
    extraServices: (first.details ?? {})["extraServices"],
    addOnPrice,
  };
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
