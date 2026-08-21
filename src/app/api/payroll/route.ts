import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// What we owe people for a period that has ended.
//
// ── THIS IS NOT THE CALENDAR'S LABOUR-COST TILE ───────────────────────────
//
// That one answers "what will next week's rota cost" — a forecast over PLANNED
// shifts, for whoever builds the rota. This answers "what did people actually
// work, and what does that come to" — a different number, from different rows
// (`staff_time_clock_entries`), for a different person.
//
// The two were conflated, which is how the ACCOUNTANT ended up holding
// `view_payroll` and `scheduling_view_labor_cost` with no screen to use either
// on: they are staff-level (ADR 0005) and every surface showing money was in
// the admin-only /facility portal. This is the surface they were missing, and
// it lives in the staff shell where they can reach it.
//
// ── ONE RPC, AND DELIBERATELY NOT A QUERY ─────────────────────────────────
//
// An accountant does not hold `scheduling_view_all`, so RLS will not show them
// another person's clock entries or the shifts those were worked against —
// correctly, because an accountant has no business browsing the rota.
//
// `payroll_summary` is SECURITY DEFINER, checks `view_payroll` against the
// facility it was handed, and returns the TOTALS. Widening two read policies
// instead would have handed over every shift and every session as raw rows to
// arrive at a figure.
// ============================================================================

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface PayrollLine {
  employeeId: string;
  employeeName: string;
  /** Closed sessions in the period. */
  sessions: number;
  hourlyMinutes: number;
  /** Worked, but this position is salaried — the pay does not come from them. */
  salariedMinutes: number;
  /** No shift, or a position with no rate. Real work that cannot be priced. */
  unpricedMinutes: number;
  gross: number;
  /** Still on the clock. Counted, never guessed at. */
  openSessions: number;
}

export interface PayrollPayload {
  from: string;
  to: string;
  /**
   * The facility's own timezone.
   *
   * Returned so the screen can compute its NEXT period in the right calendar.
   * The first one is decided here for exactly that reason: a client cannot
   * work out "the last fortnight at this facility" before it knows where the
   * facility is, and guessing with the browser's clock is the bug this
   * codebase just spent a day removing from attendance.
   */
  timeZone: string;
  lines: PayrollLine[];
  totals: {
    gross: number;
    hourlyMinutes: number;
    salariedMinutes: number;
    unpricedMinutes: number;
    openSessions: number;
  };
}

interface SummaryRow {
  staff_id: string;
  first_name: string | null;
  last_name: string | null;
  sessions: number;
  hourly_minutes: number;
  salaried_minutes: number;
  unpriced_minutes: number;
  gross: string | number;
  open_sessions: number;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const asked = { from: params.get("from"), to: params.get("to") };

  if (
    (asked.from && !DATE.test(asked.from)) ||
    (asked.to && !DATE.test(asked.to))
  ) {
    return NextResponse.json(
      { error: "`from` and `to` are dates, as YYYY-MM-DD." },
      { status: 400 },
    );
  }

  // A default fortnight, in the FACILITY's calendar. Sent back with the answer
  // so the screen shows the period it actually got rather than the one it
  // assumed.
  const facilityDay = (offset: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: context.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() + offset * 86_400_000));

  const from = asked.from ?? facilityDay(-13);
  const to = asked.to ?? facilityDay(0);

  const supabase = await createServerClient();

  // The facility comes from the SESSION, never the request — the function
  // re-checks the permission against whatever it is handed, so a forged id is
  // refused rather than answered, but there is no reason to make it expressible.
  const { data, error } = await supabase.rpc("payroll_summary", {
    p_facility_id: context.facilityId,
    p_from: from,
    p_to: to,
  });

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lines: PayrollLine[] = ((data ?? []) as SummaryRow[]).map((row) => ({
    employeeId: row.staff_id,
    employeeName:
      [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown",
    sessions: row.sessions,
    hourlyMinutes: row.hourly_minutes,
    salariedMinutes: row.salaried_minutes,
    unpricedMinutes: row.unpriced_minutes,
    // `numeric` arrives as a string over the wire. `Number(...)` once, here,
    // rather than in each of the places that add it up.
    gross: Number(row.gross),
    openSessions: row.open_sessions,
  }));

  return NextResponse.json({
    from,
    to,
    timeZone: context.timeZone,
    lines,
    totals: {
      gross: lines.reduce((sum, line) => sum + line.gross, 0),
      hourlyMinutes: lines.reduce((sum, line) => sum + line.hourlyMinutes, 0),
      salariedMinutes: lines.reduce(
        (sum, line) => sum + line.salariedMinutes,
        0,
      ),
      unpricedMinutes: lines.reduce(
        (sum, line) => sum + line.unpricedMinutes,
        0,
      ),
      openSessions: lines.reduce((sum, line) => sum + line.openSessions, 0),
    },
  } satisfies PayrollPayload);
}
