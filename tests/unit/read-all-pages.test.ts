import { describe, expect, test } from "bun:test";

import { readAllPages } from "@/lib/api/read-all-pages";

// ============================================================================
// The paging loop, against a fake PostgREST.
//
// Worth isolating for one reason: the case that must not be guessed is a page
// EXACTLY equal to the page size. A `<= PAGE` or a "stop when the page is
// empty-ish" test either drops the tail or loops forever, and neither shows up
// on a table with 37 rows. The real tables are 12,940 and 5,975.
// ============================================================================

/** A builder that hands out `total` rows a page at a time, counting calls. */
function fakeQuery(total: number) {
  const calls: [number, number][] = [];
  return {
    calls,
    range(from: number, to: number) {
      calls.push([from, to]);
      const rows = [];
      for (let i = from; i <= Math.min(to, total - 1); i++) rows.push({ i });
      return Promise.resolve({ data: rows, error: null });
    },
  };
}

describe("readAllPages", () => {
  test("a short first page is the only request", async () => {
    const q = fakeQuery(37);
    const { rows, error } = await readAllPages(q);
    expect(error).toBeNull();
    expect(rows.length).toBe(37);
    expect(q.calls).toEqual([[0, 999]]);
  });

  test("more than a page comes back whole", async () => {
    const q = fakeQuery(2500);
    const { rows } = await readAllPages(q);
    expect(rows.length).toBe(2500);
    expect(q.calls.length).toBe(3);
    // Contiguous and non-overlapping: a gap loses rows, an overlap duplicates
    // them, and a total computed from either is wrong without looking wrong.
    expect(q.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(new Set(rows.map((r) => (r as { i: number }).i)).size).toBe(2500);
  });

  test("EXACTLY one page asks again rather than assuming the end", async () => {
    const q = fakeQuery(1000);
    const { rows } = await readAllPages(q);
    expect(rows.length).toBe(1000);
    // The second call is the point: a full page is indistinguishable from a
    // full page that happens to be the last one, so it must be checked.
    expect(q.calls.length).toBe(2);
  });

  test("exactly two pages, likewise", async () => {
    const q = fakeQuery(2000);
    const { rows } = await readAllPages(q);
    expect(rows.length).toBe(2000);
    expect(q.calls.length).toBe(3);
  });

  test("no rows is one request and an empty answer, not an error", async () => {
    const q = fakeQuery(0);
    const { rows, error } = await readAllPages(q);
    expect(rows).toEqual([]);
    expect(error).toBeNull();
    expect(q.calls.length).toBe(1);
  });

  test("an error stops the loop and is returned, not thrown", async () => {
    let calls = 0;
    const failing = {
      range(_from: number, _to: number) {
        calls++;
        return Promise.resolve({
          data: null,
          error: { message: "statement timeout" },
        });
      },
    };
    const { rows, error } = await readAllPages(failing);
    expect(error?.message).toBe("statement timeout");
    expect(rows).toEqual([]);
    // It must not keep asking after a failure — the caller decides the status.
    expect(calls).toBe(1);
  });

  test("a failure on a LATER page still surfaces", async () => {
    let calls = 0;
    const flaky = {
      range(from: number, to: number) {
        calls++;
        if (from === 0) {
          const rows = [];
          for (let i = 0; i < 1000; i++) rows.push({ i });
          return Promise.resolve({ data: rows, error: null });
        }
        return Promise.resolve({ data: null, error: { message: "gone" } });
      },
    };
    const { rows, error } = await readAllPages(flaky);
    // The rows read so far come back WITH the error, so a caller that wants to
    // fail loudly can, and nothing silently passes off a partial read as whole.
    expect(error?.message).toBe("gone");
    expect(rows.length).toBe(1000);
    expect(calls).toBe(2);
  });
});
