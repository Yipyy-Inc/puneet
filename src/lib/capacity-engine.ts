/**
 * Capacity Engine
 *
 * Handles rule-matching, availability queries, and auto-assignment for:
 *  - Daycare  (play area sections, per-day capacity)
 *  - Boarding (room categories → specific units, per-date-range)
 *  - Grooming (stations, per-time-slot)
 */

import type {
  RoomRule,
  DaycareSection,
  FacilityRoom,
  RoomCategory,
  GroomingStation,
} from "@/types/rooms";
import type { Booking } from "@/types/booking";
import type { Pet } from "@/types/pet";
import {
  isCountedInPets,
  petsOnBooking,
} from "@/lib/boarding/lodging-occupancy";

// ── Rule matching ─────────────────────────────────────────────────────────────

/** Returns true when the pet satisfies every enabled rule in the array. */
export function petMatchesRules(pet: Pet, rules: RoomRule[]): boolean {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    switch (rule.type) {
      case "max_weight":
        if (typeof rule.value === "number" && pet.weight > rule.value)
          return false;
        break;
      case "min_weight":
        if (typeof rule.value === "number" && pet.weight < rule.value)
          return false;
        break;
      case "pet_type":
        if (
          typeof rule.value === "string" &&
          pet.type.toLowerCase() !== rule.value.toLowerCase()
        )
          return false;
        break;
      case "single_pet_only":
        // evaluated by the caller when assigning multiple pets
        break;
      case "max_pets":
        // evaluated by the caller when assigning multiple pets
        break;
    }
  }
  return true;
}

// ── Which bookings take up space ─────────────────────────────────────────────
//
// A cancelled, declined or no-show booking holds nothing, and neither does an
// estimate or a place on the waiting list. They were all counted, so a section
// or a kennel read fuller than it was and auto-assign sent a pet elsewhere, or
// to the waitlist.
//
// And every daycare section had a MADE-UP 20–55% added to its real usage
// (`getMockUsage`, "for demo"), so no facility ever saw an empty play area.
// It is gone: usage is the bookings, and nothing else.

const HOLDS_NO_SPACE = new Set([
  "cancelled",
  "declined",
  "no_show",
  "estimate_sent",
  "waitlisted",
]);

export function holdsSpace(booking: Pick<Booking, "status">): boolean {
  return !HOLDS_NO_SPACE.has(booking.status);
}

// ── Daycare capacity ──────────────────────────────────────────────────────────

/**
 * The bookings occupying a section on a date. A booking names its days in
 * `daycareSelectedDates`; one that names none occupies every day from its
 * start to its end. `capacity` is kept in the signature for its callers.
 */
export function getDaycareSectionUsage(
  sectionId: string,
  date: string,
  _capacity: number,
  bookings: Booking[],
): number {
  return bookings.filter((b) => {
    if (b.service !== "daycare" || b.sectionId !== sectionId) return false;
    if (!holdsSpace(b)) return false;
    const days = Array.isArray(b.daycareSelectedDates)
      ? b.daycareSelectedDates
      : [];
    return days.length > 0
      ? days.includes(date)
      : b.startDate <= date && (b.endDate || b.startDate) >= date;
  }).length;
}

/** All sections the pet is eligible for (active + rules pass). */
export function getEligibleSections(
  pet: Pet,
  sections: DaycareSection[],
): DaycareSection[] {
  return sections
    .filter((s) => s.isActive && petMatchesRules(pet, s.rules))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Auto-assign a pet to the best available section for a given date.
 * Picks the eligible section with the most remaining capacity.
 * Returns null when all eligible sections are full → booking goes to waitlist.
 */
export function autoAssignDaycareSection(
  pet: Pet,
  date: string,
  sections: DaycareSection[],
  bookings: Booking[],
): DaycareSection | null {
  const eligible = getEligibleSections(pet, sections);
  let best: DaycareSection | null = null;
  let bestRemaining = -1;

  for (const section of eligible) {
    const used = getDaycareSectionUsage(
      section.id,
      date,
      section.capacity,
      bookings,
    );
    const remaining = section.capacity - used;
    if (remaining > 0 && remaining > bestRemaining) {
      best = section;
      bestRemaining = remaining;
    }
  }
  return best;
}

/**
 * Returns per-section availability summary for a pet across multiple dates.
 * Used to show the capacity bars in the booking wizard.
 */
export function getDaycareAvailabilitySummary(
  pet: Pet,
  dates: string[],
  sections: DaycareSection[],
  bookings: Booking[],
): Array<{
  section: DaycareSection;
  eligible: boolean;
  eligibilityMessage: string | null;
  /** Worst (lowest) remaining capacity across all selected dates */
  minRemaining: number;
  /** Usage on each date */
  usageByDate: Record<string, number>;
}> {
  return sections
    .filter((s) => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => {
      const eligible = petMatchesRules(pet, section.rules);
      const failingRule = eligible
        ? null
        : section.rules.find((r) => r.enabled && !petMatchesRules(pet, [r]));
      const usageByDate: Record<string, number> = {};
      let minRemaining = section.capacity;

      for (const date of dates) {
        const used = getDaycareSectionUsage(
          section.id,
          date,
          section.capacity,
          bookings,
        );
        usageByDate[date] = used;
        const remaining = section.capacity - used;
        if (remaining < minRemaining) minRemaining = remaining;
      }

      return {
        section,
        eligible,
        eligibilityMessage: failingRule?.clientMessage ?? null,
        minRemaining: Math.max(0, minRemaining),
        usageByDate,
      };
    });
}

// ── Boarding capacity ─────────────────────────────────────────────────────────

/** True if two date ranges overlap (end exclusive). */
function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Returns how many bookings already occupy a specific room unit in a date range.
 * Each room unit has a capacity (default 1 for boarding); a booking occupies it
 * for the entire stay.
 */
export function getBoardingUnitUsage(
  unitId: string,
  startDate: string,
  endDate: string,
  bookings: Booking[],
): number {
  return bookings.filter(
    (b) =>
      b.service === "boarding" &&
      b.unitAssignment === unitId &&
      holdsSpace(b) &&
      datesOverlap(b.startDate, b.endDate, startDate, endDate),
  ).length;
}

/**
 * How many PETS already occupy a unit over a range.
 *
 * The sibling of `getBoardingUnitUsage`, and the two answer different
 * questions on purpose: a room is full when somebody is in it, an area is full
 * when the DOGS reach its maximum. Counting stays against `maxPetsPerArea`
 * would let a twelve-dog yard take twelve families and then be refused by
 * `private.boarding_area_within_capacity`, which counts `booking_pets`.
 */
export function boardingUnitPets(
  unitId: string,
  startDate: string,
  endDate: string,
  bookings: Booking[],
): number {
  return bookings
    .filter(
      (b) =>
        b.service === "boarding" &&
        b.unitAssignment === unitId &&
        holdsSpace(b) &&
        datesOverlap(b.startDate, b.endDate, startDate, endDate),
    )
    .reduce((sum, b) => sum + petsOnBooking(b), 0);
}

/**
 * Returns availability summary per room category for a date range.
 * Used in the boarding booking wizard to show "X of Y available".
 */
export function getBoardingCategoryAvailability(
  startDate: string,
  endDate: string,
  categories: RoomCategory[],
  units: FacilityRoom[],
  bookings: Booking[],
  pet?: Pet,
): Array<{
  category: RoomCategory;
  totalActive: number;
  availableUnits: number;
  eligible: boolean;
  eligibilityMessage: string | null;
}> {
  return categories
    .filter((c) => c.service === "boarding" && c.visibleToClients)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cat) => {
      const activeUnits = units.filter(
        (u) => u.categoryId === cat.id && u.active,
      );
      const eligible = pet ? petMatchesRules(pet, cat.rules) : true;
      const failingRule =
        pet && !eligible
          ? cat.rules.find((r) => r.enabled && !petMatchesRules(pet, [r]))
          : null;

      // ── AN AREA IS COUNTED IN PETS, NOT IN UNITS ────────────────────────
      //
      // MoéGo: "An area remains available until the number of assigned pets
      // reaches the maximum limit." So a yard is not full because somebody is
      // in it — it is full at `maxPetsPerArea` PER UNIT, which is exactly how
      // `private.boarding_area_within_capacity` enforces it.
      //
      // `defaultCapacity` is deliberately not consulted for an area: it means
      // "max pets of the SAME FAMILY per room", a different question with a
      // different answer, and the database refuses to let one row hold both.
      const availableUnits = isCountedInPets(cat)
        ? activeUnits.filter(
            (unit) =>
              // PETS, not stays. A household bringing three dogs is one stay
              // and three dogs, and the trigger counts `booking_pets`.
              boardingUnitPets(unit.id, startDate, endDate, bookings) <
              (cat.maxPetsPerArea as number),
          ).length
        : activeUnits.filter((unit) => {
            const cap = unit.capacity ?? cat.defaultCapacity;
            const used = getBoardingUnitUsage(
              unit.id,
              startDate,
              endDate,
              bookings,
            );
            return used < cap;
          }).length;

      return {
        category: cat,
        totalActive: activeUnits.length,
        availableUnits,
        eligible,
        eligibilityMessage: failingRule?.clientMessage ?? null,
      };
    });
}

/**
 * Auto-assign the best available boarding unit for a pet and date range.
 * Returns the specific FacilityRoom unit, or null if none available.
 */
export function autoAssignBoardingUnit(
  pet: Pet,
  startDate: string,
  endDate: string,
  preferredCategoryId: string | null,
  categories: RoomCategory[],
  units: FacilityRoom[],
  bookings: Booking[],
): FacilityRoom | null {
  const eligibleCategories = categories.filter(
    (c) =>
      c.service === "boarding" &&
      c.visibleToClients &&
      petMatchesRules(pet, c.rules),
  );

  // If user selected a specific category, try that first
  const orderedCategories = preferredCategoryId
    ? [
        ...eligibleCategories.filter((c) => c.id === preferredCategoryId),
        ...eligibleCategories.filter((c) => c.id !== preferredCategoryId),
      ]
    : eligibleCategories;

  for (const cat of orderedCategories) {
    const activeUnits = units.filter(
      (u) => u.categoryId === cat.id && u.active,
    );
    for (const unit of activeUnits) {
      const cap = unit.capacity ?? cat.defaultCapacity;
      const used = getBoardingUnitUsage(unit.id, startDate, endDate, bookings);
      if (used < cap) return unit;
    }
  }
  return null;
}

/**
 * The wizard's room step places each dog in a room TYPE — its cards are the
 * categories — but a booking is held by a ROOM, and `create_booking` refuses
 * an id it cannot find among the facility's rooms ("This facility has no room
 * cat-condo."). So every boarding booking staff made by clicking a card was
 * refused, and the refusal was a toast that had gone before anyone read it.
 *
 * Each assignment naming a category becomes a free room of THAT category (never
 * another: the type is what was chosen and what is priced), no two dogs sent
 * to the same room past its capacity. One that is already a room passes
 * through — the occupancy grid and the customer's auto-assignment name rooms.
 * A category with no free room drops the assignment: a stay may be saved
 * without a room and given one on the board, which a refused save may not.
 */
export function roomsForAssignments(input: {
  assignments: Array<{ petId: number; roomId: string }>;
  startDate: string;
  endDate: string;
  categories: RoomCategory[];
  units: FacilityRoom[];
  bookings: Booking[];
}): Array<{ petId: number; roomId: string }> {
  const { startDate, endDate, categories, units, bookings } = input;
  const placedHere = new Map<string, number>();
  const out: Array<{ petId: number; roomId: string }> = [];
  for (const assignment of input.assignments) {
    if (units.some((u) => u.id === assignment.roomId)) {
      out.push(assignment);
      placedHere.set(
        assignment.roomId,
        (placedHere.get(assignment.roomId) ?? 0) + 1,
      );
      continue;
    }
    const category = categories.find((c) => c.id === assignment.roomId);
    if (!category) continue;
    const free = units.find((unit) => {
      if (unit.categoryId !== category.id || !unit.active) return false;
      const cap = unit.capacity ?? category.defaultCapacity;
      const used =
        getBoardingUnitUsage(unit.id, startDate, endDate, bookings) +
        (placedHere.get(unit.id) ?? 0);
      return used < cap;
    });
    if (!free) continue;
    placedHere.set(free.id, (placedHere.get(free.id) ?? 0) + 1);
    out.push({ petId: assignment.petId, roomId: free.id });
  }
  return out;
}

// ── Grooming capacity ─────────────────────────────────────────────────────────

/** Returns true if a grooming station is booked for an overlapping time slot. */
export function isGroomingStationBooked(
  stationId: string,
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
): boolean {
  return bookings.some(
    (b) =>
      b.service === "grooming" &&
      b.stationAssignment === stationId &&
      holdsSpace(b) &&
      b.startDate === date &&
      b.checkInTime != null &&
      b.checkOutTime != null &&
      b.checkInTime < endTime &&
      b.checkOutTime > startTime,
  );
}

/**
 * Returns available grooming stations for a pet on a date and time slot.
 */
export function getAvailableGroomingStations(
  pet: Pet,
  date: string,
  startTime: string,
  endTime: string,
  stations: GroomingStation[],
  bookings: Booking[],
): GroomingStation[] {
  return stations.filter((station) => {
    if (!station.active) return false;
    if (station.maxWeightLbs != null && pet.weight > station.maxWeightLbs)
      return false;
    if (
      station.petTypes &&
      station.petTypes.length > 0 &&
      !station.petTypes.includes(pet.type.toLowerCase() as "dog" | "cat")
    )
      return false;
    return !isGroomingStationBooked(
      station.id,
      date,
      startTime,
      endTime,
      bookings,
    );
  });
}

/**
 * Auto-assign the first available grooming station for a pet.
 * Prefers "table" type stations for grooming appointments.
 */
export function autoAssignGroomingStation(
  pet: Pet,
  date: string,
  startTime: string,
  endTime: string,
  stations: GroomingStation[],
  bookings: Booking[],
): GroomingStation | null {
  const available = getAvailableGroomingStations(
    pet,
    date,
    startTime,
    endTime,
    stations,
    bookings,
  );
  // Prefer table stations first
  return available.find((s) => s.type === "table") ?? available[0] ?? null;
}
