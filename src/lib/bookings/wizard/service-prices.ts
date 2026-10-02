// ============================================================================
// What each service card on the wizard's Service step quotes (the client's
// mock): "From $70 / night", "$38 full day · $25 half day", "From $40",
// "From $95" — from the menus the Details screens then book from, so a card
// never quotes a price the next screen does not offer. (The cards read the
// old lodging-type base prices, daycare rates and class prices until
// 2026-10-02: boarding quoted nothing to a customer, and training quoted a
// class where the cheapest offer was a $95 lesson.)
// ============================================================================

/** At most this many hours, a daycare service is a half day. */
export const HALF_DAY_HOURS = 6;

export interface ServiceCardPrices {
  boarding: { amount: number; unit: "night" | "day" } | null;
  daycare: { full: number | null; half: number | null };
  grooming: number | null;
  training: number | null;
}

const isOn = (item: { isActive?: boolean }) => item.isActive !== false;
const priced = (amount: unknown): amount is number =>
  typeof amount === "number" && Number.isFinite(amount) && amount >= 0;

function cheapest(amounts: readonly number[]): number | null {
  return amounts.length > 0 ? Math.min(...amounts) : null;
}

export function serviceCardPrices(menus: {
  boarding: ReadonlyArray<{
    price: number;
    unit: "night" | "day";
    isActive?: boolean;
  }>;
  daycare: ReadonlyArray<{
    price: number;
    maxDurationHours: number | null;
    isActive?: boolean;
  }>;
  grooming: ReadonlyArray<{ basePrice: number; isActive?: boolean }>;
  programs: ReadonlyArray<{ price: number; isActive?: boolean }>;
}): ServiceCardPrices {
  const stays = menus.boarding.filter((s) => isOn(s) && priced(s.price));
  const lowest = stays.reduce<(typeof stays)[number] | null>(
    (best, s) => (!best || s.price < best.price ? s : best),
    null,
  );
  const days = menus.daycare.filter((s) => isOn(s) && priced(s.price));
  const isHalf = (s: (typeof days)[number]) =>
    s.maxDurationHours != null && s.maxDurationHours <= HALF_DAY_HOURS;
  return {
    boarding: lowest ? { amount: lowest.price, unit: lowest.unit } : null,
    daycare: {
      full: cheapest(days.filter((s) => !isHalf(s)).map((s) => s.price)),
      half: cheapest(days.filter(isHalf).map((s) => s.price)),
    },
    grooming: cheapest(
      menus.grooming
        .filter((g) => isOn(g) && priced(g.basePrice))
        .map((g) => g.basePrice),
    ),
    training: cheapest(
      menus.programs
        .filter((p) => isOn(p) && priced(p.price) && p.price > 0)
        .map((p) => p.price),
    ),
  };
}
