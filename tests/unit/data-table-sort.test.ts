/**
 * ============================================================================
 * The DataTable comparator.
 *
 *   bun run test:unit
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 *
 * `DataTable` is shared by ~88 screens, and for most of that time every
 * numeric column on all of them sorted LEXICOGRAPHICALLY, because the
 * comparator stringified both sides before comparing. $125 came before $38.
 * 1000 came before 250. Nothing failed, nothing warned, and the table looked
 * exactly as sorted as a correct one does.
 *
 * It was caught by eye on the HQ training price column, months in. The fix was
 * six lines. What was missing was anything that would have caught it, so this
 * is that.
 *
 * ── AND WHY IT IS NOT A PLAYWRIGHT SPEC ───────────────────────────────────
 *
 * The rest of this repo's tests drive a real browser against a real Postgres,
 * because the things they check -- RLS, permissions, money -- only exist when
 * all of that is running. This is a pure function over two values. Testing it
 * through a screen would need seeded rows of a particular digit-length shape
 * in the one shared production database, to assert something three layers
 * below the screen. That trade is the wrong way round.
 * ============================================================================
 */

import { describe, expect, test } from "bun:test";
import { compareSortValues } from "@/lib/table/sort";

/** Sort a column of values the way DataTable does, and hand back the order. */
function order<T>(values: T[], direction: "asc" | "desc" = "asc"): T[] {
  return [...values].sort((a, b) => compareSortValues(a, b, direction));
}

describe("numbers sort as numbers", () => {
  // The exact shape of the bug: differing digit length is the whole trigger.
  // Every one of these lists is already in lexicographic order, so a
  // stringifying comparator returns them untouched and looks like it worked.
  test("differing digit length", () => {
    expect(order([1000, 250, 38, 125])).toEqual([38, 125, 250, 1000]);
  });

  test("boarding's own nightly rates, which is where it was found", () => {
    expect(order([125, 38, 45, 250])).toEqual([38, 45, 125, 250]);
  });

  test("descending is the same order, reversed", () => {
    expect(order([1000, 250, 38, 125], "desc")).toEqual([1000, 250, 125, 38]);
  });

  test("decimals, where a string compare puts 9.5 after 10.25", () => {
    expect(order([10.25, 9.5, 100.1])).toEqual([9.5, 10.25, 100.1]);
  });

  test("zero and negatives, where a string compare puts -5 last", () => {
    expect(order([0, -5, 3, -20])).toEqual([-20, -5, 0, 3]);
  });

  test("equal values compare equal in both directions", () => {
    expect(compareSortValues(42, 42, "asc")).toBe(0);
    expect(compareSortValues(42, 42, "desc")).toBe(0);
  });
});

describe("everything that is not a number is untouched", () => {
  // This half is the actual safety net. The numeric branch was added to a
  // comparator 88 screens already depended on, so the promise it makes is
  // that nothing else changed path.
  test("strings sort lexicographically", () => {
    expect(order(["Plateau", "mile end", "Ahuntsic"])).toEqual([
      "Ahuntsic",
      "mile end",
      "Plateau",
    ]);
  });

  test("string comparison is case-insensitive", () => {
    expect(compareSortValues("apple", "APPLE", "asc")).toBe(0);
  });

  test("booleans, dates and null do not throw and are deterministic", () => {
    expect(order([true, false])).toEqual([false, true]);
    // Stringified, so "b" < "null". Not obviously desirable, but it is what
    // these screens have always done and it is at least total and stable.
    expect(order([null, "b"])).toEqual(["b", null]);
    expect(
      order([
        new Date("2026-03-01T00:00:00Z"),
        new Date("2026-01-01T00:00:00Z"),
      ]).map((d) => d.toISOString().slice(0, 10)),
      // Date stringifies to "Thu Jan 01 ..." -- weekday-first, so this order is
      // not chronological. It is the order these screens have always had, and
      // changing it is a separate decision from fixing numbers. A column that
      // wants dates in date order says `sortValue: (row) => +row.when`.
    ).toEqual(["2026-03-01", "2026-01-01"]);
  });
});

describe("numeric strings are deliberately NOT coerced", () => {
  // If you are here because you "fixed" this and the test went red: read the
  // comment in src/lib/table/sort.ts first. PostgREST hands back `numeric` as
  // a string, which makes coercing every numeric-looking string very
  // tempting, and it silently corrupts identifiers that are not quantities.
  test("a leading zero survives, because it is a postcode not a quantity", () => {
    expect(order(["01234", "1234", "00999"])).toEqual([
      "00999",
      "01234",
      "1234",
    ]);
  });

  test("a numeric string column still sorts as text", () => {
    expect(order(["10", "9", "100"])).toEqual(["10", "100", "9"]);
  });

  test("the documented escape hatch is Number() in sortValue", () => {
    // What a column says when it means the quantity:
    //   sortValue: (row) => Number(row.totalPrice)
    const asWritten = ["1000.00", "250.00", "38.00"];
    expect(order(asWritten.map(Number))).toEqual([38, 250, 1000]);
  });

  test("a mixed column falls back to the string path on both sides", () => {
    // One side a number and the other a string means the guard does not fire,
    // so nothing is compared numerically by half-measure.
    expect(compareSortValues(9, "10", "asc")).toBeGreaterThan(0);
  });
});

describe("non-finite numbers take the string path rather than producing NaN", () => {
  // `a - b` on these yields NaN, which Array.prototype.sort treats as "equal"
  // and which would make the order depend on the engine. Number.isFinite is
  // what keeps them out.
  test("NaN does not throw and does not reorder", () => {
    expect(compareSortValues(NaN, NaN, "asc")).toBe(0);
  });

  test("Infinity compares as text, consistently", () => {
    const result = compareSortValues(Infinity, 5, "asc");
    expect(Number.isNaN(result)).toBe(false);
    expect(result).not.toBe(0);
  });
});
