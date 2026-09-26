import { describe, expect, test } from "bun:test";

import { kennelStretches, planKennels } from "@/lib/boarding/kennel-changes";
import type { Booking } from "@/types/booking";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// A stay booked across two kennels: the first nights in one lodging type,
// the rest in another. The wizard asks for TYPES and a booking is held by
// ROOMS, so each stretch of nights becomes a free room of its type for
// exactly those nights — and the case nothing could book before, one suite
// free for the start of the week and another for the end, books.

const booking = (patch: Partial<Booking>): Booking =>
  ({
    id: 1,
    clientId: 1,
    petId: 1,
    facilityId: 0,
    service: "boarding",
    startDate: "2026-10-01",
    endDate: "2026-10-01",
    status: "confirmed",
    basePrice: 0,
    discount: 0,
    totalCost: 0,
    ...patch,
  }) as Booking;

const suite = {
  id: "cat-suite",
  service: "boarding",
  name: "Suite",
  defaultCapacity: 1,
} as RoomCategory;
const condo = {
  id: "cat-condo",
  service: "boarding",
  name: "Condominium",
  defaultCapacity: 2,
} as RoomCategory;
const room = (id: string, categoryId: string) =>
  ({ id, categoryId, name: id, active: true, rules: [] }) as FacilityRoom;

const stay = {
  petIds: [1],
  startDate: "2026-10-01",
  endDate: "2026-10-07",
  categories: [suite, condo],
  units: [
    room("s1", "cat-suite"),
    room("s2", "cat-suite"),
    room("c1", "cat-condo"),
  ],
  bookings: [] as Booking[],
};

describe("the stretches of a stay", () => {
  test("the first kennel's nights, then each change's, in order", () => {
    expect(
      kennelStretches({
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        first: "cat-suite",
        changes: [
          { from: "2026-10-05", roomId: "cat-suite" },
          { from: "2026-10-03", roomId: "cat-condo" },
        ],
      }),
    ).toEqual([
      { from: "2026-10-01", to: "2026-10-03", roomId: "cat-suite" },
      { from: "2026-10-03", to: "2026-10-05", roomId: "cat-condo" },
      { from: "2026-10-05", to: "2026-10-07", roomId: "cat-suite" },
    ]);
  });

  test("a change on the first night, the check-out day or outside says nothing", () => {
    expect(
      kennelStretches({
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        first: "cat-suite",
        changes: [
          { from: "2026-10-01", roomId: "cat-condo" },
          { from: "2026-10-07", roomId: "cat-condo" },
          { from: "2026-11-02", roomId: "cat-condo" },
        ],
      }),
    ).toEqual([{ from: "2026-10-01", to: "2026-10-07", roomId: "cat-suite" }]);
  });
});

describe("a room for every stretch", () => {
  test("suite, then condo: the booking's room and one move", () => {
    expect(
      planKennels({
        ...stay,
        first: "cat-suite",
        changes: [{ from: "2026-10-04", roomId: "cat-condo" }],
      }),
    ).toEqual({
      ok: true,
      unitAssignment: "s1",
      kennelMoves: [{ from: "2026-10-04", roomId: "c1" }],
    });
  });

  test("no suite free all week, two suites free half each: it books", () => {
    const plan = planKennels({
      ...stay,
      first: "cat-suite",
      changes: [{ from: "2026-10-04", roomId: "cat-suite" }],
      bookings: [
        booking({
          unitAssignment: "s1",
          startDate: "2026-10-04",
          endDate: "2026-10-09",
        }),
        booking({
          id: 2,
          unitAssignment: "s2",
          startDate: "2026-09-28",
          endDate: "2026-10-04",
        }),
      ],
    });
    expect(plan).toEqual({
      ok: true,
      unitAssignment: "s1",
      kennelMoves: [{ from: "2026-10-04", roomId: "s2" }],
    });
  });

  test("a change that lands in the same room is no move at all", () => {
    expect(
      planKennels({
        ...stay,
        first: "cat-suite",
        changes: [{ from: "2026-10-04", roomId: "cat-suite" }],
      }),
    ).toEqual({ ok: true, unitAssignment: "s1", kennelMoves: [] });
  });

  test("a stretch with no free room of its type is named", () => {
    const plan = planKennels({
      ...stay,
      first: "cat-suite",
      changes: [{ from: "2026-10-04", roomId: "cat-condo" }],
      bookings: [
        booking({
          unitAssignment: "c1",
          startDate: "2026-10-05",
          endDate: "2026-10-06",
        }),
      ],
    });
    expect(plan).toEqual({
      ok: false,
      stretch: { from: "2026-10-04", to: "2026-10-07", roomId: "cat-condo" },
    });
  });

  test("two dogs need one room for each stretch, or it is refused", () => {
    // Two dogs, suites hold one each: no single suite holds them.
    const plan = planKennels({
      ...stay,
      petIds: [1, 2],
      first: "cat-suite",
      changes: [],
    });
    expect(plan.ok).toBe(false);
    // A condo holds two.
    expect(
      planKennels({ ...stay, petIds: [1, 2], first: "cat-condo", changes: [] }),
    ).toEqual({ ok: true, unitAssignment: "c1", kennelMoves: [] });
  });
});
