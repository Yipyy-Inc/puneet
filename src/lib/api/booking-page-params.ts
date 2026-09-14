// ============================================================================
// One page of the bookings table, as the page asks for it and the route reads
// it.
//
// The bookings page loaded every booking the facility ever had and searched,
// filtered, sorted and paged them in the browser. It asks GET
// /api/bookings/page for one page now. This module is the one place both
// sides agree on what may be asked: shared, pure, and unit-tested.
//
// Anything malformed is dropped, never guessed: a status that is not one, a
// sort that is not offered, a date that is not a day.
// ============================================================================

export const BOOKING_STATUS_VALUES = [
  "pending",
  "estimate_sent",
  "request_submitted",
  "waitlisted",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
  "no_show",
  "cancelled",
  "declined",
] as const;

/** The columns the server can order by, and the column each one means. */
export const BOOKING_PAGE_SORTS = {
  id: "ref",
  dates: "start_at",
  status: "status",
  totalCost: "total_cost",
} as const;
export type BookingPageSort = keyof typeof BOOKING_PAGE_SORTS;

export const DEFAULT_PAGE_SIZE = 15;
/** A screen reads at most 100 rows; an export may page through 500 at a time. */
export const MAX_PAGE_SIZE = 500;

export interface BookingPageParams {
  page?: number;
  pageSize?: number;
  /** A booking number, or part of the client's name. */
  q?: string;
  status?: string;
  service?: string;
  paymentStatus?: string;
  /** A booking tag, by its facility_tags id. */
  tagId?: string;
  /** "today": bookings starting today, on the facility's clock. */
  view?: "all" | "today";
  /** Bookings overlapping this day range (YYYY-MM-DD, `to` defaults to `from`). */
  from?: string;
  to?: string;
  locationId?: string;
  /** Only the bookings assigned to the viewer (view_bookings = assigned_only). */
  assigned?: boolean;
  sort?: BookingPageSort;
  dir?: "asc" | "desc";
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORD = /^[a-z][a-z_-]{0,39}$/;
const STATUSES = new Set<string>(BOOKING_STATUS_VALUES);

function positiveInt(value: string | null | undefined): number | undefined {
  if (!value || !/^\d{1,9}$/.test(value)) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
}

/** Only what the route would accept, so both sides mean the same request. */
export function normalizeBookingPageParams(
  input: Record<string, string | null | undefined>,
): Required<Pick<BookingPageParams, "page" | "pageSize" | "view" | "dir">> &
  BookingPageParams {
  const q = (input.q ?? "").trim().slice(0, 100);
  const status = input.status ?? "";
  const service = input.service ?? "";
  const paymentStatus = input.paymentStatus ?? "";
  const tagId = input.tagId ?? "";
  const from = input.from ?? "";
  const to = input.to ?? "";
  const locationId = input.locationId ?? "";
  const sort = input.sort ?? "";
  return {
    page: positiveInt(input.page) ?? 1,
    pageSize: Math.min(
      positiveInt(input.pageSize) ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    ),
    q: q || undefined,
    status: STATUSES.has(status) ? status : undefined,
    service: WORD.test(service) ? service : undefined,
    paymentStatus: WORD.test(paymentStatus) ? paymentStatus : undefined,
    tagId: UUID.test(tagId) ? tagId : undefined,
    view: input.view === "today" ? "today" : "all",
    from: DAY.test(from) ? from : undefined,
    to: DAY.test(to) ? to : undefined,
    locationId: UUID.test(locationId) ? locationId : undefined,
    assigned: input.assigned === "1" ? true : undefined,
    // An own key only: `in` would also admit "toString" and hand the route a
    // function to order by.
    sort: Object.hasOwn(BOOKING_PAGE_SORTS, sort)
      ? (sort as BookingPageSort)
      : undefined,
    dir: input.dir === "asc" ? "asc" : "desc",
  };
}

/** The query string for one page. */
export function bookingPageSearch(params: BookingPageParams): string {
  const search = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  };
  set("page", params.page);
  set("pageSize", params.pageSize);
  set("q", params.q?.trim());
  set("status", params.status);
  set("service", params.service);
  set("paymentStatus", params.paymentStatus);
  set("tagId", params.tagId);
  if (params.view === "today") set("view", "today");
  set("from", params.from);
  set("to", params.to);
  set("locationId", params.locationId);
  if (params.assigned) set("assigned", "1");
  set("sort", params.sort);
  if (params.sort) set("dir", params.dir ?? "desc");
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** A search term made safe to put inside a PostgREST `ilike` pattern. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_,()]/g, (c) => `\\${c}`)}%`;
}
