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
// Extracted from `BookingModal` so the arithmetic that decides a charge can be
// read on its own, rather than sitting inside a 3,700-line component. Pure: it
// takes the catalogue and the assignments and returns a number.
// ============================================================================

export interface BoardingPriceInput {
  /** Every category the caller can see. Filtered to boarding by the caller. */
  categories: RoomCategory[];
  rooms: FacilityRoom[];
  /** Which pet is going in which room. May name one room more than once. */
  roomAssignments: Array<{ petId: number; roomId: string }>;
  nights: number;
  /**
   * The service-wide rate, used only where a class carries no price of its
   * own and before any kennel has been chosen.
   */
  fallbackNightlyRate: number;
  /**
   * The branch this stay is at. A class's own `locationPricing` override for
   * this branch wins over its `defaultBasePrice` -- absent or no override,
   * this resolves exactly as before.
   */
  locationId?: string | null;
}

/**
 * The nightly total, summed over the DISTINCT rooms the stay occupies.
 *
 * Distinct, not per assignment: a Deluxe Suite holds two pets from one
 * household, and two assignments naming the same room are one room being paid
 * for once. Summing per assignment would double-charge a shared suite.
 */
export function boardingNightlyRate({
  categories,
  rooms,
  roomAssignments,
  fallbackNightlyRate,
  locationId,
}: Omit<BoardingPriceInput, "nights">): number {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const distinctRooms = [...new Set(roomAssignments.map((a) => a.roomId))];

  return distinctRooms.reduce((sum, roomId) => {
    const room = roomById.get(roomId);
    const category = room ? categoryById.get(room.categoryId) : undefined;
    // A branch's own price for this class wins, then the class's own price,
    // then the service rate rather than nothing — a free night is never the
    // right guess. `check:pricing` should be the thing that stops a class
    // existing without a price; this is the last line of defence, not the plan.
    const branchPrice = locationId
      ? category?.locationPricing.find((p) => p.locationId === locationId)
          ?.price
      : undefined;
    return (
      sum + (branchPrice ?? category?.defaultBasePrice ?? fallbackNightlyRate)
    );
  }, 0);
}

/**
 * The whole stay, before discounts and surcharges.
 *
 * Before auto-assignment has run there is no kennel to price by, so the flat
 * service rate stands in — which is exactly what the caller charged before
 * this existed, so nothing regresses in that state. The number firms up as
 * soon as a kennel is chosen.
 */
export function boardingBasePrice(input: BoardingPriceInput): number {
  const nights = Math.max(input.nights, 1);
  const perNight = boardingNightlyRate(input);
  return (perNight > 0 ? perNight : input.fallbackNightlyRate) * nights;
}
