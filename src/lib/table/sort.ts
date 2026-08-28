/**
 * ============================================================================
 * How `DataTable` orders two cell values.
 *
 * Lifted out of the component so it can be tested directly. It is pure — no
 * React, no DOM — and `tests/unit/data-table-sort.test.ts` is the only reason
 * it is a separate file. `DataTable` is the only caller.
 *
 * ── WHY IT IS WORTH A TEST OF ITS OWN ─────────────────────────────────────
 *
 * This comparator is shared by ~88 screens. For most of that time it did only
 * the string comparison at the bottom, which meant every numeric column sorted
 * LEXICOGRAPHICALLY: 1000 ahead of 250, and boarding's own nightly rates put
 * $125 ahead of $38. The bug was invisible for a long time because it only
 * surfaces once a column holds values of differing digit length — a table of
 * two-digit prices sorts perfectly wrongly and looks perfectly right.
 *
 * It was found by eye, not by a test, on the HQ training price column. Hence
 * this file.
 * ============================================================================
 */

export type SortDirection = "asc" | "desc";

/**
 * Compare two already-resolved sort values, in the given direction.
 *
 * Returns the usual negative / zero / positive for `Array.prototype.sort`.
 */
export function compareSortValues(
  aVal: unknown,
  bVal: unknown,
  direction: SortDirection,
): number {
  // ── Numbers compare as numbers ──────────────────────────────────────────
  //
  // Guarded on BOTH sides being finite numbers, which is what keeps this
  // additive: every value that is not a number takes exactly the path it took
  // before, so the screens on this table are unaffected unless they were
  // already sorting wrongly.
  //
  // Numeric STRINGS are deliberately NOT coerced. PostgREST returns `numeric`
  // as a string, so it is tempting -- but "01234" is a postcode, a booking ref
  // keeps its leading zeros, and a version is not a float. A column that wants
  // numeric order says so with `sortValue: (row) => Number(row.field)`.
  if (
    typeof aVal === "number" &&
    typeof bVal === "number" &&
    Number.isFinite(aVal) &&
    Number.isFinite(bVal)
  ) {
    return direction === "asc" ? aVal - bVal : bVal - aVal;
  }

  const aStr = String(aVal).toLowerCase();
  const bStr = String(bVal).toLowerCase();
  if (aStr < bStr) return direction === "asc" ? -1 : 1;
  if (aStr > bStr) return direction === "asc" ? 1 : -1;
  return 0;
}
