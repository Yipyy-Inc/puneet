import "server-only";

import { SETTING_DOMAINS } from "@/lib/settings/domains";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { loadDaycareServices } from "@/lib/pricing/daycare-services-server";
import { resolveDaycareService } from "@/lib/pricing/daycare-service-choice";
import { isBuiltinService } from "@/lib/service-registry";

// ============================================================================
// What a customer's booking costs, decided by the SERVER.
//
// ── WHY THIS HAS TO EXIST ─────────────────────────────────────────────────
//
// `private.enforce_booking_integrity` zeroes the price on every booking a
// customer inserts and files it as a request, because the number came from
// their browser and anyone can post a zero. That is the right default and it
// stays. But a facility that wants daycare confirmed on the spot needs SOME
// price, and it cannot be theirs.
//
// So this reads the facility's own rates and works the price out again, from
// the same functions the wizard uses — `daycareDayRate`, the room category's
// nightly rate, the module's own price. Not a second implementation of the
// rules: the same ones, called with data loaded here instead of fetched there.
//
// ── IT AGREES OR IT REFUSES ───────────────────────────────────────────────
//
// The customer was shown a number before they pressed the button, and the
// trigger keeps it in `details.requestedQuote`. This compares against it and
// confirms ONLY when the two agree to the cent.
//
// A mismatch is not a rounding argument to win — it means the facility's rates
// moved between the quote and the press, or the wizard priced something this
// does not know about. Either way the safe answer is the same: make it a
// request, let staff look. Charging somebody a number they were never shown is
// worse than making them wait.
//
// ── WHAT IT WILL NOT PRICE ────────────────────────────────────────────────
//
// TRAINING returns `cannot_price`. Its number comes from a series enrolment,
// which is a different object from the booking and is not created until staff
// place the pet in a series. There is nothing here to read back.
//
// GROOMING no longer does, and the reason is worth reading before changing it.
// The objection was that re-deriving grooming's price would be a SECOND
// implementation of `resolveEffectivePricing` — size, coat, breed, groomer
// tier, per-pet overrides — and the first bug would be charging somebody a
// number they never saw. That objection still stands, so this does not
// re-derive anything.
//
// `public.create_booking` ALREADY resolves the service, reads the pet's weight,
// picks the size tier from `grooming_config.pet_size_tiers` and looks up
// `grooming_service_size_prices` — and then writes `case when v_is_staff then
// v_price else 0 end`, so for a customer the number it worked out is thrown
// away while the SIZE IT CHOSE is kept on the appointment. This reads that
// size back and asks the facility what it charges for it. One implementation,
// the database's, consulted twice.
//
// It deliberately knows LESS than the wizard: no coat, no breed, no groomer
// tier, no per-pet override. A facility using any of those gets a number that
// disagrees with the customer's quote, and the mismatch check below turns the
// booking into a request — which is exactly what it does today. So this can
// only ever confirm bookings where the simple rule and the rich one agree.
// ============================================================================

export type ServerQuote =
  | { ok: true; basePrice: number; total: number }
  | { ok: false; reason: ServerQuoteRefusal };

export type ServerQuoteRefusal =
  /** No service role, so the rates cannot be read at all. */
  | "no_admin_client"
  /** This service's price is not derivable here — see the header. */
  | "cannot_price"
  /** The facility has set no rate for what was asked for. */
  | "no_rate"
  /** The dates make no sense as a stay. */
  | "bad_dates"
  /** The server's price and the customer's quote disagree. */
  | "quote_mismatch";

export interface PriceRequest {
  facilityId: string;
  /** Needed by grooming, which reads back the appointment row. */
  bookingId?: string;
  service: string;
  /** ISO days. */
  startDate?: string;
  endDate?: string;
  /** Daycare: the days actually chosen, when the wizard sent them. */
  daycareDates?: string[];
  /**
   * Daycare: how long the stay runs, in hours.
   *
   * The rate card is chosen by the length of the day now, not by a label, so
   * the SERVER has to know it too — a quote the wizard worked out from the
   * booked hours and a server total worked out from the cheapest rate would
   * disagree, and a disagreement here does not overcharge anybody, it just
   * stops every customer booking auto-confirming for a reason nobody can see.
   */
  hours?: number;
  /**
   * Daycare: WHICH service the booking is for.
   *
   * The one field that makes this agree with the wizard. Without it the
   * server falls back to the pre-cutover rule — the cheapest service whose
   * ceiling covers the stay — which is right for an old booking and wrong
   * for a new one, because the facility chose.
   */
  daycareServiceId?: string | null;
  /**
   * The branch the booking belongs to, when it has one.
   *
   * A branch's own price REPLACES the facility's for that branch, so
   * quoting one and re-pricing the other is a `quote_mismatch` that stops
   * the booking auto-confirming for a reason nobody can see.
   */
  locationId?: string | null;
  /**
   * Daycare: the animal being booked, when every pet on it is one species.
   *
   * A rate may be offered to some species rather than all. Undefined leaves
   * every rate a candidate — the same answer as a rate that names none.
   */
  species?: string;
  /** Boarding: the room category the customer chose. */
  roomCategoryId?: string | null;
  /** What the customer was shown. The quote this must agree with. */
  quotedTotal: number;
}

const CENT = 0.005;

function daysBetween(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

async function settingValue(
  facilityId: string,
  domain: keyof typeof SETTING_DOMAINS,
): Promise<unknown> {
  const { data } = await createAdminClient()
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", domain)
    .maybeSingle();
  return (data as { value?: unknown } | null)?.value;
}

/** Nights × the nightly rate of the class the customer chose. */
async function priceBoarding(input: PriceRequest): Promise<ServerQuote> {
  if (!input.startDate || !input.endDate) {
    return { ok: false, reason: "bad_dates" };
  }
  const nights = daysBetween(input.startDate, input.endDate);
  if (!Number.isFinite(nights) || nights < 1) {
    return { ok: false, reason: "bad_dates" };
  }
  if (!input.roomCategoryId) return { ok: false, reason: "no_rate" };

  const { data } = await createAdminClient()
    .from("room_categories")
    .select("default_base_price")
    .eq("facility_id", input.facilityId)
    .eq("id", input.roomCategoryId)
    .maybeSingle();

  const rate = (data as { default_base_price: number | string | null } | null)
    ?.default_base_price;
  const nightly = rate === null || rate === undefined ? null : Number(rate);
  // A class with no price is the gap the wizard already refuses to invent
  // over; the server refuses too rather than guessing one.
  if (nightly === null || !Number.isFinite(nightly) || nightly <= 0) {
    return { ok: false, reason: "no_rate" };
  }

  const total = nightly * nights;
  return { ok: true, basePrice: total, total };
}

/** Days × the price of the service the booking names. */
async function priceDaycare(input: PriceRequest): Promise<ServerQuote> {
  // THE SAME ROW THE WIZARD PRICED FROM, resolved by the id the booking
  // carries. A booking made before the cutover has no id and falls back to
  // the old rule, which is what it was sold at.
  const services = await loadDaycareServices(
    input.facilityId,
    input.locationId ?? null,
  );
  const chosen = resolveDaycareService(services, {
    serviceId: input.daycareServiceId,
    hours: input.hours,
    species: input.species,
  });
  if (!chosen) return { ok: false, reason: "no_rate" };

  // The branch's own price where it set one — the mapper already resolved it
  // for `locationId`. This is why the customer path must pass the branch:
  // quoting the facility price and re-pricing the branch one is a mismatch.
  const perDay = chosen.price;

  const days = input.daycareDates?.length
    ? input.daycareDates.length
    : input.startDate && input.endDate
      ? Math.max(1, daysBetween(input.startDate, input.endDate) || 1)
      : 1;
  if (!Number.isFinite(days) || days < 1) {
    return { ok: false, reason: "bad_dates" };
  }

  const total = perDay * days;
  return { ok: true, basePrice: total, total };
}

/** A custom module carries its own price, set by the facility. */
async function priceCustomModule(input: PriceRequest): Promise<ServerQuote> {
  const parsed = SETTING_DOMAINS.custom_services.schema.safeParse(
    await settingValue(input.facilityId, "custom_services"),
  );
  if (!parsed.success) return { ok: false, reason: "no_rate" };

  const modules = (parsed.data as { modules?: unknown[] }).modules ?? [];
  const found = modules.find(
    (m) => (m as { slug?: string }).slug === input.service,
  ) as { pricing?: { basePrice?: number } } | undefined;

  const price = found?.pricing?.basePrice;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "no_rate" };
  }
  return { ok: true, basePrice: price, total: price };
}

/**
 * What the facility charges for the size the DATABASE already picked.
 *
 * See the header. This reads `grooming_appointments` — written by
 * create_booking, which resolved the service and the size tier from the pet's
 * weight — and then asks `grooming_service_size_prices` for that pairing,
 * falling back to the service's own base price when the facility prices one
 * size for everybody. Add-ons are looked up the same way: the appointment
 * records WHICH add-ons, and the facility's own row says what each costs.
 */
async function priceGrooming(input: PriceRequest): Promise<ServerQuote> {
  if (!input.bookingId) return { ok: false, reason: "cannot_price" };
  const admin = createAdminClient();

  const { data: appointment } = await admin
    .from("grooming_appointments")
    .select("service_id, size_label")
    .eq("booking_id", input.bookingId)
    .maybeSingle();

  const serviceId = (appointment as { service_id?: string } | null)?.service_id;
  if (!serviceId) return { ok: false, reason: "cannot_price" };
  const size = (appointment as { size_label?: string | null } | null)
    ?.size_label;

  const { data: service } = await admin
    .from("grooming_services")
    .select("base_price")
    .eq("id", serviceId)
    .maybeSingle();

  let price = Number(
    (service as { base_price?: number | string | null } | null)?.base_price ??
      NaN,
  );

  if (size) {
    const { data: sized } = await admin
      .from("grooming_service_size_prices")
      .select("price")
      .eq("service_id", serviceId)
      .eq("size_label", size)
      .maybeSingle();
    const sizedPrice = Number(
      (sized as { price?: number | string | null } | null)?.price ?? NaN,
    );
    // A size with its own price wins, exactly as create_booking has it.
    if (Number.isFinite(sizedPrice)) price = sizedPrice;
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "no_rate" };
  }

  // Add-ons: the appointment says which, the catalogue says what they cost.
  // The stored `price` on the appointment's own add-on rows is zeroed for a
  // customer by the same branch that zeroes the service, so it is not read.
  const { data: chosen } = await admin
    .from("grooming_appointment_add_ons")
    .select("add_on_id")
    .eq("booking_id", input.bookingId);

  const addOnIds = ((chosen ?? []) as Array<{ add_on_id: string | null }>)
    .map((row) => row.add_on_id)
    .filter((id): id is string => Boolean(id));

  let addOns = 0;
  if (addOnIds.length > 0) {
    const { data: catalogue } = await admin
      .from("grooming_add_ons")
      .select("id, price")
      .in("id", addOnIds);
    const byId = new Map(
      ((catalogue ?? []) as Array<{ id: string; price: number | string }>).map(
        (row) => [row.id, Number(row.price)],
      ),
    );
    for (const id of addOnIds) {
      const each = byId.get(id);
      // An add-on the catalogue no longer holds cannot be priced, and
      // confirming without it would undercharge the facility.
      if (each === undefined || !Number.isFinite(each)) {
        return { ok: false, reason: "no_rate" };
      }
      addOns += each;
    }
  }

  const total = price + addOns;
  return { ok: true, basePrice: total, total };
}

/**
 * The price the SERVER is willing to confirm, or why it will not.
 *
 * A refusal is never an error to show a customer — the caller turns it into a
 * request, which is what would have happened anyway.
 */
export async function priceCustomerBooking(
  input: PriceRequest,
): Promise<ServerQuote> {
  if (!hasServiceRoleKey()) return { ok: false, reason: "no_admin_client" };

  const priced: ServerQuote = !isBuiltinService(input.service)
    ? await priceCustomModule(input)
    : input.service === "boarding"
      ? await priceBoarding(input)
      : input.service === "daycare"
        ? await priceDaycare(input)
        : input.service === "grooming"
          ? await priceGrooming(input)
          : { ok: false, reason: "cannot_price" };

  if (!priced.ok) return priced;

  // The agreement check. See the header: this is the whole safety property.
  if (Math.abs(priced.total - input.quotedTotal) > CENT) {
    return { ok: false, reason: "quote_mismatch" };
  }
  return priced;
}
