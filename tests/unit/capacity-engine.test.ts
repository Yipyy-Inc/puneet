import { describe, expect, test } from "bun:test";

import {
  autoAssignBoardingUnit,
  getBoardingCategoryAvailability,
  getBoardingUnitUsage,
  getDaycareSectionUsage,
  holdsSpace,
  isGroomingStationBooked,
  roomsForAssignments,
  unitHasRoomFor,
} from "@/lib/capacity-engine";
import type { Booking } from "@/types/booking";
import type { Pet } from "@/types/pet";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

const booking = (patch: Partial<Booking>): Booking =>
  ({
    id: 1,
    clientId: 1,
    petId: 1,
    facilityId: 0,
    service: "daycare",
    startDate: "2026-09-14",
    endDate: "2026-09-14",
    status: "confirmed",
    basePrice: 0,
    discount: 0,
    totalCost: 0,
    ...patch,
  }) as Booking;

describe("holdsSpace", () => {
  test("a booking that will not happen holds no space", () => {
    for (const status of [
      "cancelled",
      "declined",
      "no_show",
      "estimate_sent",
      "waitlisted",
    ] as const) {
      expect(holdsSpace({ status })).toBe(false);
    }
    for (const status of [
      "confirmed",
      "request_submitted",
      "checked_in",
      "completed",
    ] as const) {
      expect(holdsSpace({ status })).toBe(true);
    }
  });
});

describe("getDaycareSectionUsage", () => {
  test("a section with no bookings is empty, not an invented 20-55% full", () => {
    expect(getDaycareSectionUsage("sec-a", "2026-09-14", 20, [])).toBe(0);
  });

  test("counts the day's bookings in the section, and not a cancelled one", () => {
    const bookings = [
      booking({
        id: 1,
        sectionId: "sec-a",
        daycareSelectedDates: ["2026-09-14"],
      }),
      booking({
        id: 2,
        sectionId: "sec-a",
        daycareSelectedDates: ["2026-09-15"],
      }),
      booking({
        id: 3,
        sectionId: "sec-a",
        daycareSelectedDates: ["2026-09-14"],
        status: "cancelled",
      }),
      booking({
        id: 4,
        sectionId: "sec-b",
        daycareSelectedDates: ["2026-09-14"],
      }),
    ];
    expect(getDaycareSectionUsage("sec-a", "2026-09-14", 20, bookings)).toBe(1);
  });

  test("a booking naming no days occupies its start to its end", () => {
    const bookings = [
      booking({
        sectionId: "sec-a",
        startDate: "2026-09-13",
        endDate: "2026-09-15",
      }),
    ];
    expect(getDaycareSectionUsage("sec-a", "2026-09-14", 20, bookings)).toBe(1);
    expect(getDaycareSectionUsage("sec-a", "2026-09-16", 20, bookings)).toBe(0);
  });
});

describe("getBoardingUnitUsage", () => {
  test("an overlapping stay counts, a declined one does not", () => {
    const bookings = [
      booking({
        service: "boarding",
        unitAssignment: "unit-1",
        startDate: "2026-09-10",
        endDate: "2026-09-15",
      }),
      booking({
        id: 2,
        service: "boarding",
        unitAssignment: "unit-1",
        startDate: "2026-09-12",
        endDate: "2026-09-14",
        status: "declined",
      }),
    ];
    expect(
      getBoardingUnitUsage("unit-1", "2026-09-13", "2026-09-16", bookings),
    ).toBe(1);
  });
});

describe("isGroomingStationBooked", () => {
  test("a no-show does not keep the station booked", () => {
    const slot = booking({
      service: "grooming",
      stationAssignment: "st-1",
      checkInTime: "10:00",
      checkOutTime: "11:00",
    });
    expect(
      isGroomingStationBooked("st-1", "2026-09-14", "10:30", "11:30", [slot]),
    ).toBe(true);
    expect(
      isGroomingStationBooked("st-1", "2026-09-14", "10:30", "11:30", [
        { ...slot, status: "no_show" },
      ]),
    ).toBe(false);
  });
});

// ============================================================================
// A ROOM TYPE BECOMES A ROOM.
//
// The wizard's room cards are categories, and every boarding booking staff made
// by clicking one was refused: "This facility has no room cat-condo." These pin
// the translation from a category to a free room of that same category.
// ============================================================================
describe("roomsForAssignments", () => {
  const condo = {
    id: "cat-condo",
    service: "boarding",
    name: "Condominium",
    defaultCapacity: 1,
  } as RoomCategory;
  const suite = {
    id: "cat-suite",
    service: "boarding",
    name: "Suite",
    defaultCapacity: 1,
  } as RoomCategory;
  const room = (id: string, categoryId: string, active = true) =>
    ({ id, categoryId, name: id, active, rules: [] }) as FacilityRoom;
  const units = [
    room("c1", "cat-condo"),
    room("c2", "cat-condo"),
    room("s1", "cat-suite"),
  ];
  const input = {
    startDate: "2026-10-06",
    endDate: "2026-10-07",
    categories: [condo, suite],
    units,
    bookings: [] as Booking[],
  };

  test("a category becomes a free room of that category", () => {
    expect(
      roomsForAssignments({
        ...input,
        assignments: [{ petId: 1, roomId: "cat-condo" }],
      }),
    ).toEqual([{ petId: 1, roomId: "c1" }]);
  });

  test("two dogs in one category get two rooms", () => {
    expect(
      roomsForAssignments({
        ...input,
        assignments: [
          { petId: 1, roomId: "cat-condo" },
          { petId: 2, roomId: "cat-condo" },
        ],
      }),
    ).toEqual([
      { petId: 1, roomId: "c1" },
      { petId: 2, roomId: "c2" },
    ]);
  });

  test("a room taken on those nights is skipped", () => {
    expect(
      roomsForAssignments({
        ...input,
        bookings: [
          booking({
            service: "boarding",
            unitAssignment: "c1",
            startDate: "2026-10-05",
            endDate: "2026-10-07",
          }),
        ],
        assignments: [{ petId: 1, roomId: "cat-condo" }],
      }),
    ).toEqual([{ petId: 1, roomId: "c2" }]);
  });

  test("a full category is never swapped for another; the dog waits for a room", () => {
    expect(
      roomsForAssignments({
        ...input,
        assignments: [
          { petId: 1, roomId: "cat-suite" },
          { petId: 2, roomId: "cat-suite" },
        ],
      }),
    ).toEqual([{ petId: 1, roomId: "s1" }]);
  });

  test("a room already named passes through", () => {
    expect(
      roomsForAssignments({
        ...input,
        assignments: [{ petId: 1, roomId: "s1" }],
      }),
    ).toEqual([{ petId: 1, roomId: "s1" }]);
  });
});

// ── A ROOM HOLDS ONE FAMILY; AN AREA HOLDS PETS ─────────────────────────────
//
// A two-dog suite with another family in it read as having room, because the
// OTHER booking was compared with the SAME-family capacity. The count, the
// customer's quote and the staff wizard all offered it, and the database
// refused the save. A one-dog room answered the same either way.

describe("room for one more of this family", () => {
  const deluxe = {
    id: "cat-deluxe",
    service: "boarding",
    name: "Deluxe Suite",
    defaultCapacity: 2,
    visibleToClients: true,
    sortOrder: 1,
    rules: [],
  } as unknown as RoomCategory;
  const yard = {
    id: "cat-yard",
    service: "boarding",
    name: "Play Yard",
    defaultCapacity: 1,
    spaceType: "area",
    maxPetsPerArea: 3,
    visibleToClients: true,
    sortOrder: 2,
    rules: [],
  } as unknown as RoomCategory;
  const room = (id: string, categoryId: string) =>
    ({ id, categoryId, name: id, active: true, rules: [] }) as FacilityRoom;
  const d1 = room("d1", "cat-deluxe");
  const d2 = room("d2", "cat-deluxe");
  const y1 = room("y1", "cat-yard");
  const nights = { startDate: "2026-10-06", endDate: "2026-10-08" };
  const otherFamilyIn = (unit: string, pets = 1) =>
    booking({
      id: 90 + pets,
      service: "boarding",
      unitAssignment: unit,
      startDate: "2026-10-05",
      endDate: "2026-10-07",
      petId: Array.from({ length: pets }, (_, i) => i + 100),
    });
  const dog = { id: 1, type: "Dog", weight: 30 } as Pet;

  test("a two-dog suite with another family in it has no room", () => {
    const bookings = [otherFamilyIn("d1")];
    expect(
      unitHasRoomFor({ unit: d1, category: deluxe, ...nights, bookings }),
    ).toBe(false);
    expect(
      unitHasRoomFor({ unit: d2, category: deluxe, ...nights, bookings }),
    ).toBe(true);
  });

  test("two dogs of one family share it, and a third does not fit", () => {
    const base = { unit: d1, category: deluxe, ...nights, bookings: [] };
    expect(unitHasRoomFor({ ...base, placedHere: 1 })).toBe(true);
    expect(unitHasRoomFor({ ...base, placedHere: 2 })).toBe(false);
  });

  test("an area counts pets, whoever they belong to", () => {
    const bookings = [otherFamilyIn("y1", 2)];
    const base = { unit: y1, category: yard, ...nights, bookings };
    expect(unitHasRoomFor(base)).toBe(true);
    expect(unitHasRoomFor({ ...base, placedHere: 1 })).toBe(false);
  });

  test("the staff wizard skips the occupied suite instead of being refused", () => {
    expect(
      roomsForAssignments({
        ...nights,
        categories: [deluxe],
        units: [d1, d2],
        bookings: [otherFamilyIn("d1")],
        assignments: [
          { petId: 1, roomId: "cat-deluxe" },
          { petId: 2, roomId: "cat-deluxe" },
        ],
      }),
    ).toEqual([
      { petId: 1, roomId: "d2" },
      { petId: 2, roomId: "d2" },
    ]);
  });

  test("the availability count leaves the occupied suite out", () => {
    const [row] = getBoardingCategoryAvailability(
      nights.startDate,
      nights.endDate,
      [deluxe],
      [d1, d2],
      [otherFamilyIn("d1")],
    );
    expect(row?.availableUnits).toBe(1);
  });

  test("assigning a household dog by dog does not put two in a one-dog room", () => {
    const condo = { ...deluxe, id: "cat-condo", defaultCapacity: 1 };
    const c1 = room("c1", "cat-condo");
    const c2 = room("c2", "cat-condo");
    const first = autoAssignBoardingUnit(
      dog,
      nights.startDate,
      nights.endDate,
      null,
      [condo],
      [c1, c2],
      [],
    );
    const second = autoAssignBoardingUnit(
      dog,
      nights.startDate,
      nights.endDate,
      null,
      [condo],
      [c1, c2],
      [],
      new Map([[first!.id, 1]]),
    );
    expect([first?.id, second?.id]).toEqual(["c1", "c2"]);
  });
});
