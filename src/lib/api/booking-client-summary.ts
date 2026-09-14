import { liveFetch } from "./live-fetch";

// ============================================================================
// Per-client facts from the facility's booking history, without the rows.
//
// GET /api/bookings/client-summary. Replaces loading every booking the
// facility ever had in the client picker, the booking form, client filters,
// the calendar's anniversary badge and loyalty retention.
// ============================================================================

export interface BookingClientSummary {
  clientRef: number;
  bookingCount: number;
  /** YYYY-MM-DD, the facility's own day. */
  firstDay: string;
  /** YYYY-MM-DD, the facility's own day. */
  lastDay: string;
  /** Lower-case services, every booking's. */
  services: string[];
  /** Any booking still confirmed or pending. */
  hasActive: boolean;
  /** Came back within 60 days of a previous booking, at least once. */
  rebookedWithin60Days: boolean;
}

export const bookingClientSummaryQueries = {
  all: () => ({
    queryKey: ["bookings", "client-summary"] as const,
    queryFn: async () =>
      liveFetch<BookingClientSummary[]>(
        "/api/bookings/client-summary",
        () => [],
        "booking summary",
      ),
  }),
};

/** The summary keyed by client ref, for lookups in a render. */
export function summaryByClient(
  rows: readonly BookingClientSummary[],
): Map<number, BookingClientSummary> {
  return new Map(rows.map((row) => [row.clientRef, row]));
}
