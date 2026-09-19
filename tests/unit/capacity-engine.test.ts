import { describe, expect, test } from "bun:test";

import {
  getBoardingUnitUsage,
  getDaycareSectionUsage,
  holdsSpace,
  isGroomingStationBooked,
  roomsForAssignments,
} from "@/lib/capacity-engine";
import type { Booking } from "@/types/booking";
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
