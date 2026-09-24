import type { BoardingService } from "@/lib/api/mappers/boarding-service";
import { stayUnits } from "@/lib/pricing/boarding-service-choice";
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
// ── AND WHY A SERVICE MAY NOW STAND IN FRONT OF THE CLASS ─────────────────
//
// Until Phase 5 the kennel class WAS the rate: `room_categories` was both the
// building and the menu, so a facility could not offer two priced services in
// one class. `boarding_services` (20260924210000) separated them, and this is
// where that separation reaches the money.
//
// THE SUBSTITUTION IS DELIBERATELY NARROW. A chosen service replaces the RATE
// and the UNIT, and nothing else: the stay is still summed over the DISTINCT
// rooms it occupies, because two kennels are still two kennels. That keeps the
// cutover PRICE-NEUTRAL by construction — the Phase 5 migration carried every
// priced class across at an identical price, per night, restricted to the
// class it came from, so a facility that never opens the new menu is quoted
// exactly what it was quoted yesterday. `boarding-service-pricing.test.ts`
// asserts that rather than asserting that somebody believed it.
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
  /**
   * The boarding service the booking names, already resolved for this branch.
   *
   * Absent or null is the PRE-CUTOVER PATH and it is not a degraded one: every
   * boarding booking made before Phase 6 carries no service id and was sold at
   * its kennel class's nightly rate. Re-pricing it through a service — even
   * the one the migration derived from that very class — would re-price it at
   * whatever the facility has edited that service to since.
   *
   * Narrowed to the three fields this actually reads rather than taking the
   * whole row: the wizard holds only what the picker handed it, and a
   * function that demands twenty fields to use three invites a call site to
   * fetch nineteen it does not need.
   */
  service?: Pick<BoardingService, "price" | "unit" | "name"> | null;
}

export interface BoardingPricing {
  /**
   * Summed over the DISTINCT rooms the stay occupies.
   *
   * Per NIGHT or per DAY according to `unit` — MoéGo lets a facility charge
   * either, and "Monday to Wednesday is 2 nights or 3 days".
   */
  perUnit: number;
  /** Which quantity `perUnit` is multiplied by. `night` unless a service says. */
  unit: "night" | "day";
  /** `perUnit` × the units the stay is charged for, never fewer than one. */
  total: number;
  /**
   * The classes in this stay whose nightly rate the facility has not set,
   * by name and without repeats. Empty means every room in the stay is
   * priced — which is the only state a booking may be taken in.
   *
   * When a SERVICE prices the stay there are no classes to be unpriced: the
   * menu carries the money now. An unpriced service names itself instead, so
   * the refusal still points at the thing the facility has to go and fix.
   */
  unpricedClasses: string[];
}

/**
 * A SERVICE priced at zero is not a free stay — it is a price nobody has set.
 *
 * `boarding_services.price` is `not null default 0`, so a facility that adds a
 * service and never prices it holds a zero, which is "not yet" and not "free".
 * `price-booking.ts` refuses `<= 0` on the server, and agreeing here is what
 * stops the wizard quoting a number the server then rejects as
 * `quote_mismatch`.
 *
 * ── THE CLASS PATH IS DELIBERATELY NOT CHANGED TO MATCH ───────────────────
 *
 * `classRate` returns 0 for a class whose `defaultBasePrice` IS 0, and this
 * function is not applied to it. On a class, null and 0 are different answers:
 * null is "never set" and already refuses, 0 is something a facility typed.
 * Aligning the two would turn a $0 class into a refusal, which is a money
 * change nobody asked for in a commit about services — so it is recorded for
 * Phase 9 rather than made quietly here. The server already disagrees with the
 * wizard on that case, and it disagreed before this commit too.
 */
function servicePriceOrNull(rate: number): number | null {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
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
  service,
}: BoardingPriceInput): BoardingPricing {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const distinctRooms = [...new Set(roomAssignments.map((a) => a.roomId))];

  // The service's rate, resolved ONCE for the stay. Null means either that no
  // service was chosen — the pre-cutover path, where the class still prices
  // the stay — or that the chosen one carries no price, which is a gap that
  // names itself below.
  const serviceRate = service ? servicePriceOrNull(service.price) : null;
  const unit = service?.unit ?? "night";

  let perUnit = 0;
  const unpriced = new Set<string>();

  for (const roomId of distinctRooms) {
    const category = classOf(roomId, roomById, categoryById);
    // THE SERVICE REPLACES THE RATE, NOT THE ARITHMETIC. Two kennels are
    // still two kennels; what changed is where the number comes from.
    const rate = service ? serviceRate : classRate(category, locationId);
    if (rate === null) {
      // A room whose class is gone is not a pricing gap the facility can
      // close, so it is named by what the screen can show. An unpriced
      // SERVICE names the service, because that is the row to go and fix.
      unpriced.add(
        service
          ? service.name
          : (category?.name ?? roomById.get(roomId)?.name ?? roomId),
      );
      continue;
    }
    perUnit += rate;
  }

  return {
    perUnit,
    unit,
    total: perUnit * stayUnits(unit, nights),
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
  return boardingPricing({ ...input, nights: 1 }).perUnit;
}
