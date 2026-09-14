import type { BookingTotals } from "@/app/api/bookings/totals/route";
import type { Booking } from "@/types/booking";

import {
  MAX_PAGE_SIZE,
  bookingPageSearch,
  type BookingPageParams,
} from "./booking-page-params";
import { liveFetch } from "./live-fetch";

// ============================================================================
// The bookings table a page at a time, and its tiles.
//
// GET /api/bookings/page and GET /api/bookings/totals. The bookings page used
// to load every booking the facility ever had; see the header of
// booking-page-params.ts.
// ============================================================================

export type { BookingTotals };

export interface BookingPage {
  bookings: Booking[];
  total: number;
}

const NO_PAGE: BookingPage = { bookings: [], total: 0 };

export const bookingPageQueries = {
  page: (params: BookingPageParams) => {
    const search = bookingPageSearch(params);
    return {
      queryKey: ["bookings", "page", search] as const,
      queryFn: async () =>
        liveFetch<BookingPage>(
          `/api/bookings/page${search}`,
          () => NO_PAGE,
          "bookings page",
        ),
    };
  },
  totals: (scope: { locationId?: string; assigned?: boolean }) => {
    const search = new URLSearchParams();
    if (scope.locationId) search.set("locationId", scope.locationId);
    if (scope.assigned) search.set("assigned", "1");
    const text = search.toString();
    return {
      queryKey: ["bookings", "totals", text] as const,
      queryFn: async () =>
        liveFetch<BookingTotals>(
          `/api/bookings/totals${text ? `?${text}` : ""}`,
          () => ({
            total: 0,
            today: 0,
            upcoming: 0,
            pending: 0,
            paidRevenue: 0,
            pendingRevenue: 0,
          }),
          "booking totals",
        ),
    };
  },
};

/**
 * Every booking matching `params`, page by page — for an export, which must
 * hold everything the table matches, not the fifteen on screen.
 */
export async function fetchAllBookingPages(
  params: BookingPageParams,
): Promise<Booking[]> {
  const all: Booking[] = [];
  for (let page = 1; page <= 200; page++) {
    const { bookings, total } = await liveFetch<BookingPage>(
      `/api/bookings/page${bookingPageSearch({ ...params, page, pageSize: MAX_PAGE_SIZE })}`,
      () => NO_PAGE,
      "bookings export",
    );
    all.push(...bookings);
    if (bookings.length === 0 || all.length >= total) break;
  }
  return all;
}
