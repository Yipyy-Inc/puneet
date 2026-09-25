import { describe, expect, test } from "bun:test";

import { reorderedClasses } from "@/lib/rooms/reorder-classes";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// What a drag on the Rooms tab saves. The order a facility sees, and the rows
// that must be written for it — only the ones whose number moves — numbered
// 1..n the way a new class is. The gap case is Doggieville's own shape on
// 2026-09-25: 1, 2, 14, 15.

const cls = (id: string, sortOrder: number) => ({ id, sortOrder });

describe("reordering kennel classes", () => {
  test("a swap at the end writes the two classes that moved, and no others", () => {
    const result = reorderedClasses(
      [cls("a", 1), cls("b", 2), cls("c", 3), cls("d", 4)],
      "d",
      "c",
    );
    expect(result?.ids).toEqual(["a", "b", "d", "c"]);
    expect(result?.moves).toEqual([cls("d", 3), cls("c", 4)]);
  });

  test("moving the last to the top renumbers everything below it", () => {
    const result = reorderedClasses(
      [cls("a", 1), cls("b", 2), cls("c", 3)],
      "c",
      "a",
    );
    expect(result?.ids).toEqual(["c", "a", "b"]);
    expect(result?.moves).toEqual([cls("c", 1), cls("a", 2), cls("b", 3)]);
  });

  test("numbers with gaps are closed up on the first drag, order kept", () => {
    const result = reorderedClasses(
      [cls("suites", 1), cls("old", 2), cls("private", 14), cls("condos", 15)],
      "condos",
      "private",
    );
    expect(result?.ids).toEqual(["suites", "old", "condos", "private"]);
    expect(result?.moves).toEqual([cls("condos", 3), cls("private", 4)]);
  });

  test("a drop where it started, or on an unknown id, saves nothing", () => {
    const list = [cls("a", 1), cls("b", 2)];
    expect(reorderedClasses(list, "a", "a")).toBeNull();
    expect(reorderedClasses(list, "a", "zzz")).toBeNull();
    expect(reorderedClasses(list, "zzz", "a")).toBeNull();
  });
});
