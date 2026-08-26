import { NextResponse, type NextRequest } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The dataset behind one facility report.
//
// The six report sheets under `/facility/dashboard/reports` read `@/data/*`
// until now — `revenueByService()`, `occupancy()`, `generateCancellationReport()`
// and `getTopCustomers()` all walk fixture arrays. The KPI tiles above them
// were converted first (20260825120000); this is what converts the sheets.
//
// ── FIVE OF SIX ───────────────────────────────────────────────────────────
//
// `no-shows` is not here and cannot be. There is no `no_show` booking status
// and no dated no-show event anywhere in the schema; `clients.no_show_count` is
// a lifetime counter with no dates on it. The fixture answered the report by
// inventing dates. It stays marked unimplemented — recording a no-show is a
// feature somebody has to build, not a conversion.
//
// ── THE WINDOW IS DECIDED HERE, NOT IN THE BROWSER ────────────────────────
//
// The client sends `from` and `to`; the PREVIOUS window is computed server-side
// from them, so the two can never be inconsistent with each other. Every report
// that shows a delta needs both, and a browser that could name its own previous
// window could make any change look like growth.
// ============================================================================

/** Exactly the reports that have a real source. Anything else is refused. */
const REPORTS = new Set([
  "revenue-by-service",
  "revenue-by-location",
  "service-mix-by-location",
  "training-attendance-by-location",
  "occupancy-report",
  "cancelled-bookings",
  "customer-value",
  "total-revenue",
]);

export async function GET(request: NextRequest) {
  // From the SESSION, never the request. `bun run check:facility-from-session`.
  const active = await activeAdminFacility();
  if (active.kind === "none") {
    return NextResponse.json(
      { error: "Only an owner or administrator can see reports." },
      { status: 403 },
    );
  }
  if (active.kind === "ambiguous") {
    return NextResponse.json(
      { error: "Open the facility you mean at its own address." },
      { status: 409 },
    );
  }

  // Every one of these reports is a financial or commercial figure.
  const permissions = await myPermissions();
  if (!holds(permissions, "financial_view_amounts")) {
    return NextResponse.json(
      { error: "You cannot see this facility's figures." },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const report = params.get("report") ?? "";
  if (!REPORTS.has(report)) {
    // Named rather than a generic 400: a typo in a report id would otherwise
    // render as "no data in this period", which is a different claim.
    return NextResponse.json(
      { error: `No such report: ${report}` },
      { status: 400 },
    );
  }

  const from = Date.parse(params.get("from") ?? "");
  const to = Date.parse(params.get("to") ?? "");
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
    return NextResponse.json(
      { error: "A report needs a window with a beginning and an end." },
      { status: 400 },
    );
  }

  // The previous window is the same LENGTH, immediately before. Computed here
  // so the current and previous windows cannot disagree about their own size.
  const span = to - from;
  const prevFrom = new Date(from - span).toISOString();
  const prevTo = new Date(from).toISOString();

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("facility_report_dataset", {
    p_facility_id: active.facility.id,
    p_report: report,
    p_from: new Date(from).toISOString(),
    p_to: new Date(to).toISOString(),
    p_prev_from: prevFrom,
    p_prev_to: prevTo,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not read this facility's figures." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    report,
    window: {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
    },
    // null when RLS refused every row — the client renders an empty report
    // rather than the last facility's numbers.
    data: data ?? null,
  });
}
