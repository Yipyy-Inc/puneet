// ============================================================================
// A DATE SOMEBODY TYPED, READ ONE WAY ONLY.
//
// ── WHAT THIS FIXES ───────────────────────────────────────────────────────
//
// Both date pickers accepted `d/d/yyyy` and read it as MONTH first, always:
//
//     "03/09/2026"  ->  3 September 2026
//
// A Canadian typing that means 9 March. §6 rule 8 exists for precisely this
// and says why in one line — "Canada reads all three orders and this is a
// boarding product, where the wrong month is a dog in the wrong week." The
// placeholder even advertised the ambiguous form: "YYYY-MM-DD or MM/DD/YYYY".
//
// Nothing reported it, because a wrong-but-valid date is not an error. The
// booking is made, the run is reserved, and the animal arrives six months
// early or the owner arrives to an empty kennel.
//
// So slash input is REFUSED rather than guessed. An error a person can read
// beats a date they cannot check.
//
// ── AND WHY IT IS A LIB ───────────────────────────────────────────────────
//
// There were TWO copies of this function, in calendar.tsx and
// date-picker.tsx, subtly different: one routed through an ISO helper, one
// built the Date inline. Two copies of a parser means a fix to one does not
// reach the other, which is how the second copy would have kept reading
// American dates after the first was corrected. One implementation, and
// tests/unit/parse-typed-date.test.ts is the thing that could not exist while
// it lived inside two components.
// ============================================================================

/** ISO 8601 calendar date, the only unambiguous form: `2026-09-01`. */
const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/**
 * A date the user typed, or `null` if it is not one.
 *
 * Returns a LOCAL midnight `Date`, which is what both pickers want: these are
 * calendar days a person picked, not instants.
 *
 * Rejects `03/09/2026` and every other slash form on purpose — see the header.
 */
export function parseTypedDate(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const match = ISO.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  // 2026-02-31 parses to 3 March without this. A date that rolls over is not
  // the date that was typed, and accepting it is the same class of defect as
  // reading the month first.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}
