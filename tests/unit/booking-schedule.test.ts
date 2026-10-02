import { describe, expect, test } from "bun:test";

import {
  advanceBounds,
  dayStatus,
  isoDay,
  monthGrid,
  pickRange,
  stayNights,
  toggleDay,
} from "@/lib/bookings/wizard/calendar-month";
import {
  checkCustomTime,
  chipTimes,
  dayWindows,
  defaultDropOff,
  defaultPickUp,
  hhmmOf,
  intersect,
  minutesOf,
} from "@/lib/bookings/wizard/time-windows";

// The client's facility (Doggieville): Mon–Sat 8–18, Sunday 10–15.
const HOURS = {
  monday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  tuesday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  wednesday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  thursday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  friday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  saturday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  sunday: { isOpen: true, openTime: "10:00", closeTime: "15:00" },
};
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("the month", () => {
  test("October 2026 starts on a Thursday, Sunday first", () => {
    const weeks = monthGrid(d(2026, 10, 1));
    expect(weeks[0]!.slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0]![4]!.getDate()).toBe(1);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  test("why a day cannot be picked", () => {
    const rules = {
      today: d(2026, 9, 30),
      hours: {
        ...HOURS,
        sunday: { isOpen: false, openTime: "", closeTime: "" },
      },
      blocked: new Set(["2026-10-12"]),
      full: new Set(["2026-10-10"]),
      holidays: [{ month: 10, day: 13, name: "Thanksgiving" }],
    };
    expect(dayStatus(d(2026, 9, 29), rules)).toBe("past");
    expect(dayStatus(d(2026, 9, 30), rules)).toBe("open");
    expect(dayStatus(d(2026, 10, 4), rules)).toBe("closed");
    expect(dayStatus(d(2026, 10, 10), rules)).toBe("full");
    expect(dayStatus(d(2026, 10, 12), rules)).toBe("blocked");
    expect(dayStatus(d(2026, 10, 13), rules)).toBe("holiday");
  });

  test("the booking window", () => {
    const now = new Date(2026, 8, 30, 12);
    const { minimum, maximum } = advanceBounds(now, 48, 30);
    const rules = { today: now, minimum, maximum };
    expect(dayStatus(d(2026, 10, 1), rules)).toBe("too-soon");
    expect(dayStatus(d(2026, 10, 2), rules)).toBe("open");
    expect(dayStatus(d(2026, 11, 5), rules)).toBe("too-far");
  });
});

describe("picking a stay (the mock's clickDay)", () => {
  const noFull = () => false;
  test("check-in, then check-out", () => {
    const first = pickRange({ start: null, end: null }, d(2026, 10, 1), noFull);
    expect(first).toEqual({ start: d(2026, 10, 1), end: null });
    const second = pickRange(first, d(2026, 10, 5), noFull);
    expect(second).toEqual({ start: d(2026, 10, 1), end: d(2026, 10, 5) });
    expect(stayNights(second.start, second.end!)).toHaveLength(4);
  });
  test("an earlier day, or a click after a whole stay, starts again", () => {
    expect(
      pickRange({ start: d(2026, 10, 5), end: null }, d(2026, 10, 1), noFull),
    ).toEqual({ start: d(2026, 10, 1), end: null });
    expect(
      pickRange(
        { start: d(2026, 10, 1), end: d(2026, 10, 5) },
        d(2026, 10, 8),
        noFull,
      ),
    ).toEqual({ start: d(2026, 10, 8), end: null });
  });
  test("a stay cannot cross a night with no room", () => {
    const full = (night: Date) => isoDay(night) === "2026-10-10";
    expect(
      pickRange({ start: d(2026, 10, 8), end: null }, d(2026, 10, 12), full),
    ).toEqual({ start: d(2026, 10, 12), end: null });
    // Checking OUT on the full day is fine: no night there.
    expect(
      pickRange({ start: d(2026, 10, 8), end: null }, d(2026, 10, 10), full),
    ).toEqual({ start: d(2026, 10, 8), end: d(2026, 10, 10) });
  });
  test("daycare days toggle, in date order", () => {
    const days = toggleDay([d(2026, 10, 9)], d(2026, 10, 5));
    expect(days.map(isoDay)).toEqual(["2026-10-05", "2026-10-09"]);
    expect(toggleDay(days, d(2026, 10, 9)).map(isoDay)).toEqual(["2026-10-05"]);
  });
});

describe("drop-off and pick-up times", () => {
  test("from the facility's hours that day", () => {
    const monday = dayWindows({
      date: d(2026, 10, 5),
      service: "boarding",
      hours: HOURS,
    })!;
    expect(monday.dropOff).toEqual({ start: 8 * 60, end: 17 * 60 });
    expect(monday.pickUp).toEqual({ start: 9 * 60, end: 18 * 60 });
    const sunday = dayWindows({
      date: d(2026, 10, 4),
      service: "boarding",
      hours: HOURS,
    })!;
    expect(sunday.dropOff).toEqual({ start: 10 * 60, end: 14 * 60 });
  });

  test("a date's own window wins", () => {
    const w = dayWindows({
      date: d(2026, 10, 5),
      service: "boarding",
      hours: HOURS,
      dropOffPickUp: [
        {
          date: "2026-10-05",
          services: ["boarding"],
          dropOffStart: "07:00",
          dropOffEnd: "11:00",
          pickUpStart: "15:00",
          pickUpEnd: "19:00",
        },
      ],
    })!;
    expect(w.dropOff).toEqual({ start: 420, end: 660 });
    expect(chipTimes(w.dropOff).map(hhmmOf)).toEqual([
      "07:00",
      "07:30",
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
    ]);
  });

  test("closed is no window", () => {
    expect(
      dayWindows({
        date: d(2026, 10, 4),
        service: "daycare",
        hours: {
          ...HOURS,
          sunday: { isOpen: false, openTime: "", closeTime: "" },
        },
      }),
    ).toBeNull();
  });

  test("a half day is a morning or an afternoon of its length", () => {
    const am = dayWindows({
      date: d(2026, 10, 5),
      service: "daycare",
      part: "am",
      halfHours: 5,
      hours: HOURS,
    })!;
    expect(am.dropOff).toEqual({ start: 480, end: 540 });
    expect(am.pickUp).toEqual({ start: 720, end: 780 });
    const pm = dayWindows({
      date: d(2026, 10, 5),
      service: "daycare",
      part: "pm",
      halfHours: 5,
      hours: HOURS,
    })!;
    expect(pm.dropOff).toEqual({ start: 780, end: 840 });
    expect(pm.pickUp).toEqual({ start: 1020, end: 1080 });
  });

  test("defaults, intersections, custom times", () => {
    const w = { start: 8 * 60, end: 18 * 60 };
    expect(hhmmOf(defaultDropOff(w))).toBe("08:00");
    expect(hhmmOf(defaultPickUp(w))).toBe("17:00");
    expect(hhmmOf(defaultPickUp({ start: 600, end: 900 }))).toBe("15:00");
    expect(intersect([w, { start: 600, end: 900 }])).toEqual({
      start: 600,
      end: 900,
    });
    expect(
      intersect([
        { start: 0, end: 60 },
        { start: 120, end: 180 },
      ]),
    ).toBeNull();
    const open = { start: 480, end: 1080 };
    expect(
      checkCustomTime(minutesOf("19:00"), { window: w, open }, true),
    ).toEqual({ ok: false, outside: true });
    expect(
      checkCustomTime(minutesOf("19:00"), { window: w, open }, false),
    ).toEqual({ ok: true, outside: true });
    expect(
      checkCustomTime(minutesOf("12:15"), { window: w, open }, true),
    ).toEqual({ ok: true, outside: false });
    expect(minutesOf("25:00")).toBeNull();
  });
});
