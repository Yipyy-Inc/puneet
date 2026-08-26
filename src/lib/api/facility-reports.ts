"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

// ============================================================================
// The facility reports that have a real source.
//
// Six shapes below mirror what the fixture selector they replace used to
// return, deliberately: the chart and table JSX in `report-sheet.tsx` is ~700
// lines of working code, and converting the DATA without rewriting the
// rendering is what makes this a conversion rather than a rebuild. The
// seventh, `training-attendance-by-location`, has no fixture counterpart to
// mirror — it answers only what a training booking and its attendance record
// can say (bookings, check-ins, check-outs, per branch). "Classes" and
// "enrollments" have no real table and stay unanswered rather than invented.
//
// Two columns are absent on purpose and their absence is the finding:
//
//   advanceNotice / cancellationTime — `generateCancellationReport` returned
//     the literal string "2 days" for every row, with `// Mock` beside it, and
//     set the cancellation time to the booking's own start date. There is no
//     `cancelled_at` on `bookings`, so neither is knowable.
//   staffCount — "Staff Time by Service" estimated hours from booking duration
//     and invented a head count. `staff_shifts` is real but carries no service,
//     so staff time per service is not derivable at all. Booked hours per
//     service IS real, and is what the number always was.
//   clv — the customer table showed "CLV (Est.)". An estimate with no stated
//     model is a number nobody can check or argue with, which is the same
//     problem as an invented one. `totalSpent` is what a client has actually
//     paid, and average order value divides out of it honestly.
// ============================================================================

export interface ServiceRevenue {
  service: string;
  revenue: number;
  bookings: number;
}

export interface ServiceHours {
  service: string;
  hours: number;
}

export interface LocationRevenue {
  /** Null for bookings whose branch was later deleted -- grouped under "No
   *  branch" rather than dropped. */
  locationId: string | null;
  location: string;
  revenue: number;
  bookings: number;
}

export interface ServiceLocationRevenue {
  service: string;
  locationId: string | null;
  location: string;
  revenue: number;
  bookings: number;
}

export interface MonthlyLocationRevenue {
  /** "YYYY-MM". */
  month: string;
  locationId: string | null;
  location: string;
  revenue: number;
}

export interface OccupancyDay {
  date: string;
  occupied: number;
  capacity: number;
  /** Already a percentage, 0–100, as the chart expects. */
  occupancyRate: number;
  revenue: number;
}

export interface CancelledBooking {
  date: string;
  service: string;
  clientName: string;
  petName: string;
  reason: string | null;
  /** Real. The fixture read a field that does not exist, so it was always 0. */
  refundAmount: number;
}

export interface CustomerValue {
  id: string;
  name: string;
  email: string | null;
  totalSpent: number;
  totalBookings: number;
  lastVisit: string | null;
}

export interface RevenueDay {
  date: string;
  gross: number;
  refunded: number;
  net: number;
  transactions: number;
}

export interface RevenueByServiceData {
  current: ServiceRevenue[];
  previous: ServiceRevenue[];
  hours: ServiceHours[];
}

/** No `hours` key -- booked hours per BRANCH isn't a number anyone asked for. */
export interface RevenueByLocationData {
  current: LocationRevenue[];
  previous: LocationRevenue[];
}

export interface ServiceMixByLocationData {
  current: ServiceLocationRevenue[];
  previous: ServiceLocationRevenue[];
}

export interface TrainingAttendanceByLocation {
  locationId: string | null;
  location: string;
  bookings: number;
  checkedIn: number;
  checkedOut: number;
}

export interface TrainingAttendanceByLocationData {
  current: TrainingAttendanceByLocation[];
  previous: TrainingAttendanceByLocation[];
}

export interface OccupancyData {
  current: OccupancyDay[];
  previous: OccupancyDay[];
}

export interface CancelledData {
  current: CancelledBooking[];
  previousRefunds: number;
  previousCount: number;
}

export interface CustomerValueData {
  customers: CustomerValue[];
  activeClients: number;
  prevActiveClients: number;
  /** Active in BOTH windows. Retention's numerator. */
  returningClients: number;
  /** First booking EVER falls in this window. */
  newClients: number;
  prevNewClients: number;
}

export interface TotalRevenueData {
  daily: RevenueDay[];
  transactions: number;
  gross: number;
  refunded: number;
  prevGross: number;
}

export type ReportDataset =
  | RevenueByServiceData
  | RevenueByLocationData
  | ServiceMixByLocationData
  | TrainingAttendanceByLocationData
  | OccupancyData
  | CancelledData
  | CustomerValueData
  | TotalRevenueData;

export interface ReportResponse {
  report: string;
  window: { from: string; to: string };
  data: ReportDataset | null;
}

export const facilityReportQueries = {
  dataset: (report: string, from: string, to: string) => ({
    queryKey: ["facility-report", report, from, to] as const,
    queryFn: async (): Promise<ReportResponse> => {
      const params = new URLSearchParams({ report, from, to });
      const response = await fetch(`/api/facility/reports?${params}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not read this report.");
      }
      return (await response.json()) as ReportResponse;
    },
  }),
};

/**
 * `enabled` rather than a conditional hook: the sheet mounts before a report is
 * chosen, and a hook that is sometimes called is a hook that breaks the rules.
 */
export function useFacilityReport(
  report: string | null,
  from: string,
  to: string,
) {
  return useQuery({
    ...facilityReportQueries.dataset(report ?? "", from, to),
    enabled: Boolean(report),
    placeholderData: keepPreviousData,
  });
}

/** Trailing months of revenue per branch -- a different shape than the
 *  current/previous reports above, so its own endpoint and its own hook. */
export function useRevenueTrendByLocation(months = 12) {
  return useQuery({
    queryKey: ["facility-report", "revenue-trend", months] as const,
    queryFn: async (): Promise<MonthlyLocationRevenue[]> => {
      const response = await fetch(
        `/api/facility/reports/revenue-trend?months=${months}`,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not read the revenue trend.");
      }
      const body = (await response.json()) as {
        data: MonthlyLocationRevenue[];
      };
      return body.data;
    },
  });
}
