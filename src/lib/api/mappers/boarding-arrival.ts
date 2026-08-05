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
  boarding_stays: BoardingStayJoin | null;
}

export const BOARDING_ARRIVAL_SELECT = `
  id, ref, start_at, end_at, status,
  total_cost, amount_due, amount_paid,
  clients ( ref, name, phone ),
  booking_pets ( pets ( ref, name, breed, species ) ),
  boarding_stays ( room_id, checked_in_at, checked_out_at, status, released_at,
                   facility_rooms ( legacy_id, name ) )
` as const;

/**
 * The same read, restricted to bookings that HAVE a stay on site.
 *
 * `!inner` turns the embedded stay into a join rather than a left join, which
 * is what lets the filters below it (`checked_in_at is not null`) narrow the
 * bookings themselves. Without it PostgREST would return every booking and
 * merely blank the embedded row.
 */
export const BOARDING_ON_SITE_SELECT = BOARDING_ARRIVAL_SELECT.replace(
  "boarding_stays (",
  "boarding_stays!inner (",
);

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

  const stay = row.boarding_stays;
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
    roomId: stay?.facility_rooms?.legacy_id ?? stay?.room_id ?? null,
    roomName: stay?.facility_rooms?.name ?? null,
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
    amountPaid: Number(row.amount_paid ?? 0),
    nights,
    isArrivingToday: sameDay(row.start_at, day),
    isDepartingToday: sameDay(row.end_at, day),
    isOverdue: onSite && row.end_at.slice(0, 10) < day,
  };
}
