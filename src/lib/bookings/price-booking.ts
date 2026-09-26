import "server-only";

import { SETTING_DOMAINS } from "@/lib/settings/domains";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { loadBoardingServices } from "@/lib/pricing/boarding-services-server";
import {
  resolveBoardingService,
  stayUnits,
} from "@/lib/pricing/boarding-service-choice";
import { loadDaycareServices } from "@/lib/pricing/daycare-services-server";
import { resolveDaycareService } from "@/lib/pricing/daycare-service-choice";
import { isBuiltinService } from "@/lib/service-registry";
import {
  addOnLinesFrom,
  computeAddOnsTotal,
  missingRequiredLine,
} from "@/lib/pricing/add-on-lines";
import {
  defaultAddOnLines,
  type BoardingDefaultAddOn,
} from "@/lib/pricing/boarding-default-addons";
import { serviceAddOnsConfigSchema } from "@/lib/settings/addons";

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
  /**
   * A default add-on the booking's service attaches was not on it — taken
   * off, or a request made before the service had it. Staff look instead.
   */
  | "missing_add_on"
  /**
   * A class-priced stay that moves kennels part-way: two classes on
   * different nights, and a quote made for one. Staff price it.
   */
  | "split_stay"
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
  /**
   * Boarding: WHICH service the booking is for — `details.boardingServiceId`.
   *
   * The daycare field's twin, and for the same reason: the facility chose, and
   * the wizard, this re-price, auto-confirm and the tax stamp must all land on
   * the same row. Absent is the pre-cutover path, where the kennel class still
   * carries the rate.
   */
  boardingServiceId?: string | null;
  /**
   * Boarding: the room category the customer chose.
   *
   * ── THIS IS WRITTEN BY NOTHING, AND IT NEVER WAS ──────────────────────
   *
   * Measured 2026-09-24: no file under `src/app` or `src/components` writes
   * `details.roomCategoryId`, so this arrived undefined on every request and
   * `priceBoarding` refused with `no_rate` before reading a single rate. Every
   * customer boarding booking has therefore failed to auto-confirm since the
   * path was written, silently, with nothing in the logs — the facility just
   * saw requests that never turned into bookings.
   *
   * Kept as an OVERRIDE rather than deleted: it costs nothing, it is the
   * honest shape for a caller that does know the class, and the class is now
   * read from the kennel the stay actually occupies when this is absent —
   * which is what `booking-service-tax.ts` already did and the reason its
   * comment says the detail key resolved none of the 410 staff bookings.
   */
  roomCategoryId?: string | null;
  /**
   * Boarding: the add-on lines the booking carries (`details.extraServices`),
   * as the customer's form saved them. Untrusted — read by `addOnLinesFrom` —
   * and only the QUANTITIES are taken: every price comes from the facility's
   * own catalogue.
   */
  extraServices?: unknown;
  /** Boarding: the pets on the booking, by ref — for per-pet defaults. */
  petRefs?: readonly number[];
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

/**
 * The kennel classes a booking actually occupies, and how many DISTINCT ones.
 *
 * Through `boarding_stays`, not through `details`: the class a stay belongs to
 * is reachable only as boarding_stays → facility_rooms → room_categories, and
 * the detail key this used to read is written by nothing (see
 * `PriceRequest.roomCategoryId`). `booking-service-tax.ts` already resolves the
 * class this way and says so; this now agrees with it.
 *
 * NO STAY YET is a real state, not an error: a customer's request is priced
 * before staff put the pet anywhere. It returns no classes and one lodging,
 * which is what the wizard quotes for an unassigned stay.
 */
async function boardingKennels(bookingId: string | undefined): Promise<{
  categoryIds: string[];
  lodgings: number;
  /** The booking moves kennels part-way: more than one room, in sequence. */
  moves: boolean;
}> {
  if (!bookingId) return { categoryIds: [], lodgings: 1, moves: false };

  const admin = createAdminClient();
  const { data: stays } = await admin
    .from("boarding_stays")
    .select("room_id")
    .eq("booking_id", bookingId);

  const roomIds = [
    ...new Set(
      ((stays ?? []) as Array<{ room_id: string | null }>)
        .map((s) => s.room_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (roomIds.length === 0) {
    return { categoryIds: [], lodgings: 1, moves: false };
  }

  const { data: units } = await admin
    .from("facility_rooms")
    .select("id, category_id")
    .in("id", roomIds);

  const byRoom = new Map(
    ((units ?? []) as Array<{ id: string; category_id: string | null }>).map(
      (u) => [u.id, u.category_id],
    ),
  );
  const categoryIds = roomIds
    .map((id) => byRoom.get(id))
    .filter((id): id is string => Boolean(id));

  // ONE LODGING A NIGHT. A booking's stays never overlap — the database
  // refuses it (`boarding_stays_segments_do_not_overlap`) — so several rooms
  // are a guest MOVING between them, not two kennels held at once. Counting
  // distinct rooms here would bill a moved guest for both on every night.
  return { categoryIds, lodgings: 1, moves: roomIds.length > 1 };
}

/**
 * What a boarding stay costs: the SERVICE the booking names, else the class.
 *
 * ── THE SERVICE IS TRIED FIRST, AND IT IS THE ONLY NEW PATH ───────────────
 *
 * Phase 5 separated the boarding service from the lodging type, and Phase 6 is
 * where that reaches the money. A booking carrying `boardingServiceId` prices
 * from the menu item the facility chose, at this branch's price, per night or
 * per day as the service says.
 *
 * ── AND THE CLASS RATE IS NOT A DEGRADED FALLBACK ─────────────────────────
 *
 * Every boarding booking made before this commit carries no service id and was
 * sold at its kennel class's nightly rate. That rate is still on
 * `room_categories` and still what those bookings were sold at, so re-pricing
 * them through a service — even the one the Phase 5 migration derived from
 * that very class — would re-price them at whatever the facility has edited it
 * to since. The fallback is the correct answer for an old booking, not a
 * consolation prize.
 */
async function priceBoarding(input: PriceRequest): Promise<ServerQuote> {
  if (!input.startDate || !input.endDate) {
    return { ok: false, reason: "bad_dates" };
  }
  const nights = daysBetween(input.startDate, input.endDate);
  if (!Number.isFinite(nights) || nights < 1) {
    return { ok: false, reason: "bad_dates" };
  }

  const { categoryIds, lodgings, moves } = await boardingKennels(
    input.bookingId,
  );

  // ── THE SERVICE THE BOOKING NAMES ────────────────────────────────────────
  if (input.boardingServiceId) {
    const services = await loadBoardingServices(
      input.facilityId,
      input.locationId ?? null,
    );
    const chosen = resolveBoardingService(services, {
      serviceId: input.boardingServiceId,
    });
    // A named service that cannot be found is NOT quietly re-priced from the
    // class: the customer was quoted that service, and a number from another
    // row is a number they were never shown.
    if (!chosen) return { ok: false, reason: "no_rate" };

    const rate = Number(chosen.price);
    if (!Number.isFinite(rate) || rate <= 0) {
      return { ok: false, reason: "no_rate" };
    }
    const total = rate * lodgings * stayUnits(chosen.unit, nights);
    return withAddOns(input, total, chosen.defaultAddOns, nights);
  }

  // ── THE PRE-CUTOVER PATH: the class the stay is actually in ─────────────
  //
  // A stay that moves kennels is in two classes on different nights, and a
  // class-priced quote was made for one of them. Pricing it here would be a
  // number nobody was shown, so it is left for staff.
  if (moves) return { ok: false, reason: "split_stay" };
  const classIds =
    categoryIds.length > 0
      ? categoryIds
      : input.roomCategoryId
        ? [input.roomCategoryId]
        : [];
  if (classIds.length === 0) return { ok: false, reason: "no_rate" };

  const admin = createAdminClient();
  const uniqueIds = [...new Set(classIds)];
  const { data } = await admin
    .from("room_categories")
    .select("id, default_base_price")
    .eq("facility_id", input.facilityId)
    .in("id", uniqueIds);

  const priceById = new Map(
    (
      (data ?? []) as Array<{
        id: string;
        default_base_price: number | string | null;
      }>
    ).map((r) => [
      r.id,
      r.default_base_price === null ? null : Number(r.default_base_price),
    ]),
  );

  // ── THE BRANCH'S OWN NIGHTLY RATE, WHICH THE WIZARD ALREADY APPLIES ─────
  //
  // `classRate` in `boarding-pricing.ts` resolves `locationPricing` before
  // `defaultBasePrice`, so a multi-branch facility is QUOTED the branch rate.
  // Re-pricing against the facility-wide one here would disagree by exactly
  // the override and turn every such booking into `quote_mismatch` — a
  // silent refusal, the same failure mode as the `roomCategoryId` defect this
  // function was just rescued from. Same resolution order, both sides.
  if (input.locationId) {
    const { data: branch } = await admin
      .from("room_category_location_prices")
      .select("category_id, price")
      .eq("location_id", input.locationId)
      .in("category_id", uniqueIds);

    for (const row of (branch ?? []) as Array<{
      category_id: string;
      price: number | string | null;
    }>) {
      if (row.price === null) continue;
      priceById.set(row.category_id, Number(row.price));
    }
  }

  let nightly = 0;
  for (const id of classIds) {
    const rate = priceById.get(id);
    // A class with no price is the gap the wizard already refuses to invent
    // over; the server refuses too rather than guessing one.
    if (
      rate === undefined ||
      rate === null ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return { ok: false, reason: "no_rate" };
    }
    nightly += rate;
  }

  const total = nightly * nights;
  return withAddOns(input, total, [], nights);
}

/**
 * The stay's price plus its add-ons, as the wizard adds them.
 *
 * Until 2026-09-25 the server priced boarding's BASE only, so any add-on on a
 * customer's request made its quote disagree and the booking stayed a
 * request — including, once services could attach them, the add-ons the
 * service itself insists on. The lines are merged and totalled by the SAME
 * functions the wizard uses (`lib/pricing/add-on-lines.ts`), from the
 * facility's catalogue at its own prices, and a booking missing one of its
 * service's defaults is not confirmed at all.
 */
async function withAddOns(
  input: PriceRequest,
  base: number,
  defaults: readonly BoardingDefaultAddOn[],
  nights: number,
): Promise<ServerQuote> {
  const lines = addOnLinesFrom(input.extraServices);
  if (lines.length === 0 && defaults.length === 0) {
    return { ok: true, basePrice: base, total: base };
  }
  // A stored value that no longer parses is no catalogue at all — exactly
  // what `settingsFromRows` hands the wizard, so both sides price nothing.
  const parsed = serviceAddOnsConfigSchema.safeParse(
    await settingValue(input.facilityId, "service_addons"),
  );
  const catalogue = parsed.success
    ? parsed.data.addOns.filter((addOn) => addOn.isActive)
    : [];
  const required = defaultAddOnLines({
    defaults,
    nights,
    petIds: input.petRefs ?? [],
    catalogue,
  });
  if (missingRequiredLine(lines, required)) {
    return { ok: false, reason: "missing_add_on" };
  }
  const addOns = computeAddOnsTotal(
    lines,
    new Map(catalogue.map((addOn) => [addOn.id, addOn])),
  );
  return { ok: true, basePrice: base, total: base + addOns };
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
