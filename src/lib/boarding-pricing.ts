import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// What a boarding stay costs before rules.
//
// ── WHY THIS IS NOT ONE NUMBER ────────────────────────────────────────────
//
// It was. `boarding.basePrice` from `facility_settings` charged the same rate
// for every kennel, while the board beside it displayed the per-class rate the
// facility had actually set in `room_categories`. On the demo facility that
// was $45 a night against a board reading:
//
//     Private Care Suite  $125      Suite          $55
//     Deluxe Suite         $85      Condominium    $38
//
// Staff quoted the number they could see. The till took the flat one. Nothing
// errored, and the difference only shows up on a bill.
//
// ── AND WHY THERE IS NO LONGER A FALLBACK AT ALL ──────────────────────────
//
// That flat rate stayed on as a last resort: a class with no price of its own
// was charged `boarding.basePrice`, which was 45 — a number from a fixture,
// the same for every facility in the product, that nobody at the facility had
// ever chosen. A stay was priced from it and the bill looked deliberate.
//
// Removed on 2026-09-20 at the client's instruction: a new facility starts
// with no prices, and sets its own. So a class with no nightly rate is not
// worth some other number — it is UNPRICED, and this says so by name rather
// than guessing. The caller refuses the booking and points at the class.
//
// Pure: it takes the catalogue and the assignments and returns the money.
// ============================================================================

export interface BoardingPriceInput {
  /** Every category the caller can see. Filtered to boarding by the caller. */
  categories: RoomCategory[];
  rooms: FacilityRoom[];
  /** Which pet is going in which room. May name one room more than once. */
  roomAssignments: Array<{ petId: number; roomId: string }>;
  nights: number;
  /**
   * The branch this stay is at. A class's own `locationPricing` override for
   * this branch wins over its `defaultBasePrice` -- absent or no override,
   * this resolves exactly as before.
   */
  locationId?: string | null;
}

export interface BoardingPricing {
  /** Summed over the DISTINCT rooms the stay occupies. */
  perNight: number;
  /** `perNight` × nights, counting a same-day stay as one night. */
  total: number;
  /**
   * The classes in this stay whose nightly rate the facility has not set,
   * by name and without repeats. Empty means every room in the stay is
   * priced — which is the only state a booking may be taken in.
   */
  unpricedClasses: string[];
}

/**
 * The class an assignment names.
 *
 * An assignment holds a room OR A ROOM TYPE: the wizard's cards are types, and
 * a real room of that type is picked when the booking is saved
 * (`roomsForAssignments`). Only the room case was resolved here, so a
 * type-level assignment found no class and fell through to the flat service
 * rate — which is how a $125 Private Care Suite was charged at $45 with the
 * per-class pricing supposedly in force.
 */
function classOf(
  roomId: string,
  roomById: Map<string, FacilityRoom>,
  categoryById: Map<string, RoomCategory>,
): RoomCategory | undefined {
  const room = roomById.get(roomId);
  return room ? categoryById.get(room.categoryId) : categoryById.get(roomId);
}

/** A class's nightly rate at this branch, or null when it has none. */
function classRate(
  category: RoomCategory | undefined,
  locationId: string | null | undefined,
): number | null {
  if (!category) return null;
  const branchPrice = locationId
    ? category.locationPricing.find((p) => p.locationId === locationId)?.price
    : undefined;
  return branchPrice ?? category.defaultBasePrice ?? null;
}

/**
 * The stay's nightly total and the classes that could not be priced.
 *
 * Distinct rooms, not per assignment: a Deluxe Suite holds two pets from one
 * household, and two assignments naming the same room are one room being paid
 * for once. Summing per assignment would double-charge a shared suite.
 */
export function boardingPricing({
  categories,
  rooms,
  roomAssignments,
  nights,
  locationId,
}: BoardingPriceInput): BoardingPricing {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const distinctRooms = [...new Set(roomAssignments.map((a) => a.roomId))];

  let perNight = 0;
  const unpriced = new Set<string>();

  for (const roomId of distinctRooms) {
    const category = classOf(roomId, roomById, categoryById);
    const rate = classRate(category, locationId);
    if (rate === null) {
      // A room whose class is gone is not a pricing gap the facility can
      // close, so it is named by what the screen can show.
      unpriced.add(category?.name ?? roomById.get(roomId)?.name ?? roomId);
      continue;
    }
    perNight += rate;
  }

  return {
    perNight,
    total: perNight * Math.max(nights, 1),
    unpricedClasses: [...unpriced],
  };
}

/**
 * One room's nightly rate, for splitting a multi-pet stay across its pets.
 *
 * 0 when the class has no rate: a weight, not a charge. The caller divides a
 * total that was itself refused unless every class was priced.
 */
export function boardingNightlyRate(
  input: Omit<BoardingPriceInput, "nights">,
): number {
  return boardingPricing({ ...input, nights: 1 }).perNight;
}
