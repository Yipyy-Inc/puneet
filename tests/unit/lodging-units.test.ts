import { describe, expect, it } from "bun:test";

import { generateUnits } from "@/lib/api/lodging-units";

// ============================================================================
// Naming the units of a lodging type, against MoéGo's own worked examples.
//
// This is pure arithmetic over strings with no database and no browser, which
// is what tests/unit/ is for. The e2e proves a unit created here can be booked
// into; this proves it is called the right thing.
// ============================================================================

describe("MoéGo's own examples", () => {
  it('gives bare numbers with no prefix — "1, 2, 3"', () => {
    const units = generateUnits({ count: 3 }, "cat-vip");
    expect(units.map((u) => u.name)).toEqual(["1", "2", "3"]);
  });

  it('prefixes them when asked — "VIP Suite 1, VIP Suite 2, VIP Suite 3"', () => {
    const units = generateUnits({ count: 3, prefix: "VIP Suite" }, "cat-vip");
    expect(units.map((u) => u.name)).toEqual([
      "VIP Suite 1",
      "VIP Suite 2",
      "VIP Suite 3",
    ]);
  });

  it('starts where the building starts — "Room 101, Room 102"', () => {
    const units = generateUnits(
      { count: 2, prefix: "Room", start: 101 },
      "cat-std",
    );
    expect(units.map((u) => u.name)).toEqual(["Room 101", "Room 102"]);
  });
});

describe("padding is derived from the run, not asked for", () => {
  it("does not pad a run that never needs it", () => {
    // Three units are "1, 2, 3" and not "01, 02, 03" — MoéGo's example.
    expect(generateUnits({ count: 3 }, "c").map((u) => u.name)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("pads to the width of the LAST number, so the list sorts", () => {
    // 1..10 padded to one digit would sort "1, 10, 2". The width comes from
    // the end of the run precisely so it does not.
    const units = generateUnits({ count: 10 }, "c");
    expect(units[0].name).toBe("01");
    expect(units[9].name).toBe("10");
  });

  it("keeps one width across a run that crosses a power of ten", () => {
    const units = generateUnits({ count: 3, start: 99 }, "c");
    expect(units.map((u) => u.name)).toEqual(["099", "100", "101"]);
  });
});

describe("the ids", () => {
  it("key on the category, so two types may both hold a Room 101", () => {
    const a = generateUnits({ count: 1, prefix: "Room", start: 101 }, "cat-a");
    const b = generateUnits({ count: 1, prefix: "Room", start: 101 }, "cat-b");
    expect(a[0].name).toBe(b[0].name);
    expect(a[0].legacyId).not.toBe(b[0].legacyId);
  });

  it("are slug-safe even when the prefix is not", () => {
    const units = generateUnits({ count: 1, prefix: "Cat's Suite #2" }, "c");
    expect(units[0].legacyId).toMatch(/^[a-z0-9-]+$/);
  });

  it("survives a prefix with nothing slug-safe in it at all", () => {
    // "???" slugs to the empty string, and an id ending in a bare dash would
    // collide for every unit in the run.
    const units = generateUnits({ count: 2, prefix: "???" }, "c");
    expect(new Set(units.map((u) => u.legacyId)).size).toBe(2);
  });
});

describe("what it refuses to invent", () => {
  it("makes nothing from a count of zero", () => {
    expect(generateUnits({ count: 0 }, "c")).toEqual([]);
  });

  it("makes nothing from a negative count rather than throwing", () => {
    expect(generateUnits({ count: -4 }, "c")).toEqual([]);
  });

  it("treats an absent start as 1, not as NaN", () => {
    const units = generateUnits(
      { count: 2, start: undefined, prefix: "Run" },
      "c",
    );
    expect(units.map((u) => u.name)).toEqual(["Run 1", "Run 2"]);
  });

  it("numbers from zero when a facility numbers from zero", () => {
    // Not every building starts at one, and 0 is a real unit id — it must not
    // be mistaken for "unset" and silently become 1.
    const units = generateUnits({ count: 2, start: 0 }, "c");
    expect(units.map((u) => u.name)).toEqual(["0", "1"]);
  });

  it("sorts in the order it generated, from 1", () => {
    const units = generateUnits({ count: 3, start: 50 }, "c");
    expect(units.map((u) => u.sortOrder)).toEqual([1, 2, 3]);
  });
});
