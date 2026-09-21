import "server-only";

import { daycareRateForHours } from "@/lib/daycare-pricing";
import { isBuiltinService } from "@/lib/service-registry";
import { chargesTax } from "@/lib/payments/service-tax";
import { SETTING_DOMAINS } from "@/lib/settings/domains";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// RECORDING WHETHER A BOOKING'S SERVICE IS TAXED.
//
// A facility can now say a rate, a kennel class, a grooming service or a
// training program is not taxed (2026-09-21). `bookings.taxable` is where that
// answer is kept for the booking, and this is what puts it there.
//
// ── WHY IT IS RECORDED RATHER THAN LOOKED UP AT CHECKOUT ──────────────────
//
// Two reasons, and the second is the one that matters.
//
// The cheap one: a checkout would otherwise have to re-derive which of four
// services priced this stay, months later, from a rate card that has since
// been edited.
//
// The real one: a facility that turns tax OFF on a rate tomorrow would
// otherwise retroactively untax every unpaid booking already taken under it,
// including ones whose customer was quoted a figure with tax in it. Tax already
// charged is safe — `payments.tax` records what was collected — but tax still
// OWED would silently move. Recording the answer at creation pins it.
//
// ── IT ONLY WRITES A POSITIVE ANSWER ──────────────────────────────────────
//
// The column is `not null default true`, and this writes only what it can
// positively establish — exempt OR taxed. Anything it cannot resolve (a service
// it does not know, a rate that was deleted, no service role, a thrown query)
// is left exactly as it was, which at creation means the default: taxed, as
// every booking in the product was before the column existed.
//
// Both directions, because this also runs when staff EDIT a booking's service,
// and a stay moved from an exempt kennel class back to a taxed one must stop
// being exempt. See lib/payments/service-tax.ts.
//
// ── EACH SERVICE IS ASKED WHERE ITS PRICE ACTUALLY COMES FROM ─────────────
//
// Not where its editor is. Two of the five would have resolved nothing if this
// had trusted the obvious field:
//
//   * BOARDING — `details.roomCategoryId` is what the customer wizard sends,
//     and it is absent on every staff-made boarding booking in the database.
//     The class is reachable only through boarding_stays → facility_rooms.
//   * TRAINING — the Rates tab's programs look like the priced thing and are
//     not. `training_series.total_price` is what a training booking is charged,
//     and a series holds no reference to the program it was modelled on, so
//     the series is the only thing that can answer.
// ============================================================================

interface BookingRow {
  id: string;
  facility_id: string;
  service: string | null;
  start_at: string | null;
  end_at: string | null;
  details: Record<string, unknown> | null;
  training_series_session_id: string | null;
}

function hoursOf(startAt: string | null, endAt: string | null) {
  if (!startAt || !endAt) return undefined;
  const a = Date.parse(startAt);
  const b = Date.parse(endAt);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return undefined;
  return (b - a) / 3_600_000;
}

/**
 * Record whether each booking's service is taxed, where it can be established.
 *
 * Returns how many rows it wrote. Never throws: a booking left as it was is
 * the status quo, not a failure.
 */
export async function stampBookingTaxable(
  bookingIds: string[],
): Promise<number> {
  if (bookingIds.length === 0 || !hasServiceRoleKey()) return 0;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("bookings")
      .select(
        "id, facility_id, service, start_at, end_at, details, training_series_session_id",
      )
      .in("id", bookingIds);

    const rows = (data ?? []) as unknown as BookingRow[];
    if (rows.length === 0) return 0;

    // ── Which animal each booking is for ──────────────────────────────
    //
    // A daycare rate may be offered to some species rather than all, so the
    // rate that priced a booking cannot be identified without knowing it.
    // ONE read for the batch, and only where every pet on a booking is the
    // same species — the same rule auto-confirm follows, for the same reason.
    const speciesByBooking = new Map<string, string | undefined>();
    const { data: petRows } = await admin
      .from("booking_pets")
      .select("booking_id, pets!inner(species)")
      .in(
        "booking_id",
        rows.map((r) => r.id),
      );
    for (const row of (petRows ?? []) as unknown as Array<{
      booking_id: string;
      pets: { species: string | null } | null;
    }>) {
      const species = row.pets?.species?.trim();
      if (!species) continue;
      const seen = speciesByBooking.get(row.booking_id);
      if (seen === undefined && !speciesByBooking.has(row.booking_id)) {
        speciesByBooking.set(row.booking_id, species);
      } else if (seen && seen.toLowerCase() !== species.toLowerCase()) {
        speciesByBooking.set(row.booking_id, undefined);
      }
    }

    // The facility's settings documents, once per facility rather than once
    // per booking: a multi-night stay is many rows of one facility.
    const settingsByFacility = new Map<string, Map<string, unknown>>();
    for (const facilityId of new Set(rows.map((r) => r.facility_id))) {
      const { data: settingRows } = await admin
        .from("facility_settings")
        .select("domain, value")
        .eq("facility_id", facilityId)
        .in("domain", ["daycare_rates", "custom_services"]);
      settingsByFacility.set(
        facilityId,
        new Map(
          (
            (settingRows ?? []) as Array<{ domain: string; value: unknown }>
          ).map((r) => [r.domain, r.value]),
        ),
      );
    }

    const exempt: string[] = [];
    const taxed: string[] = [];
    for (const row of rows) {
      if (!row.service) continue;
      const settings = settingsByFacility.get(row.facility_id);
      const taxable = await serviceTaxable(admin, row, settings, {
        species: speciesByBooking.get(row.id),
      });
      // Only a POSITIVE answer is written, in either direction. `undefined`
      // leaves the row alone — at creation that means the column's own
      // default, which is taxed.
      if (taxable === false) exempt.push(row.id);
      else if (taxable === true) taxed.push(row.id);
    }

    // BOTH directions, and the second one is not symmetry for its own sake: a
    // booking moved from an exempt kennel class BACK to a taxed one would
    // otherwise keep the exemption forever, and the direction it fails in is
    // the one that costs the facility money at year end.
    let written = 0;
    for (const [value, ids] of [
      [false, exempt],
      [true, taxed],
    ] as const) {
      if (ids.length === 0) continue;
      const { error } = await admin
        .from("bookings")
        .update({ taxable: value })
        .in("id", ids)
        // Only the rows that would actually change, so an edit that moves
        // nothing does not touch `updated_at` on every booking it looked at.
        .neq("taxable", value);
      if (!error) written += ids.length;
    }
    return written;
  } catch {
    // Every booking stays taxed. That is a safe place to stop.
    return 0;
  }
}

/**
 * Whether one booking's service charges tax, or undefined when unknowable.
 *
 * Undefined and true are handled identically by the caller — both leave the
 * booking taxed — but they are kept apart so a reader can tell "the facility
 * said yes" from "nothing here could say".
 */
async function serviceTaxable(
  admin: ReturnType<typeof createAdminClient>,
  row: BookingRow,
  settings: Map<string, unknown> | undefined,
  context: { species?: string },
): Promise<boolean | undefined> {
  const service = row.service!;

  // ── A module the facility invented ────────────────────────────────────
  //
  // `pricing.taxable` has been in the custom-service wizard since it was
  // written, shown on the review panel, the detail drawer and the module's own
  // settings page — and read by nothing that takes money. This is the first
  // thing that acts on it.
  if (!isBuiltinService(service)) {
    const parsed = SETTING_DOMAINS.custom_services.schema.safeParse(
      settings?.get("custom_services"),
    );
    if (!parsed.success) return undefined;
    const modules = (parsed.data as { modules?: unknown[] }).modules ?? [];
    const found = modules.find(
      (m) => (m as { slug?: string }).slug === service,
    ) as { pricing?: { taxable?: boolean } } | undefined;
    if (!found) return undefined;
    return chargesTax(found.pricing);
  }

  if (service === "daycare") {
    const parsed = SETTING_DOMAINS.daycare_rates.schema.safeParse(
      settings?.get("daycare_rates"),
    );
    if (!parsed.success) return undefined;
    // The SAME function that priced the booking picks the rate, so the tax
    // answer can never belong to a different rate than the money did.
    const rate = daycareRateForHours(
      parsed.data.rates,
      hoursOf(row.start_at, row.end_at),
      context.species,
    );
    return rate ? chargesTax(rate) : undefined;
  }

  if (service === "boarding") {
    // Through the KENNEL, not through `details`. `details.roomCategoryId` is
    // what the customer wizard sends and it is absent on all 410 staff-made
    // boarding bookings in the database — the class a stay belongs to is
    // reachable only as boarding_stays → facility_rooms → room_categories.
    // Falling back to the detail key would have quietly resolved none of them.
    const { data: stay } = await admin
      .from("boarding_stays")
      .select("room_id")
      .eq("booking_id", row.id)
      .maybeSingle();
    const roomId = (stay as { room_id?: string | null } | null)?.room_id;

    let categoryId =
      typeof row.details?.["roomCategoryId"] === "string"
        ? (row.details["roomCategoryId"] as string)
        : undefined;

    if (roomId) {
      const { data: unit } = await admin
        .from("facility_rooms")
        .select("category_id")
        .eq("id", roomId)
        .maybeSingle();
      categoryId =
        (unit as { category_id?: string } | null)?.category_id ?? categoryId;
    }
    if (!categoryId) return undefined;

    const { data } = await admin
      .from("room_categories")
      .select("taxable")
      .eq("facility_id", row.facility_id)
      .eq("id", categoryId)
      .maybeSingle();
    const found = data as { taxable: boolean | null } | null;
    return found ? found.taxable !== false : undefined;
  }

  if (service === "grooming") {
    // `create_booking` has already written the appointment and resolved which
    // service it is, so this reads the database's own answer rather than
    // guessing from the request.
    const { data: appointment } = await admin
      .from("grooming_appointments")
      .select("service_id")
      .eq("booking_id", row.id)
      .maybeSingle();
    const serviceId = (appointment as { service_id?: string } | null)
      ?.service_id;
    if (!serviceId) return undefined;
    const { data } = await admin
      .from("grooming_services")
      .select("taxable")
      .eq("id", serviceId)
      .maybeSingle();
    const found = data as { taxable: boolean | null } | null;
    return found ? found.taxable !== false : undefined;
  }

  if (service === "training") {
    // ── THE SERIES, NOT THE PROGRAM ──────────────────────────────────
    //
    // The Rates tab's programs look like the priced thing and are not.
    // `training_series.total_price` is what a training booking is actually
    // charged, a series is created standalone, and `training_series` carries
    // no column pointing back at the program it was modelled on — so there is
    // nothing here to resolve a program by. Reading the series is the only
    // answer that can be right.
    const sessionId = row.training_series_session_id;
    if (!sessionId) return undefined;
    const { data } = await admin
      .from("training_series_sessions")
      .select("training_series!inner(taxable)")
      .eq("id", sessionId)
      .maybeSingle();
    const series = (
      data as { training_series?: { taxable: boolean | null } | null } | null
    )?.training_series;
    return series ? series.taxable !== false : undefined;
  }

  return undefined;
}
