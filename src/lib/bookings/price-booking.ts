import "server-only";

import { daycareDayRate } from "@/lib/daycare-pricing";
import { SETTING_DOMAINS } from "@/lib/settings/domains";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
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
// Grooming and training return `cannot_price` deliberately. Grooming's number
// comes from `resolveEffectivePricing` — size, coat, breed, groomer tier, and
// per-pet overrides — and training's from a series enrolment. Re-deriving
// either here is where a second implementation would start, and the first bug
// it would cause is a customer charged something other than what they saw. A
// facility can still switch them on; the booking simply arrives as a request,
// which is what it does today.
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
  service: string;
  /** ISO days. */
  startDate?: string;
  endDate?: string;
  /** Daycare: the days actually chosen, when the wizard sent them. */
  daycareDates?: string[];
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

/** Days × the facility's own day rate. */
async function priceDaycare(input: PriceRequest): Promise<ServerQuote> {
  const parsed = SETTING_DOMAINS.daycare_rates.schema.safeParse(
    await settingValue(input.facilityId, "daycare_rates"),
  );
  const rates = parsed.success ? parsed.data.rates : [];

  const perDay = daycareDayRate({ branchPrice: null, rates, half: false });
  if (perDay === null) return { ok: false, reason: "no_rate" };

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
        : { ok: false, reason: "cannot_price" };

  if (!priced.ok) return priced;

  // The agreement check. See the header: this is the whole safety property.
  if (Math.abs(priced.total - input.quotedTotal) > CENT) {
    return { ok: false, reason: "quote_mismatch" };
  }
  return priced;
}
