import { describe, expect, test } from "bun:test";

import {
  firstStay,
  rangeStart,
  stayForNight,
  staysInOrder,
} from "@/lib/boarding/stay-segments";

// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// A booking that moves kennels part-way holds its stays as a sequence, and
// two facts come from different rows of it: presence from the FIRST stay,
// where the database stamps arrival and departure, and the kennel from the
// stay the pet sleeps in that night. PostgREST embeds one object while a
// booking can hold only one stay and a list once it can hold several; a
// reader that expects the other shape reads `undefined` on every row — an
// empty board and no error — so every helper takes both.

const suite = {
  segment_order: 1,
  occupies: '["2027-06-01 18:00:00+00","2027-06-04 18:00:00+00")',
  room: "Suite 4",
};
const condo = {
  segment_order: 2,
  occupies: '["2027-06-04 18:00:00+00","2027-06-07 15:00:00+00")',
  room: "Condo 12",
};

describe("a booking's stays, in order", () => {
  test("one object, a list in any order, or nothing", () => {
    expect(staysInOrder(suite)).toEqual([suite]);
    expect(staysInOrder([condo, suite])).toEqual([suite, condo]);
    expect(staysInOrder(null)).toEqual([]);
    expect(staysInOrder(undefined)).toEqual([]);
  });

  test("presence comes from the first stay, whatever order they arrive in", () => {
    expect(firstStay([condo, suite])).toBe(suite);
    expect(firstStay(suite)).toBe(suite);
    expect(firstStay([])).toBeNull();
  });
});

describe("where a range begins", () => {
  test("Postgres's own spelling of a timestamp", () => {
    expect(rangeStart(suite.occupies)).toBe(Date.parse("2027-06-01T18:00:00Z"));
    expect(
      rangeStart('["2027-06-01 14:00:00-04","2027-06-02 11:00:00-04")'),
    ).toBe(Date.parse("2027-06-01T18:00:00Z"));
    expect(
      rangeStart('["2027-06-01 18:00:00.25+00","2027-06-02 15:00:00+00")'),
    ).toBe(Date.parse("2027-06-01T18:00:00.250Z"));
  });

  test("no lower bound, or not a range, is no start", () => {
    expect(rangeStart('(,"2027-06-02 15:00:00+00")')).toBeNull();
    expect(rangeStart("empty")).toBeNull();
    expect(rangeStart(null)).toBeNull();
    expect(rangeStart(42)).toBeNull();
  });
});

describe("the kennel for a night", () => {
  const stays = [condo, suite];

  test("before the move, the first kennel", () => {
    expect(stayForNight(stays, "2027-06-01")?.room).toBe("Suite 4");
    expect(stayForNight(stays, "2027-06-03")?.room).toBe("Suite 4");
  });

  test("on the day of the move, the kennel the pet sleeps in that night", () => {
    expect(stayForNight(stays, "2027-06-04")?.room).toBe("Condo 12");
  });

  test("on the way out, the last; before the stay, the first", () => {
    expect(stayForNight(stays, "2027-06-07")?.room).toBe("Condo 12");
    expect(stayForNight(stays, "2027-05-20")?.room).toBe("Suite 4");
  });

  test("one stay is the kennel every night", () => {
    expect(stayForNight(suite, "2027-06-02")).toBe(suite);
    expect(stayForNight(null, "2027-06-02")).toBeNull();
  });
});
