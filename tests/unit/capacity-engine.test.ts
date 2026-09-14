import { describe, expect, test } from "bun:test";

import {
  getBoardingUnitUsage,
  getDaycareSectionUsage,
  holdsSpace,
  isGroomingStationBooked,
} from "@/lib/capacity-engine";
import type { Booking } from "@/types/booking";

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
