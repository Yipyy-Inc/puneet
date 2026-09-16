import type { DateRange } from "../_components/GiftCardDateRangeFilter";

// ============================================================================
// A picked range, as `/api/gift-cards/totals` wants it.
//
// Two conversions live here, and both are the kind that go wrong once and then
// silently.
//
// ── THE END DAY IS INCLUSIVE HERE AND EXCLUSIVE THERE ─────────────────────
//
// `DateRange` is a pair of local `Date`s and its `end` is the LAST day the user
// picked, at 23:59:59.999. The route compares `issued_at < to`, so handing it
// that same day would drop everything sold on it — a whole day of revenue
// missing from the last day of every period, which is exactly the day someone
// checks. `to` is therefore the day AFTER.
//
// ── toISOString() IS THE WRONG FUNCTION ───────────────────────────────────
//
// It converts to UTC first. West of Greenwich, `new Date(2026, 8, 16)` at local
// midnight is `2026-09-16T04:00:00Z` — fine — but an `end` at 23:59:59.999 on
// the 16th is `2026-09-17T03:59Z`, and in Montreal an early-morning instant
// goes the other way. The day is read off the LOCAL calendar fields instead,
// because the range the user picked is the one on their wall.
// ============================================================================

/** `d` as YYYY-MM-DD on the local calendar, never via UTC. */
export function localDay(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** The day after `d`, still local. Month and year roll over on their own. */
export function nextLocalDay(d: Date): string {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return localDay(next);
}

/**
 * `{ from, to }` for the totals route: `from` inclusive, `to` exclusive.
 *
 * A caller passes these as `salesFrom`/`salesTo` or `redeemFrom`/`redeemTo`.
 */
export function totalsWindow(range: DateRange): { from: string; to: string } {
  return { from: localDay(range.start), to: nextLocalDay(range.end) };
}
