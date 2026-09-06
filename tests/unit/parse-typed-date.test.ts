import { describe, expect, test } from "bun:test";

import { parseTypedDate } from "../../src/lib/dates/parse-typed-date";

// The behaviour §6 rule 8 asks for, asserted rather than described. Both date
// pickers used to read "03/09/2026" as 3 September; in a boarding product that
// is an animal booked into the wrong month.

describe("a date somebody typed", () => {
  test("ISO is accepted", () => {
    const date = parseTypedDate("2026-09-01");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(8); // September
    expect(date?.getDate()).toBe(1);
  });

  test("ISO with single-digit parts is accepted", () => {
    const date = parseTypedDate("2026-9-1");
    expect(date?.getMonth()).toBe(8);
    expect(date?.getDate()).toBe(1);
  });

  test("surrounding whitespace does not matter", () => {
    expect(parseTypedDate("  2026-09-01  ")?.getDate()).toBe(1);
  });

  test("it returns local midnight, not a UTC instant", () => {
    const date = parseTypedDate("2026-09-01");
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
  });

  describe("an ambiguous slash date is refused, not guessed", () => {
    // Each of these was silently read month-first before.
    for (const input of [
      "03/09/2026",
      "3/9/2026",
      "12/31/2025",
      "31/12/2025",
      "2026/09/01",
    ]) {
      test(input, () => {
        expect(parseTypedDate(input)).toBeNull();
      });
    }
  });

  describe("a date that does not exist is refused", () => {
    // Without the round-trip check `new Date(2026, 1, 31)` is 3 March.
    for (const input of [
      "2026-02-31",
      "2026-13-01",
      "2026-00-10",
      "2026-04-31",
    ]) {
      test(input, () => {
        expect(parseTypedDate(input)).toBeNull();
      });
    }
  });

  describe("nothing at all is refused", () => {
    for (const input of ["", "   ", "tomorrow", "2026", "2026-09", "--"]) {
      test(JSON.stringify(input), () => {
        expect(parseTypedDate(input)).toBeNull();
      });
    }
  });

  test("a leap day is a real date", () => {
    expect(parseTypedDate("2028-02-29")?.getDate()).toBe(29);
    expect(parseTypedDate("2026-02-29")).toBeNull();
  });
});
