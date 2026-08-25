import { NextResponse, type NextRequest } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Trailing months of revenue, per branch.
//
// A sibling of `/api/facility/reports`, not a `report` id on it --
// `facility_revenue_trend_by_location` takes a month count, not a
// current/previous window, so it doesn't fit that route's shape.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const permissions = await myPermissions();
  if (!holds(permissions, "financial_view_amounts")) {
    return NextResponse.json(
      { error: "You cannot see this facility's figures." },
      { status: 403 },
    );
  }

  const monthsParam = request.nextUrl.searchParams.get("months");
  const months = monthsParam ? Number(monthsParam) : 12;
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    return NextResponse.json(
      { error: "months must be an integer from 1 to 24." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(
    "facility_revenue_trend_by_location",
    { p_facility_id: active.facility.id, p_months: months },
  );

  if (error) {
    return NextResponse.json(
      { error: "Could not read this facility's revenue trend." },
      { status: 502 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
