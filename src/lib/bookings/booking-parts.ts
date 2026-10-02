import type { BookingPart, DaycareDateTime, NewBooking } from "@/types/booking";

export type { BookingPart };

// ============================================================================
// One request, several bookings.
//
// ── WHY A BOOKING IS SOMETIMES SEVERAL ─────────────────────────────────────
//
// The database holds ONE room per booking (`boarding_stays` is keyed on
// `booking_id`) and one attendance per booking (`daycare_attendance`, the
// same). The New Booking form let staff pick three daycare days, or put two
// dogs in two kennels, and then saved one booking: the first day, the first
// dog's kennel. The other days were a list in `details` that no board reads,
// and the other kennel was never held.
//
// So the form describes each booking it means — a PART — and the server writes
// them all or none (`create_bookings`, 20260911234642). A request with one part is
// sent as a plain booking, exactly as before.
//
// Pure, so the money arithmetic is tested rather than trusted: the parts of a
// quote must add back to the quote, to the cent.
// ============================================================================

export const MAX_BOOKING_PARTS = 100;

const toCents = (amount: number) => Math.round(amount * 100);

/**
 * Split `amount` across `weights`, to the cent, adding back exactly.
 *
 * Largest remainder: every share is floored to a cent and the cents left over
 * go to the shares that lost the most, so $100 over three days is 33.34,
 * 33.33, 33.33 — never 33.33 × 3 with a cent missing from the books. A set of
 * weights that are all zero splits evenly.
 */
export function splitMoney(amount: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = safe.reduce((s, w) => s + w, 0);
  const shares = total > 0 ? safe : safe.map(() => 1);
  const weightSum = shares.reduce((s, w) => s + w, 0);

  const cents = toCents(amount);
  const sign = cents < 0 ? -1 : 1;
  const whole = Math.abs(cents);
  const exact = shares.map((w) => (whole * w) / weightSum);
  const floored = exact.map((x) => Math.floor(x));
  let left = whole - floored.reduce((s, x) => s + x, 0);
  const order = exact
    .map((x, i) => ({ i, rest: x - Math.floor(x) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floored[i] += 1;
    left -= 1;
  }
  return floored.map((c) => (sign * c) / 100);
}

interface Money {
  basePrice: number;
  discount: number;
  totalCost: number;
}

function withMoney<T>(
  items: T[],
  money: Money,
  weights: number[],
): (T & Money)[] {
  const base = splitMoney(money.basePrice, weights);
  const discount = splitMoney(money.discount, weights);
  const total = splitMoney(money.totalCost, weights);
  return items.map((item, i) => ({
    ...item,
    basePrice: base[i],
    discount: discount[i],
    totalCost: total[i],
  }));
}

/**
 * Grooming: one appointment per pet, back to back on the groomer's table
 * (the client's mock, 2026-10-01 — "Bubu and Mango are groomed back-to-back ·
 * 3h 45m total"). Each pet keeps its own package, its own length — the groom,
 * matting and its add-ons — and its share of the money by its own price.
 */
export function groomingParts(input: {
  date: string;
  /** "HH:MM", when the first pet starts. */
  start: string;
  pets: ReadonlyArray<{
    petId: number;
    serviceType: string;
    minutes: number;
    price: number;
    matted: boolean;
  }>;
  money: Money;
}): BookingPart[] {
  const [h, m] = input.start.split(":").map(Number);
  let at = (h ?? 0) * 60 + (m ?? 0);
  const clock = (minutes: number) =>
    `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const slots = input.pets.map((pet) => {
    const from = at;
    at += Math.max(1, Math.round(pet.minutes));
    return {
      petIds: [pet.petId],
      startDate: input.date,
      endDate: input.date,
      checkInTime: clock(from),
      checkOutTime: clock(at),
      serviceType: pet.serviceType,
      ...(pet.matted ? { matted: true } : {}),
    };
  });
  return withMoney(
    slots,
    input.money,
    input.pets.map((pet) => pet.price),
  );
}

/** Daycare: one booking per day, every selected dog on each, equal shares. */
export function daycareParts(input: {
  dates: string[];
  dateTimes: DaycareDateTime[];
  petIds: number[];
  checkInTime: string;
  checkOutTime: string;
  money: Money;
}): BookingPart[] {
  const dates = [...new Set(input.dates)].sort();
  const days = dates.map((date) => {
    const times = input.dateTimes.find((d) => d.date === date);
    return {
      petIds: input.petIds,
      startDate: date,
      endDate: date,
      checkInTime: times?.checkInTime || input.checkInTime,
      checkOutTime: times?.checkOutTime || input.checkOutTime,
    };
  });
  return withMoney(
    days,
    input.money,
    days.map(() => 1),
  );
}

/**
 * Boarding: one booking per room, holding the dogs placed in it.
 *
 * A dog with no room yet rides in a part with no room — a stay need not name
 * one, kennels are routinely assigned on the board afterwards. The money is
 * shared by `weightOf(roomId, petIds)`, which the form answers with that
 * room's own nightly price, so a suite does not subsidise a standard run.
 */
export function boardingParts(input: {
  petIds: number[];
  roomAssignments: Array<{ petId: number; roomId: string }>;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  money: Money;
  weightOf: (roomId: string | undefined, petIds: number[]) => number;
  /**
   * Which pets are ONE room (2026-10-01). Default: the pets given the same
   * room or room type. The Room type step keys a pet on its own unless the
   * household shares, so two dogs in Suites are two suites.
   */
  unitOf?: (petId: number, roomId: string | undefined) => string;
  /** Each part's boarding service, when the pets' differ. */
  serviceOf?: (petIds: number[]) => string | undefined;
}): BookingPart[] {
  const byUnit = new Map<
    string,
    { roomId: string | undefined; petIds: number[] }
  >();
  for (const petId of input.petIds) {
    const roomId = input.roomAssignments.find((a) => a.petId === petId)?.roomId;
    const key = input.unitOf ? input.unitOf(petId, roomId) : (roomId ?? "");
    const unit = byUnit.get(key);
    if (unit) unit.petIds.push(petId);
    else byUnit.set(key, { roomId, petIds: [petId] });
  }
  const groups = [...byUnit.values()].map(({ roomId, petIds }) => {
    const serviceId = input.serviceOf?.(petIds);
    return {
      petIds,
      startDate: input.startDate,
      endDate: input.endDate,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      ...(roomId ? { unitAssignment: roomId } : {}),
      ...(serviceId ? { boardingServiceId: serviceId } : {}),
    };
  });
  const weights = groups.map((g) => input.weightOf(g.unitAssignment, g.petIds));
  // No weight at all (no prices yet) falls back to sharing by dog.
  const usable = weights.some((w) => w > 0)
    ? weights
    : groups.map((g) => g.petIds.length);
  return withMoney(groups, input.money, usable);
}

/**
 * A request expanded into the bookings it describes, for the server.
 *
 * No parts is one booking, unchanged. Each part keeps everything the request
 * says (the care plan, the add-ons, the notes) and replaces what differs. A
 * daycare part's day list is narrowed to its own day, so a booking never
 * claims days that belong to its siblings.
 */
export function expandBookingParts(
  input: NewBooking,
  group?: { id: string },
): NewBooking[] {
  const { parts, ...rest } = input;
  if (!parts || parts.length === 0) return [rest];

  return parts.map((part, index) => {
    const booking: NewBooking = {
      ...rest,
      petId: part.petIds.length === 1 ? part.petIds[0] : part.petIds,
      startDate: part.startDate,
      endDate: part.endDate,
      checkInTime: part.checkInTime ?? rest.checkInTime,
      checkOutTime: part.checkOutTime ?? rest.checkOutTime,
      basePrice: part.basePrice,
      discount: part.discount,
      totalCost: part.totalCost,
      unitAssignment: part.unitAssignment ?? rest.unitAssignment,
      boardingServiceId: part.boardingServiceId ?? rest.boardingServiceId,
      trainingSessionId: part.trainingSessionId ?? rest.trainingSessionId,
      serviceType: part.serviceType ?? rest.serviceType,
      groomingMatted: part.matted ?? rest.groomingMatted,
      // A kennel change is the move of ONE kennel's guests. Copied onto every
      // part it would move each room's dogs into the same kennel; the form
      // plans changes only for a stay in one kennel, which has no parts.
      kennelMoves: undefined,
    };
    if (rest.daycareSelectedDates) {
      booking.daycareSelectedDates = [part.startDate];
      booking.daycareDateTimes = rest.daycareDateTimes?.filter(
        (d) => d.date === part.startDate,
      );
    }
    if (group && parts.length > 1) {
      booking.bookingGroup = {
        id: group.id,
        part: index + 1,
        of: parts.length,
      };
    }
    return booking;
  });
}

/**
 * Where a deposit lands when one request made several bookings: in order,
 * each taking no more than it costs, so no booking reads as overpaid while a
 * sibling still owes. Whatever the bookings cannot hold is returned as `left`.
 */
export function allocateDeposit(
  amount: number,
  totals: number[],
): { shares: number[]; left: number } {
  let remaining = toCents(amount);
  const shares = totals.map((total) => {
    const take = Math.max(0, Math.min(remaining, toCents(total)));
    remaining -= take;
    return take / 100;
  });
  return { shares, left: remaining / 100 };
}
