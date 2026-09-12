import { describe, expect, test } from "bun:test";

import {
  allocateDeposit,
  boardingParts,
  daycareParts,
  expandBookingParts,
  splitMoney,
} from "@/lib/bookings/booking-parts";
import type { NewBooking } from "@/types/booking";

const cents = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100);

describe("splitMoney", () => {
  test("three days of $100 add back to $100, not $99.99", () => {
    const shares = splitMoney(100, [1, 1, 1]);
    expect(shares).toEqual([33.34, 33.33, 33.33]);
    expect(cents(shares)).toBe(10000);
  });

  test("weights move the money, and the cents still add back", () => {
    const shares = splitMoney(250, [80, 45]);
    expect(cents(shares)).toBe(25000);
    expect(shares[0]).toBeGreaterThan(shares[1]);
  });

  test("all-zero weights split evenly rather than dividing by zero", () => {
    expect(splitMoney(10, [0, 0])).toEqual([5, 5]);
  });

  test("a negative amount keeps its sign", () => {
    expect(cents(splitMoney(-10, [1, 2]))).toBe(-1000);
  });
});

describe("daycareParts", () => {
  test("one booking per day, each with that day's own times", () => {
    const parts = daycareParts({
      dates: ["2026-10-07", "2026-10-05", "2026-10-09"],
      dateTimes: [
        { date: "2026-10-07", checkInTime: "10:00", checkOutTime: "15:00" },
      ],
      petIds: [3, 4],
      checkInTime: "08:00",
      checkOutTime: "17:00",
      money: { basePrice: 150, discount: 10, totalCost: 140 },
    });
    expect(parts.map((p) => p.startDate)).toEqual([
      "2026-10-05",
      "2026-10-07",
      "2026-10-09",
    ]);
    expect(parts.every((p) => p.startDate === p.endDate)).toBe(true);
    expect(parts[1].checkInTime).toBe("10:00");
    expect(parts[0].checkInTime).toBe("08:00");
    expect(parts.every((p) => p.petIds.length === 2)).toBe(true);
    expect(cents(parts.map((p) => p.totalCost))).toBe(14000);
    expect(cents(parts.map((p) => p.discount))).toBe(1000);
  });
});

describe("boardingParts", () => {
  const base = {
    startDate: "2026-10-05",
    endDate: "2026-10-08",
    checkInTime: "08:00",
    checkOutTime: "11:00",
    money: { basePrice: 300, discount: 0, totalCost: 300 },
  };

  test("two dogs in two rooms are two stays, priced by their rooms", () => {
    const parts = boardingParts({
      ...base,
      petIds: [3, 4],
      roomAssignments: [
        { petId: 3, roomId: "R-1" },
        { petId: 4, roomId: "R-2" },
      ],
      weightOf: (roomId) => (roomId === "R-1" ? 200 : 100),
    });
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ petIds: [3], unitAssignment: "R-1" });
    expect(parts[0].totalCost).toBe(200);
    expect(parts[1]).toMatchObject({ petIds: [4], unitAssignment: "R-2" });
    expect(parts[1].totalCost).toBe(100);
  });

  test("two dogs sharing a room are one stay", () => {
    const parts = boardingParts({
      ...base,
      petIds: [3, 4],
      roomAssignments: [
        { petId: 3, roomId: "R-1" },
        { petId: 4, roomId: "R-1" },
      ],
      weightOf: () => 0,
    });
    expect(parts).toHaveLength(1);
    expect(parts[0].petIds).toEqual([3, 4]);
    expect(parts[0].totalCost).toBe(300);
  });

  test("a dog with no room yet rides in a part with no room", () => {
    const parts = boardingParts({
      ...base,
      petIds: [3, 4],
      roomAssignments: [{ petId: 3, roomId: "R-1" }],
      weightOf: () => 0,
    });
    expect(parts).toHaveLength(2);
    expect(parts[1].unitAssignment).toBeUndefined();
    // No prices known: shared by dog.
    expect(parts.map((p) => p.totalCost)).toEqual([150, 150]);
  });
});

describe("expandBookingParts", () => {
  const request: NewBooking = {
    clientId: 16,
    petId: [3, 4],
    facilityId: 0,
    service: "daycare",
    startDate: "2026-10-05",
    endDate: "2026-10-05",
    status: "confirmed",
    basePrice: 100,
    discount: 0,
    totalCost: 100,
    specialRequests: "Keep Kofi away from the pool",
    daycareSelectedDates: ["2026-10-05", "2026-10-06"],
    daycareDateTimes: [
      { date: "2026-10-05", checkInTime: "08:00", checkOutTime: "17:00" },
      { date: "2026-10-06", checkInTime: "09:00", checkOutTime: "16:00" },
    ],
  };

  test("no parts is the request, unchanged", () => {
    expect(expandBookingParts(request)).toEqual([request]);
  });

  test("each part keeps the request's notes and claims only its own day", () => {
    const parts = daycareParts({
      dates: request.daycareSelectedDates!,
      dateTimes: request.daycareDateTimes!,
      petIds: [3, 4],
      checkInTime: "08:00",
      checkOutTime: "17:00",
      money: request,
    });
    const out = expandBookingParts({ ...request, parts }, { id: "g-1" });
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({
      startDate: "2026-10-06",
      checkInTime: "09:00",
      specialRequests: "Keep Kofi away from the pool",
      daycareSelectedDates: ["2026-10-06"],
      bookingGroup: { id: "g-1", part: 2, of: 2 },
    });
    expect(out[1].daycareDateTimes).toHaveLength(1);
    expect("parts" in out[0]).toBe(false);
    expect(cents(out.map((b) => b.totalCost))).toBe(10000);
  });
});

describe("allocateDeposit", () => {
  test("fills the bookings in order, none past its own price", () => {
    expect(allocateDeposit(60, [40, 40, 40])).toEqual({
      shares: [40, 20, 0],
      left: 0,
    });
  });

  test("returns what the bookings cannot hold", () => {
    expect(allocateDeposit(100, [30, 30])).toEqual({
      shares: [30, 30],
      left: 40,
    });
  });
});
