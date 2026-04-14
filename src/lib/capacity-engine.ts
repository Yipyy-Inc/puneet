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

// ── Deterministic mock usage (for demo) ──────────────────────────────────────

/**
 * Returns a deterministic "existing usage" count for a section on a date.
 * Used to simulate realistic partial occupancy without touching booking data.
 * Range: 20–55% of capacity.
 */
export function getMockUsage(
  id: string,
  date: string,
  capacity: number,
): number {
  const hash = (id + date)
    .split("")
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const pct = 0.2 + (hash % 35) / 100; // 20–55%
  return Math.floor(pct * capacity);
}

// ── Daycare capacity ──────────────────────────────────────────────────────────

/**
 * Returns the number of bookings already occupying a section on a date.
 * Counts both structured `sectionId` field and mock simulated usage.
 */
export function getDaycareSectionUsage(
  sectionId: string,
  date: string,
  capacity: number,
  bookings: Booking[],
): number {
  const realUsage = bookings.filter(
    (b) =>
      b.service === "daycare" &&
      b.sectionId === sectionId &&
      Array.isArray(b.daycareSelectedDates) &&
      b.daycareSelectedDates.includes(date),
  ).length;
  return realUsage + getMockUsage(sectionId, date, capacity);
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
      datesOverlap(b.startDate, b.endDate, startDate, endDate),
  ).length;
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

      const availableUnits = activeUnits.filter((unit) => {
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
