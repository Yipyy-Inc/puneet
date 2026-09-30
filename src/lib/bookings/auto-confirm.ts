import "server-only";

import {
  autoConfirmsService,
  bookingApprovalSchema,
  DEFAULT_BOOKING_APPROVAL,
} from "@/lib/settings/booking-approval";
import { priceCustomerBooking } from "@/lib/bookings/price-booking";
import {
  computeDepositAmount,
  depositConfigSchema,
  findApplicableDepositRule,
} from "@/lib/settings/deposits";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { assignKennelsOnConfirm } from "@/lib/boarding/assign-kennel-on-confirm";

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
//
// ── A DISCOUNT IS NOT CONFIRMED HERE ──────────────────────────────────────
//
// The price the server checks is the SERVICE's. A discount the customer was
// shown — several pets, several nights — came from their browser with the
// rest of the quote, and nothing here can work it out again. Until 2026-09-30
// a request carrying one was confirmed at the full price and the discount was
// dropped: the customer was billed more than they were told. Taking the
// discount from the request instead would let anyone give themselves one.
// So a request with a discount stays a request, on every one of its days, and
// staff approve it at the quote, which carries the discount
// (`quotedPrice` in request-decision.ts).
// ============================================================================

interface Promotable {
  id: string;
  facility_id: string;
  service: string | null;
  status: string;
  start_at: string | null;
  end_at: string | null;
  details: Record<string, unknown> | null;
  /** The branch, where the facility has more than one. */
  location_id: string | null;
  /** The request's own add-on lines, written when it was made. */
  add_ons_total: number | string | null;
}

/**
 * How many hours a booking runs, from its own timestamps.
 *
 * Daycare rates are chosen by the length of the day now, so the server needs
 * the same number the wizard used, or the two totals disagree and nothing
 * auto-confirms.
 */
function stayHours(
  startAt?: string | null,
  endAt?: string | null,
): number | undefined {
  if (!startAt || !endAt) return undefined;
  const a = Date.parse(startAt);
  const b = Date.parse(endAt);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return undefined;
  return (b - a) / 3_600_000;
}

function isoDay(value: string | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

/** The discount the customer was shown on this booking, or 0. */
function quotedDiscount(details: Record<string, unknown> | null): number {
  const quote = (details ?? {})["requestedQuote"] as
    | { discount?: unknown }
    | undefined;
  const discount = Number(quote?.discount ?? 0);
  return Number.isFinite(discount) && discount > 0 ? discount : 0;
}

/** The request a booking belongs to — its group, or itself. */
function requestOf(row: Pick<Promotable, "id" | "details">): string {
  const group = (row.details ?? {})["bookingGroup"] as
    | { id?: unknown }
    | undefined;
  return typeof group?.id === "string" && group.id ? group.id : row.id;
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
      .select(
        "id, facility_id, service, status, start_at, end_at, details, location_id, add_ons_total",
      )
      .in("id", bookingIds);

    const rows = (data ?? []) as unknown as Promotable[];
    // Only a fresh request is a candidate. Anything else was made by staff, or
    // has already moved on.
    const candidates = rows.filter(
      (row) => row.status === "request_submitted" && row.service,
    );
    if (candidates.length === 0) return 0;

    // A request with a discount on any day is left to staff, every day of it.
    // See the header.
    const discounted = new Set(
      candidates
        .filter((row) => quotedDiscount(row.details) > 0)
        .map(requestOf),
    );

    // ── WHICH ANIMAL EACH BOOKING IS FOR ──────────────────────────────
    //
    // A daycare rate may be offered to some species rather than all, so the
    // server has to know the same thing the wizard did or the two totals
    // disagree and nothing auto-confirms.
    //
    // ONE read for the batch, not one per booking. And only where every pet
    // on a booking is the same species: a dog and a cat on one booking have
    // no single answer, so it passes none and every rate stays a candidate —
    // the same thing an unknown species has always meant.
    const speciesByBooking = new Map<string, string | undefined>();
    // And WHICH pets, by ref: a boarding service's default add-ons are per
    // pet, and the server has to know how many there are to require them.
    const petRefsByBooking = new Map<string, number[]>();
    const { data: petRows } = await admin
      .from("booking_pets")
      .select("booking_id, pets!inner(species, ref)")
      .in(
        "booking_id",
        candidates.map((c) => c.id),
      );
    for (const row of (petRows ?? []) as unknown as Array<{
      booking_id: string;
      pets: { species: string | null; ref: number | string | null } | null;
    }>) {
      const ref = Number(row.pets?.ref);
      if (Number.isInteger(ref)) {
        petRefsByBooking.set(row.booking_id, [
          ...(petRefsByBooking.get(row.booking_id) ?? []),
          ref,
        ]);
      }
      const species = row.pets?.species?.trim();
      if (!species) continue;
      const seen = speciesByBooking.get(row.booking_id);
      if (seen === undefined && !speciesByBooking.has(row.booking_id)) {
        speciesByBooking.set(row.booking_id, species);
      } else if (seen && seen.toLowerCase() !== species.toLowerCase()) {
        speciesByBooking.set(row.booking_id, undefined);
      }
    }

    // One read per facility, not per booking: a multi-day request is many rows
    // of one facility.
    const approvals = new Map<string, ReturnType<typeof approvalOf>>();
    const approvalOf = (value: unknown) => {
      const parsed = bookingApprovalSchema.safeParse(value);
      return parsed.success ? parsed.data : DEFAULT_BOOKING_APPROVAL;
    };
    // The facility's deposit rules, read in the same pass.
    const deposits = new Map<
      string,
      ReturnType<typeof depositConfigSchema.parse>["rules"]
    >();
    for (const facilityId of new Set(candidates.map((c) => c.facility_id))) {
      const { data: rows } = await admin
        .from("facility_settings")
        .select("domain, value")
        .eq("facility_id", facilityId)
        .in("domain", ["booking_approval", "deposit_rules"]);

      const byDomain = new Map(
        ((rows ?? []) as Array<{ domain: string; value: unknown }>).map((r) => [
          r.domain,
          r.value,
        ]),
      );
      approvals.set(facilityId, approvalOf(byDomain.get("booking_approval")));

      // A facility that has never configured deposits asks for nothing, and a
      // stored value that no longer matches its schema is treated the same
      // way — never as a reason to invent a figure.
      const parsed = depositConfigSchema.safeParse(
        byDomain.get("deposit_rules"),
      );
      deposits.set(facilityId, parsed.success ? parsed.data.rules : []);
    }

    let confirmed = 0;
    for (const row of candidates) {
      const approval = approvals.get(row.facility_id);
      if (!approval || !autoConfirmsService(approval, row.service!)) continue;

      const quoted = quotedTotal(row.details);
      // No quote means the customer was shown nothing to agree with. That is
      // not a booking to confirm silently.
      if (quoted === null) continue;
      if (discounted.has(requestOf(row))) continue;

      // ── THE FACILITY'S DEPOSIT, RECORDED AND NOT CHARGED ────────────────
      //
      // A facility can set a deposit policy AND switch instant booking on, and
      // until now the two did not meet: the booking confirmed with the whole
      // balance owed and nothing said a deposit was due, so their own policy
      // was silently ignored for every online booking.
      //
      // It is RECORDED, never taken. Confirming a booking and charging a card
      // in the same breath — without the customer pressing pay — is how a
      // chargeback starts, and card-on-file capture wants its own flow with
      // its own consent. What this writes is a number the customer is then
      // ASKED for, through the pay link that already exists.
      const priced = await priceCustomerBooking({
        facilityId: row.facility_id,
        service: row.service!,
        startDate: isoDay(row.start_at),
        endDate: isoDay(row.end_at),
        bookingId: row.id,
        roomCategoryId:
          (row.details?.["roomCategoryId"] as string | undefined) ?? null,
        // WHICH boarding service the customer picked. Without it the re-price
        // falls back to the kennel class's own rate — right for a booking made
        // before the cutover, wrong for one made after, and a disagreement
        // stops the booking auto-confirming for a reason nobody can see. The
        // daycare line below says the same thing about the same trap.
        boardingServiceId:
          (row.details?.["boardingServiceId"] as string | undefined) ?? null,
        // Daycare rates are chosen by the length of the day, so the server
        // needs the same number the wizard used. start_at/end_at ARE that
        // number — the booking already carries it.
        hours: stayHours(row.start_at, row.end_at),
        species: speciesByBooking.get(row.id),
        // WHICH daycare service the customer picked, and WHERE. Without
        // these the re-price falls back to the pre-cutover rule — the
        // cheapest service covering the stay — and disagrees with the quote
        // the customer was shown, so nothing auto-confirms.
        daycareServiceId:
          (row.details?.["daycareServiceId"] as string | undefined) ?? null,
        // Boarding's add-ons: the lines the customer's form saved and the pets
        // they are on. Only the quantities are taken; prices are the
        // facility's own.
        extraServices: row.details?.["extraServices"],
        petRefs: petRefsByBooking.get(row.id) ?? [],
        locationId: row.location_id ?? null,
        quotedTotal: quoted,
      });
      if (!priced.ok) continue;

      // The deposit is of the service AND its own add-ons, as when both were
      // one figure: the add-ons are bill lines now (2026-09-30), already on
      // this booking, and `priced.total` is the service alone.
      const depositBase = priced.total + Number(row.add_ons_total ?? 0);
      const rule = findApplicableDepositRule(
        row.service!,
        depositBase,
        deposits.get(row.facility_id) ?? [],
      );
      const depositRequired = rule
        ? computeDepositAmount(rule, depositBase)
        : 0;

      const { error } = await admin
        .from("bookings")
        .update({
          status: "confirmed",
          base_price: priced.basePrice,
          total_cost: priced.total,
          // MERGED, not replaced: `details` already holds requestedQuote, and
          // overwriting it would lose the number this confirmation agreed with.
          ...(depositRequired > 0
            ? {
                details: {
                  ...(row.details ?? {}),
                  depositRequired,
                  depositRuleLabel: rule!.label,
                },
              }
            : {}),
        })
        .eq("id", row.id)
        // Belt and braces: only ever promote a row still sitting as a request,
        // so a race with staff deciding it cannot un-decide them.
        .eq("status", "request_submitted");
      if (!error) {
        confirmed += 1;
        // A confirmed boarding stay is given a kennel of the kind it was
        // priced for, as staff approval gives one — under the service role,
        // since the customer's session can place a dog nowhere. No kennel
        // free leaves it where confirmed requests always stood: on the
        // kennel board, to be placed by hand. See assign-kennel-on-confirm.ts.
        await assignKennelsOnConfirm(admin, [row.id], { serviceRole: true });
      }
    }
    return confirmed;
  } catch {
    // The booking exists and is a request. That is a safe place to stop.
    return 0;
  }
}
