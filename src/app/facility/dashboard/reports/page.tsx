import { forbidden } from "next/navigation";

import { ReportsHub } from "./_components/reports-hub";
import { activeAdminFacility } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { previousWindow } from "@/components/reports/report-range";
import { computeDelta } from "@/lib/format";

// ============================================================================
// The facility Reports page.
//
// ── WHAT THIS USED TO BE ──────────────────────────────────────────────────
//
// A synchronous Server Component opening `const facilityId = 11` — a FIXTURE
// id, unreachable from Postgres — and reading `revenueByService()`,
// `bookingsByPeriod()`, `occupancy()` and `clientMetrics()` from
// `src/lib/report-data-sources.ts`, which reads `@/data/bookings` and friends.
// Every figure on the page was invented. Its own comment said they were
// "derived from the real stores via the report-data-sources selectors", which
// was true only if a TypeScript array counts as a store.
//
// It stopped being harmless on 2026-08-24, when the Yipyy Pay Transactions tab
// began reporting the same kind of number from `public.payments`. Two screens
// disagreeing, one of them right, and the wrong one looks older.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// Never from a constant and never from the request. `activeAdminFacility()`
// reads the signed JWT's memberships, so the page can only ever report on a
// business the viewer administers — and a viewer who administers two is ASKED
// rather than guessed at. `bun run check:facility-from-session` keeps it so.
//
// ── ONE ROUND TRIP FOR BOTH WINDOWS ───────────────────────────────────────
//
// `facility_report_kpis` takes the current window AND the previous one, because
// retention is not a property of a period: it asks how many of LAST period's
// clients came back, so its denominator lives in the other window. Computing
// the two separately would have meant two queries that could disagree about
// which bookings fell on the boundary.
// ============================================================================

/** Six months back, which is the window the page has always shown. */
const WINDOW_MONTHS = 6;

interface Kpis {
  bookings: number;
  prevBookings: number;
  revenue: number;
  prevRevenue: number;
  activeClients: number;
  prevActiveClients: number;
  occupancyRate: number;
  prevOccupancyRate: number;
  retentionRate: number;
  aov: number;
  prevAov: number;
  capacity: number;
  boardingNights: number;
}

const EMPTY: Kpis = {
  bookings: 0,
  prevBookings: 0,
  revenue: 0,
  prevRevenue: 0,
  activeClients: 0,
  prevActiveClients: 0,
  occupancyRate: 0,
  prevOccupancyRate: 0,
  retentionRate: 0,
  aov: 0,
  prevAov: 0,
  capacity: 0,
  boardingNights: 0,
};

export default async function ReportsPage() {
  const active = await activeAdminFacility();
  // A real 403 rather than a redirect or an empty page: the layout already
  // admits only facility administrators, so arriving here without a facility
  // means something is wrong rather than merely unauthorised.
  if (active.kind !== "resolved") forbidden();

  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - WINDOW_MONTHS);
  const range = { from: from.toISOString(), to: to.toISOString() };
  const prev = previousWindow({
    from: range.from.slice(0, 10),
    to: range.to.slice(0, 10),
  });

  const supabase = await createServerClient();
  const { data } = await supabase.rpc("facility_report_kpis", {
    p_facility_id: active.facility.id,
    p_from: range.from,
    p_to: range.to,
    p_prev_from: new Date(prev.from).toISOString(),
    p_prev_to: new Date(prev.to).toISOString(),
  });

  // A refusal from RLS returns null, not an error. Zeros are the truthful
  // answer for somebody who cannot see this facility's figures — never the
  // last facility's numbers, and never a crash.
  const k = { ...EMPTY, ...((data as Partial<Kpis> | null) ?? {}) };

  const kpis = {
    totalBookings: Number(k.bookings),
    totalRevenue: Number(k.revenue),
    // The RPC returns a fraction; the hub has always shown a percentage.
    occupancyRate: Number(k.occupancyRate) * 100,
    retentionRate: Number(k.retentionRate) * 100,
    activeClients: Number(k.activeClients),
    aov: Number(k.aov),
  };

  const deltas = {
    revenue: computeDelta(Number(k.revenue), Number(k.prevRevenue)),
    bookings: computeDelta(Number(k.bookings), Number(k.prevBookings)),
    occupancy: computeDelta(
      Number(k.occupancyRate) * 100,
      Number(k.prevOccupancyRate) * 100,
    ),
    activeClients: computeDelta(
      Number(k.activeClients),
      Number(k.prevActiveClients),
    ),
    aov: computeDelta(Number(k.aov), Number(k.prevAov)),
  };

  return (
    <ReportsHub
      kpis={kpis}
      deltas={deltas}
      facilityName={active.facility.name}
    />
  );
}
