import type { RoomCategory } from "@/types/rooms";

// ============================================================================
// HOW FULL A LODGING TYPE IS — counted the way MoéGo counts it.
//
// ── WHY THIS EXISTS, AND WHAT WAS WRONG WITHOUT IT ────────────────────────
//
// Phase 1 gave `room_categories` a `space_type`, Phase 2 taught Postgres to
// refuse an over-full area, and Phase 4 put both on the screen that creates
// one. And then NOTHING THAT DRAWS A NUMBER KNEW ANY OF IT: `summariseOccupancy`
// counted rooms, `getBoardingCategoryAvailability` counted units, and the
// kennel calendar counted rows. So an Area with room for twelve dogs read
// 1 / 1 (100%) the moment one dog walked in, while the database would happily
// have admitted eleven more.
//
// That is the same defect this plan has now catalogued three times — a field
// that is stored, enforced and editable, and decides nothing where anyone can
// see it.
//
// ── MoéGo'S OWN TWO SENTENCES ─────────────────────────────────────────────
//
// ROOM / KENNEL: "Capacity is based on individual rooms. Once a pet (or pet
// family) is assigned to a lodging, it is considered fully occupied."
//
// AREA: "Capacity is based on the number of pets. An area remains available
// until the number of assigned pets reaches the maximum limit."
//
// So a room type is counted in ROOMS and an area in PETS, and the label has to
// say which — "7 / 24" means nothing if the reader cannot tell dogs from runs.
//
// ── IT AGREES WITH THE TRIGGER, DELIBERATELY ──────────────────────────────
//
// `private.boarding_area_within_capacity` reads `max_pets_per_area` from the
// unit's CATEGORY and compares it against the pets in THAT UNIT — so the
// maximum is per unit, and a type with three area units each holding twelve
// has thirty-six places. This counts the same way. A screen that disagrees
// with the constraint tells staff a stay will fit and then watches the save
// fail, which is worse than either number alone.
//
// It also mirrors the trigger's own escape: an "area" carrying no maximum is
// not an area any more (`room_categories_area_max_pets` forbids it), so rather
// than guess a capacity this falls back to counting rooms, exactly as the
// trigger returns without enforcing.
//
// ── ITS SQL TWIN, AND WHY BOTH EXIST ──────────────────────────────────────
//
// `public.lodging_occupancy(room_id, date)` (20260924190000) answers the same
// question for ONE UNIT on ONE DATE, and is the authority: a room unit has
// capacity 1 and is used by its stays; an area unit has capacity
// `max_pets_per_area` and is used by its pets. This module is the CATEGORY
// aggregate of exactly that — units × 1 for a room type, units ×
// `max_pets_per_area` for an area — computed from data the browser already
// holds so a board does not make one round trip per kennel per day.
//
// They must move together. If the per-unit rule ever changes in SQL, the
// aggregate here is wrong the same day, and nothing will fail loudly: a
// capacity that is merely WRONG still renders. `lodging-area-capacity.sql` A5
// pins the SQL side and `lodging-occupancy.test.ts` pins this one.
// ============================================================================

/** What the numbers count. A room type is rooms; an area is pets. */
export type LodgingCountedIn = "rooms" | "pets";

export interface LodgingOccupancy {
  countedIn: LodgingCountedIn;
  /** Rooms taken, or pets in. */
  used: number;
  /** Rooms available to take, or pet places. */
  capacity: number;
  /**
   * `used / capacity` as a percentage, rounded. 0 when there is no capacity.
   *
   * NOT capped at 100. A recorded override may put a thirteenth dog in a
   * twelve-dog yard, and §2b is explicit that being at capacity is not an
   * error — so the honest number goes to the caller and the caller decides how
   * to draw it. Clamping here would hide the one case somebody must see.
   */
  percent: number;
}

/** A unit as every caller already has it: an id, and whether it is in service. */
export interface LodgingUnit {
  id: string;
  active?: boolean;
}

export interface LodgingUsage {
  /** Units holding at least one guest. What a ROOM type is counted by. */
  occupiedUnitIds?: ReadonlySet<string>;
  /** Pets in each unit. What an AREA is counted by. Absent = none. */
  petsByUnit?: ReadonlyMap<string, number>;
}

/**
 * Is this category counted in pets?
 *
 * An area with no maximum is not one — the table refuses that combination, and
 * the trigger stops enforcing when it sees it, so this stops counting pets.
 */
export function isCountedInPets(
  category: Pick<RoomCategory, "spaceType" | "maxPetsPerArea">,
): boolean {
  return (
    category.spaceType === "area" &&
    typeof category.maxPetsPerArea === "number" &&
    category.maxPetsPerArea > 0
  );
}

export function lodgingOccupancy(
  category: Pick<RoomCategory, "spaceType" | "maxPetsPerArea">,
  units: readonly LodgingUnit[],
  usage: LodgingUsage = {},
): LodgingOccupancy {
  // A unit out for a deep clean is not capacity the facility has tonight, and
  // counting it would understate how full they are. `active` absent means in
  // service, because that is what every caller's data means by omitting it.
  const inService = units.filter((u) => u.active !== false);

  if (isCountedInPets(category)) {
    const max = category.maxPetsPerArea as number;
    const pets = usage.petsByUnit;
    const used = inService.reduce(
      (sum, unit) => sum + (pets?.get(unit.id) ?? 0),
      0,
    );
    const capacity = inService.length * max;
    return {
      countedIn: "pets",
      used,
      capacity,
      percent: share(used, capacity),
    };
  }

  const occupied = usage.occupiedUnitIds;
  const used = occupied
    ? inService.filter((unit) => occupied.has(unit.id)).length
    : 0;
  return {
    countedIn: "rooms",
    used,
    capacity: inService.length,
    percent: share(used, inService.length),
  };
}

function share(used: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((used / capacity) * 100);
}

/**
 * How many PETS a booking puts in a kennel.
 *
 * ── WHY THIS IS NOT `bookings.length` ─────────────────────────────────────
 *
 * `getBoardingUnitUsage` counts STAYS, which is the right question for a room
 * ("is this kennel taken?") and the wrong one for an area ("how many dogs are
 * in the yard?"). A household bringing three dogs is one stay and three pets,
 * so counting stays against `maxPetsPerArea` would let a twelve-dog yard take
 * twelve FAMILIES — and the database, which counts
 * `select count(*) from booking_pets`, would then refuse the save with
 * `area_full` after the screen had promised it fit.
 *
 * That is the same shape as comparing an app id to a uuid: both are numbers,
 * both are plausible, and only one agrees with the constraint.
 *
 * A booking carries `petId` as either one number or an array — see
 * `newBookingSchema`. One pet is the floor: a boarding stay with no pet
 * recorded is still somebody in a kennel.
 */
export function petsOnBooking(booking: {
  petId?: number | number[];
  petIds?: number[];
}): number {
  if (Array.isArray(booking.petIds) && booking.petIds.length > 0) {
    return booking.petIds.length;
  }
  if (Array.isArray(booking.petId)) return Math.max(1, booking.petId.length);
  return 1;
}

/**
 * How many more may still be taken — never below zero.
 *
 * "3 spots left" is one of §2b's five orange territories, and a negative
 * number there is nonsense even when `used` legitimately exceeds `capacity`
 * because somebody recorded an override.
 */
export function lodgingPlacesLeft(occupancy: LodgingOccupancy): number {
  return Math.max(0, occupancy.capacity - occupancy.used);
}
