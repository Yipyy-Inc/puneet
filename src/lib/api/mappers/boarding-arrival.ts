import { firstStay, stayForNight } from "@/lib/boarding/stay-segments";

// ============================================================================
// A boarding guest as the arrivals board needs one.
//
// ── WHY A NEW SHAPE AND NOT `BoardingGuest` ───────────────────────────────
//
// The daycare mapper returns `DaycareCheckIn` because every daycare screen
// already renders that type, so producing anything else would have meant
// rewriting them. `BoardingGuest` is not that: it is a 40-field fixture object
// carrying feeding times, medication schedules, heat-cycle notes, a peak
// surcharge and an emergency vet contact — none of which is stored anywhere
// yet. Filling it would mean inventing thirty values to deliver eight, and
// every invented one reads as a fact on screen.
//
// So the board gets exactly what a person standing at the door needs, and the
// fields it cannot answer are absent rather than defaulted.
// ============================================================================

export type BoardingArrivalStatus =
  | "scheduled"
  | "checked-in"
  | "checked-out"
  | "released";

export interface BoardingArrival {
  /** The BOOKING's ref, which is what every write here takes. */
  id: string;
  /**
   * The first pet's ref.
   *
   * The dashboard card keys its photo, its pet link and its loyalty lookup on a
   * single numeric pet id, so the multi-pet `petNames` above is not enough for
   * it. 0 when the booking somehow has no pet — a state the card renders as the
   * generic paw rather than a broken link.
   */
  petId: number;
  petNames: string[];
  petBreed: string;
  petType: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  /** null when no kennel has been assigned — and then check-in is refused. */
  roomId: string | null;
  roomName: string | null;
  /** When they are due, from the booking. */
  scheduledArrival: string;
  scheduledDeparture: string;
  /** When they actually turned up. Null until somebody presses the button. */
  checkedInAt: string | null;
  checkedOutAt: string | null;
  status: BoardingArrivalStatus;
  /**
   * The booking's money.
   *
   * `amountDue` is the price plus anything added at the counter
   * (20260806820000) and `amountPaid` is the sum of the ledger — both derived
   * columns, neither writable. Carried here so the pickup till charges the
   * BALANCE instead of a figure a screen worked out from the nightly rate; that
   * is how three screens end up charging three different numbers.
   */
  totalCost: number;
  amountDue: number;
  amountPaid: number;
  /**
   * What was added at the counter, and whether the SERVICE is taxed.
   *
   * Carried so a till away from the booking page applies the same tax: a
   * facility can mark a service tax-free (2026-09-21). Absent means taxed —
   * lib/payments/service-tax.ts.
   */
  extrasTotal?: number;
  taxable?: boolean;
  nights: number;
  isArrivingToday: boolean;
  isDepartingToday: boolean;
  /**
   * On site past the booked departure.
   *
   * A guest nobody collected is the single thing an arrivals board exists to
   * surface, and it is the state the old fixture board could never reach: its
   * dates were static, so nothing ever became late.
   */
  isOverdue: boolean;
}

export interface BoardingStayJoin {
  room_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  status: string;
  released_at: string | null;
  /** Its place in the booking, from 1; presence is stamped on 1 only. */
  segment_order: number | null;
  occupies: unknown;
  // `facility_rooms`, not `boarding_rooms`: 20260806660000 repointed the stay
  // at the facility's own room table so the Rooms page and the kennel board
  // describe one kennel the same way.
  facility_rooms: { legacy_id: string | null; name: string } | null;
}

export interface BoardingArrivalRow {
  id: string;
  ref: number;
  start_at: string;
  end_at: string;
  status: string;
  total_cost: number | string;
  amount_due: number | string | null;
  extras_total: number | string | null;
  taxable: boolean | null;
  amount_paid: number | string | null;
  clients: { ref: number; name: string; phone: string | null } | null;
  booking_pets:
    | {
        pets: {
          ref: number;
          name: string;
          breed: string | null;
          species: string;
        } | null;
      }[]
    | null;
  /**
   * A LIST once a booking can move kennels; one object before that — read
   * through `firstStay` and `stayForNight`, which take either.
   */
  boarding_stays: BoardingStayJoin | BoardingStayJoin[] | null;
}

export const BOARDING_ARRIVAL_SELECT = `
  id, ref, start_at, end_at, status,
  total_cost, amount_due, amount_paid, extras_total, taxable,
  clients ( ref, name, phone ),
  booking_pets ( pets ( ref, name, breed, species ) ),
  boarding_stays ( room_id, checked_in_at, checked_out_at, status, released_at,
                   segment_order, occupies,
                   facility_rooms ( legacy_id, name ) )
` as const;

/**
 * The same read, restricted to bookings that HAVE a guest on site.
 *
 * `!inner` turns an embedded stay into a join rather than a left join, which
 * is what lets the filters on it (`checked_in_at is not null`) narrow the
 * bookings themselves. Without it PostgREST would return every booking and
 * merely blank the embedded row.
 *
 * The filter goes on a SECOND embed, `present`, and not on `boarding_stays`:
 * a filtered embed also drops the rows that fail it, and presence is stamped
 * on a booking's first stay only — so filtering the one embed would leave a
 * moved guest with nothing but the kennel they left.
 */
export const BOARDING_ON_SITE_SELECT = `${BOARDING_ARRIVAL_SELECT},
  present:boarding_stays!inner ( checked_in_at, checked_out_at )`;

function sameDay(iso: string, day: string): boolean {
  return iso.slice(0, 10) === day;
}

/**
 * `day` is the board's date (YYYY-MM-DD), not "now" — the caller decides which
 * day is being looked at, and "departing today" has to mean that day rather
 * than the server's clock.
 */
export function rowToBoardingArrival(
  row: BoardingArrivalRow,
  day: string,
): BoardingArrival {
  const pets = (row.booking_pets ?? [])
    .map((bp) => bp.pets)
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Presence from the first stay, where the database stamps it; the kennel
  // from the stay the pet sleeps in on the board's night.
  const stay = firstStay(row.boarding_stays);
  const kennel = stayForNight(row.boarding_stays, day) ?? stay;
  const start = new Date(row.start_at);
  const end = new Date(row.end_at);
  const nights = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );

  const onSite = stay?.checked_in_at != null && stay.checked_out_at == null;

  return {
    id: String(row.ref),
    petId: pets[0]?.ref ?? 0,
    petNames: pets.map((p) => p.name),
    petBreed: pets[0]?.breed ?? "",
    petType: pets[0]?.species ?? "dog",
    ownerId: row.clients?.ref ?? 0,
    ownerName: row.clients?.name ?? "",
    ownerPhone: row.clients?.phone ?? "",
    roomId: kennel?.facility_rooms?.legacy_id ?? kennel?.room_id ?? null,
    roomName: kennel?.facility_rooms?.name ?? null,
    scheduledArrival: row.start_at,
    scheduledDeparture: row.end_at,
    checkedInAt: stay?.checked_in_at ?? null,
    checkedOutAt: stay?.checked_out_at ?? null,
    // Straight from the generated column. No stay row means no kennel yet,
    // which is `scheduled` — the guest is expected, nothing has happened.
    status: (stay?.status ?? "scheduled") as BoardingArrivalStatus,
    // Numeric columns come over PostgREST as strings.
    totalCost: Number(row.total_cost),
    amountDue: Number(row.amount_due ?? row.total_cost),
    extrasTotal: Number(row.extras_total ?? 0),
    taxable: row.taxable !== false,
    amountPaid: Number(row.amount_paid ?? 0),
    nights,
    isArrivingToday: sameDay(row.start_at, day),
    isDepartingToday: sameDay(row.end_at, day),
    isOverdue: onSite && row.end_at.slice(0, 10) < day,
  };
}
