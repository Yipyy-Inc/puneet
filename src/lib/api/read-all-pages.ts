// NOTE: deliberately NOT `server-only`, though every caller is server code.
// This module holds a loop and a number — no client, no key, nothing that could
// leak — and `server-only` throws on import from a test runner, which would put
// the one piece of logic here worth pinning out of reach of the unit tier. The
// callers carry the marker; this does not need to.

// ============================================================================
// Every row, when "every row" is what the caller meant.
//
// ── THE DEFECT THIS EXISTS TO STOP ────────────────────────────────────────
//
// Measured 2026-09-16: an unlimited `select` against this project returns
// exactly **1000 rows** — no error, no header a caller reads, nothing at all to
// separate "that is all of them" from "that is the first thousand".
//
// `GET /api/bookings` had no limit of its own, because the all-time readers ask
// for every booking. Ordered newest-first, so once a facility passed its
// thousandth booking it was its own HISTORY that silently disappeared from its
// own list. It surfaced only because a spec created a booking, read the list
// back, and could not find the row it had just written — reporting
// `amountPaid: NaN`, which says "the write did not happen". The write was
// perfect; the READ was short.
//
// Three more tables are already past the line on a single facility:
// `gift_card_transactions` at 12,940, `gift_cards` at 5,975, `facility_tasks`
// at 1,140. None of those reads shrinks over time — a ledger is append-only and
// a booking is never deleted — so raising a cap only moves the day it breaks.
//
// ── WHY A HELPER AND NOT FOUR LOOPS ───────────────────────────────────────
//
// Because the loop has one subtle case, and four copies is four chances to get
// it wrong: a page exactly equal to the page size must ask AGAIN rather than be
// assumed to be the end. A `< PAGE` test is the only one that cannot silently
// stop one row early.
// ============================================================================

/** PostgREST's ceiling on an unbounded select, measured rather than assumed. */
const PAGE = 1000;

/**
 * The minimum shape this needs from a PostgREST query builder: something that
 * takes a range and resolves to rows or an error.
 *
 * Typed structurally rather than against `PostgrestFilterBuilder` so a caller
 * can hand over a builder at any stage of construction — `.select().match()`,
 * `.select().eq().order()` — without the generics having to agree.
 */
export interface RangeableQuery<T> {
  range(
    from: number,
    to: number,
  ): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
}

/**
 * Read a query to exhaustion, a thousand rows at a time.
 *
 * Returns the error rather than throwing, so a route keeps whatever status it
 * already chose for a failed read.
 *
 * `supabase-js` mutates the builder's Range on each `.range()` call and returns
 * the same object, so re-ranging one builder is the supported way to page it —
 * which is why this takes the builder itself rather than a factory.
 */
export async function readAllPages<T>(
  query: RangeableQuery<T>,
): Promise<{ rows: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await query.range(offset, offset + PAGE - 1);
    if (error) return { rows, error };
    const page = data ?? [];
    rows.push(...page);
    // A short page is the last page. Equal-to-PAGE asks again, so the one case
    // that must not be guessed is not guessed.
    if (page.length < PAGE) break;
  }
  return { rows, error: null };
}
