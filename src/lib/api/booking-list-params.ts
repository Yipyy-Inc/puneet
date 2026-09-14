// ============================================================================
// Which bookings a screen asks GET /api/bookings for.
//
// The list used to be every booking the facility ever had, and most screens
// wanted a slice of it: one booking, one client, a day, the dates being booked,
// the open requests. On the e2e facility that was 1,000+ rows and seven view
// reads per call, enough to fail under load. A screen now names its slice.
//
// Shared by the browser (building the query string) and the route (reading
// it), so the two cannot drift. Pure: no fetch, no React, no Supabase.
//
// ── THE DATE WINDOW IS A SUPERSET ─────────────────────────────────────────
//
// `from`/`to` are facility-local days, and the rows are instants. Rather than
// convert here, the route pads the window by a day each side, and every caller
// keeps the exact day filter it already had. A booking the window lets through
// that the screen then drops costs nothing; one it wrongly held back would be a
// pet missing from a board.
// ============================================================================

export interface BookingListParams {
  /** One booking, by its public reference. */
  ref?: number;
  /** One client's bookings, by the client's reference. */
  clientRef?: number;
  /** Bookings still going on or after this day (YYYY-MM-DD). */
  from?: string;
  /** Bookings starting on or before this day (YYYY-MM-DD). */
  to?: string;
  /** Only these statuses. */
  statuses?: readonly string[];
  /** At most this many, newest first. */
  limit?: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = /^[a-z_]{1,40}$/;
export const MAX_BOOKING_LIST_LIMIT = 1000;

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d{1,12}$/.test(value)) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
}

/** The query string for `params`, "" when nothing narrows the list. */
export function bookingListSearch(params: BookingListParams = {}): string {
  const search = new URLSearchParams();
  if (params.ref) search.set("ref", String(params.ref));
  if (params.clientRef) search.set("clientRef", String(params.clientRef));
  if (params.from && DAY.test(params.from)) search.set("from", params.from);
  if (params.to && DAY.test(params.to)) search.set("to", params.to);
  const statuses = (params.statuses ?? []).filter((s) => STATUS.test(s));
  if (statuses.length > 0)
    search.set("statuses", [...statuses].sort().join(","));
  if (params.limit) {
    search.set(
      "limit",
      String(
        Math.min(Math.max(1, Math.floor(params.limit)), MAX_BOOKING_LIST_LIMIT),
      ),
    );
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** What the route may apply. Anything malformed is dropped, never guessed. */
export function parseBookingListParams(
  search: URLSearchParams,
): BookingListParams {
  const from = search.get("from");
  const to = search.get("to");
  const statuses = (search.get("statuses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => STATUS.test(s));
  const limit = positiveInt(search.get("limit"));
  return {
    ref: positiveInt(search.get("ref")),
    clientRef: positiveInt(search.get("clientRef")),
    from: from && DAY.test(from) ? from : undefined,
    to: to && DAY.test(to) ? to : undefined,
    statuses: statuses.length > 0 ? statuses : undefined,
    limit: limit ? Math.min(limit, MAX_BOOKING_LIST_LIMIT) : undefined,
  };
}

/** `day` moved by `days`, as YYYY-MM-DD, computed in UTC so no zone shifts it. */
export function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
