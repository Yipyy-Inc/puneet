import "server-only";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// One facility's trading history, for the superadmin's Reports tab.
//
// The tab said "nothing stores this yet". It was the one place that claim was
// wrong: `bookings` and `payments` have been real for a fortnight, and nobody
// had put them together. The aggregation lives in `facility_report`
// (20260807620000) rather than here — see its header for the four decisions
// that change the numbers, the short version being:
//
//   money is dated by the booking it paid for, not by when the row was written
//   revenue excludes tips, because the tip is the groomer's
//   a refund nets itself, because refunds are negative ledger rows
//   grouping is by `service`, because `service_type` is null on most rows
//
// Everything here is cents and integers. The database stores numeric dollars;
// the boundary converts once so nothing downstream has to decide.
// ============================================================================

export interface ReportMonth {
  /** YYYY-MM. Every month in the range is present, including empty ones. */
  month: string;
  bookings: number;
  cancelled: number;
  completed: number;
  revenueCents: number;
  tipsCents: number;
}

export interface ReportService {
  service: string;
  bookings: number;
  cancelled: number;
  revenueCents: number;
}

export interface ReportTotals {
  bookings: number;
  cancelled: number;
  completed: number;
  revenueCents: number;
  tipsCents: number;
  /** Still owed on anything not cancelled. Credits on account are not debts. */
  outstandingCents: number;
  activeClients: number;
  newClients: number;
}

export interface FacilityReport {
  from: string;
  to: string;
  months: ReportMonth[];
  services: ReportService[];
  totals: ReportTotals;
}

/**
 * Long enough to see a season, short enough that the query stays small. The
 * screen offers 3, 6 and 12; anything outside that is clamped rather than
 * refused, because a hand-edited query string should not 400 a report.
 */
const MONTH_CHOICES = [3, 6, 12] as const;

export function clampMonths(value: unknown): number {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return 6;
  return MONTH_CHOICES.find((choice) => choice === Math.trunc(asNumber)) ?? 6;
}

export async function readFacilityReport(
  facilityId: string,
  months: number,
): Promise<FacilityReport> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("facility_report", {
    p_facility_id: facilityId,
    p_months: months,
  });

  if (error) throw new Error(error.message);

  // The function always returns an object with every key populated — an empty
  // facility gets zeros and a full month series, not nulls — so a missing
  // shape here means the call did not run, and that is worth surfacing rather
  // than papering over with defaults.
  if (!data) throw new Error("The report returned nothing.");

  return data as unknown as FacilityReport;
}
